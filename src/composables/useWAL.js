import { ref, onMounted, onUnmounted } from "vue";
import { db } from "../services/db";

export function useWAL() {
  const isOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true);
  const pendingWALCount = ref(0);
  const isSyncing = ref(false);
  const lastSyncResult = ref(null);

  async function updatePendingCount() {
    try {
      pendingWALCount.value = await db.wal.where("status").equals("pending").count();
    } catch (e) {
      pendingWALCount.value = 0;
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

  async function queueWAL(entityType, payload) {
    const walEntry = makeWalEntry(entityType, payload);
    try {
      await db.wal.add(walEntry);
    } catch (e) {}
    await updatePendingCount();
    if (isOnline.value) syncWAL();
    return walEntry;
  }

  async function getPendingWalEntries() {
    try {
      return await db.wal.where("status").equals("pending").limit(50).toArray();
    } catch (e) {
      return [];
    }
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
          await db.wal.where("wal_id").equals(entry.wal_id).modify((e) => {
            e.attempts = (e.attempts || 0) + 1;
            e.last_error = r.error || "Sync rejected";
          });
        } catch (e) {}
      }
    }
  }

  async function syncWAL() {
    if (isSyncing.value || !isOnline.value) return null;
    isSyncing.value = true;
    let syncedCount = 0;
    try {
      const entries = await getPendingWalEntries();
      if (!entries.length) return { syncedCount: 0, pendingCount: 0 };
      const data = await postWalEntries(entries);
      const msg = data && data.message;
      const results = (msg && (Array.isArray(msg) ? msg : msg.results)) || [];
      await markSynced(results, entries);
      syncedCount = results.filter((r) => r.status === "SUCCESS" || r.status === "DUPLICATE_SKIPPED").length;
      return { syncedCount, results };
    } catch (err) {
      console.warn("syncWAL error:", err);
      return { syncedCount: 0, error: err.message };
    } finally {
      isSyncing.value = false;
      await updatePendingCount();
    }
  }

  async function syncAllDrafts() {
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

  async function forceSyncAll() {
    if (isSyncing.value) return { status: "IN_PROGRESS", message: "Sync already in progress" };
    isSyncing.value = true;
    const summary = {
      walCount: 0,
      walSynced: 0,
      walErrors: 0,
      draftsSynced: 0,
      totalSynced: 0,
      message: "",
    };

    try {
      const entries = await getPendingWalEntries();
      summary.walCount = entries.length;
      if (entries.length > 0) {
        const data = await postWalEntries(entries);
        const msg = data && data.message;
        const results = (msg && (Array.isArray(msg) ? msg : msg.results)) || [];
        await markSynced(results, entries);
        summary.walSynced = results.filter((r) => r.status === "SUCCESS" || r.status === "DUPLICATE_SKIPPED").length;
        summary.walErrors = results.length - summary.walSynced;
      }

      summary.draftsSynced = await syncAllDrafts();
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

  function handleOnline() {
    isOnline.value = true;
    syncWAL();
  }

  function handleOffline() {
    isOnline.value = false;
  }

  onMounted(() => {
    if (typeof window !== "undefined") {
      window.addEventListener("online", handleOnline);
      window.addEventListener("offline", handleOffline);
    }
    updatePendingCount();
  });

  onUnmounted(() => {
    if (typeof window !== "undefined") {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    }
  });

  return {
    isOnline,
    pendingWALCount,
    isSyncing,
    lastSyncResult,
    queueWAL,
    syncWAL,
    syncAllDrafts,
    forceSyncAll,
    getWalQueueItems,
    updatePendingCount,
  };
}
