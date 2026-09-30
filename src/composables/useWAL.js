import { ref, onMounted, onUnmounted } from "vue";
import { db } from "../services/db";

export function useWAL() {
  const isOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true);
  const pendingWALCount = ref(0);
  const isSyncing = ref(false);

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
      return await db.wal.where("status").equals("pending").limit(20).toArray();
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
      if (r.status === "SUCCESS" || r.status === "DUPLICATE_SKIPPED") {
        const entry = entries.find((e) => {
          try {
            const p = JSON.parse(e.payload_json);
            return p.idempotency_key === r.idempotency_key || e.wal_id === r.idempotency_key;
          } catch (err) {
            return e.wal_id === r.idempotency_key;
          }
        });
        if (entry) {
          try {
            await db.wal.update(entry.id || entry.wal_id, { status: "synced" });
          } catch (e) {}
        }
        try {
          if (r.idempotency_key) {
            await db.responses.where("response_uid").equals(r.idempotency_key).modify({ synced: true });
          }
        } catch (e) {}
      }
    }
  }

  async function syncWAL() {
    if (isSyncing.value || !isOnline.value) return;
    isSyncing.value = true;
    try {
      const entries = await getPendingWalEntries();
      if (!entries.length) return;
      const data = await postWalEntries(entries);
      const msg = data && data.message;
      const results = (msg && (Array.isArray(msg) ? msg : msg.results)) || [];
      await markSynced(results, entries);
    } catch (err) {
    } finally {
      isSyncing.value = false;
      await updatePendingCount();
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
    queueWAL,
    syncWAL,
    updatePendingCount,
  };
}
