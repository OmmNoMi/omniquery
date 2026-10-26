import { ref, onMounted, onUnmounted, getCurrentInstance } from "vue";
import { call, fileToBase64 } from "frappe-ui";
import { db } from "../services/db";

// Module-level singleton state to prevent duplicate intervals, listeners, and race conditions
const isOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true);
const pendingWALCount = ref(0);
const quarantinedWALCount = ref(0);
const isSyncing = ref(false);
const needsLogin = ref(false);
const lastSyncResult = ref(null);

let serverBackoffUntil = 0;
let syncInterval = null;
let activeConsumers = 0;

export function _resetWALInstance() {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
  }
  isOnline.value = true;
  pendingWALCount.value = 0;
  quarantinedWALCount.value = 0;
  activeConsumers = 0;
  serverBackoffUntil = 0;
  needsLogin.value = false;
  isSyncing.value = false;
  lastSyncResult.value = null;
}

export function useWAL() {
  async function updatePendingCount() {
    try {
      pendingWALCount.value = await db.wal.where("status").equals("pending").count();
      quarantinedWALCount.value = await db.wal.where("status").equals("quarantined").count();
    } catch (e) {
      pendingWALCount.value = 0;
      quarantinedWALCount.value = 0;
    }
  }

  function makeWalEntry(entityType, payload) {
    return {
      wal_id: `WAL-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      entity_type: entityType,
      operation: "INSERT",
      payload_json: JSON.stringify(payload),
      status: "pending",
      timestamp: new Date().toISOString(),
      attempts: 0,
    };
  }

  async function queueWAL(entityType, payload, autoSync = true) {
    const walEntry = makeWalEntry(entityType, payload);
    try {
      await db.wal.add(walEntry);
    } catch (e) {
      console.error("Failed to queue WAL entry:", e);
      throw e;
    }
    await updatePendingCount();
    if (isOnline.value && autoSync) syncWAL();
    return walEntry;
  }

  async function getPendingWalEntries() {
    try {
      const isGuest =
        typeof window !== "undefined" &&
        window.frappe &&
        (window.frappe.user === "Guest" || (window.frappe.session && window.frappe.session.user === "Guest"));
      // Chunk to max 5 records (or 1 for Guest) to eliminate memory spikes, payload limits, and guest batch rejections
      const limitCount = isGuest ? 1 : 5;
      return await db.wal.where("status").equals("pending").limit(limitCount).toArray();
    } catch (e) {
      return [];
    }
  }

  async function getQuarantinedWalEntries() {
    try {
      return await db.wal.where("status").equals("quarantined").toArray();
    } catch (e) {
      return [];
    }
  }

  async function retryQuarantinedEntry(walId) {
    try {
      await db.wal.where("wal_id").equals(walId).modify({
        status: "pending",
        attempts: 0,
        last_error: null,
      });
      await updatePendingCount();
      if (isOnline.value) {
        return await syncWAL();
      }
    } catch (e) {}
  }

  async function postWalEntries(entries) {
    if (Date.now() < serverBackoffUntil) {
      return { error: "SERVER_BACKOFF", results: [] };
    }

    const submissions = entries
      .map((e) => {
        try {
          const payload = JSON.parse(e.payload_json);
          return {
            idempotency_key: payload.idempotency_key || e.wal_id,
            ...payload,
          };
        } catch (err) {
          db.wal
            .where("wal_id")
            .equals(e.wal_id)
            .modify({
              status: "quarantined",
              quarantine_reason: `Corrupt WAL payload: ${err.message}`,
              quarantined_at: new Date().toISOString(),
            })
            .catch(() => {});
          return null;
        }
      })
      .filter(Boolean);

    if (!submissions.length) return { results: [] };

    try {
      const res = await call("omniquery.api.sync.batch_push", { submissions });
      const results = (res && (Array.isArray(res) ? res : res.results)) || [];
      return { results, message: res };
    } catch (err) {
      // 1. Auth failure: 401, 403, 417
      if (err.status === 401 || err.status === 403 || err.status === 417) {
        needsLogin.value = true;
        return { error: "AUTH_EXPIRED", status: err.status, results: [] };
      }

      // 2. Server failure: 5xx
      if (err.status >= 500) {
        serverBackoffUntil = Date.now() + 30000;
        return { error: "SERVER_ERROR", status: err.status, results: [] };
      }

      // 3. Client failure (4xx): Isolate individual entries if batch had multiple
      if (err.status >= 400 && err.status < 500) {
        if (entries.length > 1) {
          const individualResults = [];
          for (const entry of entries) {
            let singleSub;
            try {
              const p = JSON.parse(entry.payload_json);
              singleSub = { idempotency_key: p.idempotency_key || entry.wal_id, ...p };
            } catch (e) {
              continue;
            }

            try {
              const singleRes = await call("omniquery.api.sync.batch_push", { submissions: [singleSub] });
              const sResults = (singleRes && (Array.isArray(singleRes) ? singleRes : singleRes.results)) || [];
              if (sResults.length) {
                individualResults.push(...sResults);
              } else {
                individualResults.push({ idempotency_key: singleSub.idempotency_key, status: "SUCCESS" });
              }
            } catch (singleErr) {
              if (singleErr.status === 401 || singleErr.status === 403 || singleErr.status === 417) {
                needsLogin.value = true;
                break;
              } else if (singleErr.status >= 500) {
                serverBackoffUntil = Date.now() + 30000;
                break;
              } else {
                individualResults.push({
                  idempotency_key: singleSub.idempotency_key,
                  status: "FAILED_ATTEMPT",
                  error: singleErr.message || "Client error (4xx)",
                });
              }
            }
          }
          return { results: individualResults };
        } else {
          let pKey = entries[0].wal_id;
          try {
            pKey = JSON.parse(entries[0].payload_json).idempotency_key || entries[0].wal_id;
          } catch (e) {}
          return {
            results: [
              {
                idempotency_key: pKey,
                status: "FAILED_ATTEMPT",
                error: err.message || "Client error (4xx)",
              },
            ],
          };
        }
      }

      return { error: "NETWORK_ERROR", results: [] };
    }
  }

  async function markSynced(results, entries) {
    if (!Array.isArray(results)) return;
    for (const r of results) {
      const entry = entries.find((e) => {
        try {
          const p = JSON.parse(e.payload_json);
          return p.idempotency_key === r.idempotency_key || e.wal_id === r.idempotency_key;
        } catch (err) {
          return e.wal_id === r.idempotency_key;
        }
      });

      if (r.status === "SUCCESS" || r.status === "DUPLICATE_SKIPPED") {
        if (entry) {
          try {
            await db.wal.delete(entry.wal_id);
          } catch (e) {}
        }
        try {
          if (r.idempotency_key) {
            await db.responses.where("response_uid").equals(r.idempotency_key).modify({ synced: 1 });
            await db.audio_recordings.where("response_uid").equals(r.idempotency_key).delete();
          }
        } catch (e) {}
      } else if (entry) {
        try {
          const nextAttempts = (entry.attempts || 0) + 1;
          const isQuarantined = nextAttempts >= 5 || r.status === "REJECTED";
          await db.wal.where("wal_id").equals(entry.wal_id).modify((e) => {
            e.attempts = nextAttempts;
            e.last_error = r.error || "Sync rejected";
            if (isQuarantined) {
              e.status = "quarantined";
              e.quarantined_at = new Date().toISOString();
              e.quarantine_reason = r.error || "Exceeded 5 sync attempts";
            }
          });
        } catch (e) {}
      }
    }
    await updatePendingCount();
  }

  async function syncWAL() {
    if (isSyncing.value || !isOnline.value) return null;
    if (Date.now() < serverBackoffUntil) return null;
    isSyncing.value = true;
    let totalSynced = 0;
    const allResults = [];
    const failedWalIds = new Set();
    try {
      while (true) {
        const rawEntries = await getPendingWalEntries();
        const entries = rawEntries.filter((e) => !failedWalIds.has(e.wal_id));
        if (!entries.length) break;
        const data = await postWalEntries(entries);
        if (data && (data.error === "AUTH_EXPIRED" || data.error === "SERVER_BACKOFF" || data.error === "SERVER_ERROR")) {
          break;
        }
        const results = (data && (data.results || (data.message && (Array.isArray(data.message) ? data.message : data.message.results)))) || [];
        if (!results.length) break;
        await markSynced(results, entries);
        for (const r of results) {
          if (r.status === "REJECTED" || r.status === "FAILED_ATTEMPT") {
            const matched = entries.find((e) => {
              try {
                return JSON.parse(e.payload_json).idempotency_key === r.idempotency_key || e.wal_id === r.idempotency_key;
              } catch (err) {
                return e.wal_id === r.idempotency_key;
              }
            });
            if (matched) failedWalIds.add(matched.wal_id);
          }
        }
        const chunkSynced = results.filter((r) => r.status === "SUCCESS" || r.status === "DUPLICATE_SKIPPED").length;
        totalSynced += chunkSynced;
        allResults.push(...results);
        if (chunkSynced === 0) break;
      }
      try {
        await syncPendingAudio();
      } catch (audioErr) {}
      return { syncedCount: totalSynced, results: allResults };
    } catch (err) {
      console.warn("syncWAL error:", err);
      return { syncedCount: totalSynced, error: err.message };
    } finally {
      isSyncing.value = false;
      await updatePendingCount();
    }
  }

  async function syncPendingAudio(targetResponseUid = null) {
    if (!isOnline.value) return 0;
    let uploadedCount = 0;
    try {
      let pendingAudios = [];
      if (targetResponseUid) {
        pendingAudios = await db.audio_recordings
          .where("response_uid")
          .equals(targetResponseUid)
          .and((r) => r.status === "pending")
          .toArray();
      } else {
        pendingAudios = await db.audio_recordings
          .where("status")
          .equals("pending")
          .toArray();
      }

      for (const rec of pendingAudios) {
        if (!rec.blob || !rec.response_uid) continue;
        try {
          let b64 = "";
          try {
            b64 = await fileToBase64(rec.blob);
          } catch (b64Err) {}

          const data = await call("omniquery.api.sync.upload_response_audio", {
            response_name: rec.response_uid,
            file_base64: b64,
            filename: rec.file_name || `interview_${rec.response_uid}.webm`,
          });

          const msg = data && (data.message || data);
          if (msg && (msg.status === "SUCCESS" || msg.file_url)) {
            await db.audio_recordings.where("response_uid").equals(rec.response_uid).modify({
              status: "synced",
              file_url: msg.file_url,
              synced_at: new Date().toISOString(),
            });
            uploadedCount++;
          }
        } catch (singleErr) {
          console.warn("Failed syncing individual audio:", singleErr);
        }
      }
    } catch (err) {
      console.warn("syncPendingAudio error:", err);
    }
    return uploadedCount;
  }

  async function syncAllDrafts() {
    if (!isOnline.value) return 0;
    let draftsCount = 0;
    try {
      const allDrafts = await db.responses.where("status").equals("Draft").toArray();
      for (const draft of allDrafts) {
        try {
          const tmpl = await db.templates.get(draft.template_name);
          const payload = {
            idempotency_key: draft.response_uid,
            survey_template: draft.template_name,
            template_version: tmpl?.version || 1,
            respondent: draft.responses?.respondent_name || draft.responses?.entrepreneur_name || "",
            surveyor: (window.frappe && (window.frappe.user || (window.frappe.session && window.frappe.session.user))) || "Administrator",
            captured_at_local: draft.updated_at || new Date().toISOString(),
            items: Object.entries(draft.responses || {}).map(([code, val]) => ({
              question_code: code,
              value: val,
            })),
          };
          const res = await call("omniquery.api.sync.sync_draft", { payload });
          if (res && res.status === "SUCCESS") {
            await db.responses.where("response_uid").equals(draft.response_uid).modify({ synced: 1 });
            draftsCount++;
          }
        } catch (draftErr) {
          console.warn(`Failed syncing draft ${draft.response_uid}:`, draftErr);
        }
      }
    } catch (err) {
      console.warn("syncAllDrafts error:", err);
    }
    return draftsCount;
  }

  async function forceSyncAll() {
    if (isSyncing.value || !isOnline.value) return null;
    if (Date.now() < serverBackoffUntil) return null;
    isSyncing.value = true;
    const summary = {
      walCount: 0,
      walSynced: 0,
      walErrors: 0,
      draftsSynced: 0,
      audioSynced: 0,
      totalSynced: 0,
      message: "",
    };

    const failedWalIds = new Set();
    try {
      while (true) {
        const rawEntries = await getPendingWalEntries();
        const entries = rawEntries.filter((e) => !failedWalIds.has(e.wal_id));
        if (!entries.length) break;
        summary.walCount += entries.length;
        const data = await postWalEntries(entries);
        if (data && (data.error === "AUTH_EXPIRED" || data.error === "SERVER_BACKOFF" || data.error === "SERVER_ERROR")) {
          break;
        }
        const results = (data && (data.results || (data.message && (Array.isArray(data.message) ? data.message : data.message.results)))) || [];
        if (!results.length) break;
        await markSynced(results, entries);
        for (const r of results) {
          if (r.status === "REJECTED" || r.status === "FAILED_ATTEMPT") {
            const matched = entries.find((e) => {
              try {
                return JSON.parse(e.payload_json).idempotency_key === r.idempotency_key || e.wal_id === r.idempotency_key;
              } catch (err) {
                return e.wal_id === r.idempotency_key;
              }
            });
            if (matched) failedWalIds.add(matched.wal_id);
          }
        }
        const chunkSynced = results.filter((r) => r.status === "SUCCESS" || r.status === "DUPLICATE_SKIPPED").length;
        summary.walSynced += chunkSynced;
        summary.walErrors += results.length - chunkSynced;
        if (chunkSynced === 0) break;
      }

      summary.draftsSynced = await syncAllDrafts();
      summary.audioSynced = await syncPendingAudio();
      summary.totalSynced = summary.walSynced + summary.draftsSynced;

      if (summary.walErrors > 0) {
        summary.message = `Synced ${summary.walSynced} queue item(s), ${summary.draftsSynced} draft(s). ${summary.walErrors} item(s) had errors.`;
      } else {
        summary.message = `Successfully synced ${summary.walSynced} queue item(s) & ${summary.draftsSynced} draft(s) to server!`;
      }
      lastSyncResult.value = summary;
      return summary;
    } catch (err) {
      summary.message = `Sync error: ${err.message || err}`;
      lastSyncResult.value = summary;
      return summary;
    } finally {
      isSyncing.value = false;
      await updatePendingCount();
    }
  }

  async function getWalQueueItems() {
    try {
      const all = await db.wal.toArray();
      return all.map((entry) => {
        let payload = {};
        try {
          payload = JSON.parse(entry.payload_json || "{}");
        } catch (e) {}
        return {
          wal_id: entry.wal_id,
          status: entry.status,
          timestamp: entry.timestamp,
          attempts: entry.attempts || 0,
          idempotency_key: payload.idempotency_key || entry.wal_id,
          survey_template: payload.survey_template || "",
          template_version: payload.template_version || 1,
          respondent: payload.respondent || "",
          surveyor: payload.surveyor || "",
          captured_at_local: payload.captured_at_local || entry.timestamp,
          items: payload.items || [],
          responses: (payload.items || []).reduce((acc, it) => {
            if (it.question_code) {
              acc[it.question_code] = it.value !== undefined ? it.value : it.value_text || it.value_numeric || it.value_json;
            }
            return acc;
          }, {}),
        };
      });
    } catch (e) {
      return [];
    }
  }

  function handleOnline() {
    isOnline.value = true;
    syncWAL();
  }

  function handleOffline() {
    isOnline.value = false;
  }

  function handleVisibilityChange() {
    if (typeof document !== "undefined" && document.visibilityState === "visible") {
      updatePendingCount().then(() => {
        if (isOnline.value && pendingWALCount.value > 0 && !isSyncing.value && Date.now() >= serverBackoffUntil) {
          syncWAL();
        }
      });
    }
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      activeConsumers++;
      if (typeof window !== "undefined" && activeConsumers === 1) {
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        document.addEventListener("visibilitychange", handleVisibilityChange);
      }
      updatePendingCount().then(() => {
        if (isOnline.value && pendingWALCount.value > 0 && !isSyncing.value && Date.now() >= serverBackoffUntil) {
          syncWAL();
        }
      });

      // Continuous background auto-sync check every 15 seconds (singleton interval)
      if (!syncInterval) {
        syncInterval = setInterval(() => {
          if (isOnline.value && pendingWALCount.value > 0 && !isSyncing.value && Date.now() >= serverBackoffUntil) {
            syncWAL();
          }
        }, 15000);
      }
    });

    onUnmounted(() => {
      activeConsumers = Math.max(0, activeConsumers - 1);
      if (activeConsumers === 0) {
        if (syncInterval) {
          clearInterval(syncInterval);
          syncInterval = null;
        }
        if (typeof window !== "undefined") {
          window.removeEventListener("online", handleOnline);
          window.removeEventListener("offline", handleOffline);
          document.removeEventListener("visibilitychange", handleVisibilityChange);
        }
      }
    });
  }

  return {
    isOnline,
    pendingWALCount,
    quarantinedWALCount,
    isSyncing,
    needsLogin,
    lastSyncResult,
    queueWAL,
    syncWAL,
    syncPendingAudio,
    syncAllDrafts,
    forceSyncAll,
    getWalQueueItems,
    getQuarantinedWalEntries,
    retryQuarantinedEntry,
    updatePendingCount,
  };
}
