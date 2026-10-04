import { ref, onMounted, onUnmounted, getCurrentInstance } from "vue";
import { db } from "../services/db";

export function useWAL() {
  const isOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true);
  const pendingWALCount = ref(0);
  const quarantinedWALCount = ref(0);
  const isSyncing = ref(false);
  const lastSyncResult = ref(null);

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
    } catch (e) {}
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
    const submissions = entries
      .map((e) => {
        try {
          const payload = JSON.parse(e.payload_json);
          return {
            idempotency_key: payload.idempotency_key || e.wal_id,
            ...payload,
          };
        } catch (err) {
          db.wal.where("wal_id").equals(e.wal_id).modify({
            status: "quarantined",
            quarantine_reason: `Corrupt WAL payload: ${err.message}`,
            quarantined_at: new Date().toISOString(),
          }).catch(() => {});
          return null;
        }
      })
      .filter(Boolean);

    if (!submissions.length) return null;

    const res = await fetch("/api/method/omniquery.api.sync.batch_push", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Frappe-CSRF-Token": (window.frappe && window.frappe.csrf_token) || "",
      },
      body: JSON.stringify({ submissions }),
    });
    return res.ok ? await res.json() : null;
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
            await db.wal.where("wal_id").equals(entry.wal_id).modify({ status: "synced" });
          } catch (e) {}
        }
        try {
          if (r.idempotency_key) {
            await db.responses.where("response_uid").equals(r.idempotency_key).modify({ synced: true });
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
    isSyncing.value = true;
    let totalSynced = 0;
    const allResults = [];
    try {
      while (true) {
        const entries = await getPendingWalEntries();
        if (!entries.length) break;
        const data = await postWalEntries(entries);
        const msg = data && data.message;
        const results = (msg && (Array.isArray(msg) ? msg : msg.results)) || [];
        if (!results.length) break;
        await markSynced(results, entries);
        const chunkSynced = results.filter((r) => r.status === "SUCCESS" || r.status === "DUPLICATE_SKIPPED").length;
        totalSynced += chunkSynced;
        allResults.push(...results);
        // Break if no successful progress was made to avoid infinite retry loop
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

  async function syncAllDrafts() {
    const isGuest =
      typeof window !== "undefined" &&
      window.frappe &&
      (window.frappe.user === "Guest" || (window.frappe.session && window.frappe.session.user === "Guest"));
    if (isGuest) return 0;

    let syncedCount = 0;
    try {
      const drafts = await db.responses.where("status").equals("Draft").toArray();
      for (const draft of drafts) {
        if (!draft.responses || Object.keys(draft.responses).length === 0) continue;
        const items = Object.entries(draft.responses).map(([code, val]) => ({
          question_code: code,
          question_label: code,
          value: val,
        }));
        const payload = {
          idempotency_key: draft.response_uid,
          survey_template: draft.template_name,
          template_version: draft.template_version || 1,
          respondent: draft.responses.respondent_name || draft.responses.entrepreneur_name || "",
          surveyor: (window.frappe && window.frappe.user) || "Administrator",
          captured_at_local: draft.updated_at || draft.created_at || new Date().toISOString(),
          items,
        };
        const res = await fetch("/api/method/omniquery.api.sync.sync_draft", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "X-Frappe-CSRF-Token": (window.frappe && window.frappe.csrf_token) || "",
          },
          body: JSON.stringify({ draft: payload }),
        });
        if (res.ok) {
          await db.responses.where("response_uid").equals(draft.response_uid).modify({ synced: true });
          syncedCount++;
        }
      }
    } catch (e) {
      console.warn("syncAllDrafts error:", e);
    }
    return syncedCount;
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
          const formData = new FormData();
          formData.append("response_name", rec.response_uid);
          formData.append("file", rec.blob, rec.file_name || `interview_${rec.response_uid}.webm`);

          const res = await fetch("/api/method/omniquery.api.sync.upload_response_audio", {
            method: "POST",
            headers: {
              "X-Frappe-CSRF-Token": (window.frappe && window.frappe.csrf_token) || "",
            },
            body: formData,
          });

          if (res.ok) {
            const data = await res.json();
            const msg = data && (data.message || data);
            if (msg && msg.status === "SUCCESS") {
              await db.audio_recordings.where("response_uid").equals(rec.response_uid).modify({
                status: "synced",
                file_url: msg.file_url,
                synced_at: new Date().toISOString(),
              });
              uploadedCount++;
            }
          }
        } catch (uploadErr) {
          console.warn(`Failed to upload audio for ${rec.response_uid}:`, uploadErr);
        }
      }
    } catch (e) {
      console.warn("syncPendingAudio error:", e);
    }
    return uploadedCount;
  }

  async function forceSyncAll() {
    if (isSyncing.value) return { status: "IN_PROGRESS", message: "Sync already in progress" };
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

    try {
      while (true) {
        const entries = await getPendingWalEntries();
        if (!entries.length) break;
        summary.walCount += entries.length;
        const data = await postWalEntries(entries);
        const msg = data && data.message;
        const results = (msg && (Array.isArray(msg) ? msg : msg.results)) || [];
        if (!results.length) break;
        await markSynced(results, entries);
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
        summary.message = `✓ Successfully synced ${summary.walSynced} queue item(s) & ${summary.draftsSynced} draft(s) to server!`;
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

  let syncInterval = null;

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
        if (isOnline.value && pendingWALCount.value > 0 && !isSyncing.value) {
          syncWAL();
        }
      });
    }
  }

  if (getCurrentInstance()) {
    onMounted(() => {
      if (typeof window !== "undefined") {
        window.addEventListener("online", handleOnline);
        window.addEventListener("offline", handleOffline);
        document.addEventListener("visibilitychange", handleVisibilityChange);
      }
      updatePendingCount().then(() => {
        if (isOnline.value && pendingWALCount.value > 0 && !isSyncing.value) {
          syncWAL();
        }
      });

      // Continuous background auto-sync check every 15 seconds
      syncInterval = setInterval(() => {
        if (isOnline.value && pendingWALCount.value > 0 && !isSyncing.value) {
          syncWAL();
        }
      }, 15000);
    });

    onUnmounted(() => {
      if (syncInterval) clearInterval(syncInterval);
      if (typeof window !== "undefined") {
        window.removeEventListener("online", handleOnline);
        window.removeEventListener("offline", handleOffline);
        document.removeEventListener("visibilitychange", handleVisibilityChange);
      }
    });
  }

  return {
    isOnline,
    pendingWALCount,
    quarantinedWALCount,
    isSyncing,
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
