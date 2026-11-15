import { ref, getCurrentScope, onScopeDispose } from "vue";
import { createSharedComposable } from "@vueuse/core";
import { call, fileToBase64 } from "frappe-ui";
import { db, audioRecordingsFor, recordingResponse, SYNCED } from "../services/db";
import { buildResponsePayload, draftStored } from "../utils/responsePayload";

const SERVER_BACKOFF_MS = 30000;
const AUTH_EXC_TYPES = ["AuthenticationError", "SessionExpired", "CSRFTokenError"];

const acknowledged = (result) => result.status === "SUCCESS" || result.status === "DUPLICATE_SKIPPED";
const resultsOf = (res) => (res && (Array.isArray(res) ? res : res.results)) || [];

// How a failed batch_push is handled (#33). frappe-ui's call() throws an Error carrying the HTTP
// status and Frappe's exc_type. "auth": the session is gone, so sign in again; "server": back off
// for 30s; "client": one submission the server refuses, so send the batch one by one; "network":
// no answer at all. 417 is Frappe's ValidationError, a refused submission and not a lost session.
export function failureKind(err) {
  if (err?.status === 401 || err?.status === 403 || AUTH_EXC_TYPES.includes(err?.exc_type)) return "auth";
  if (err?.status >= 500) return "server";
  if (err?.status >= 400) return "client";
  return "network";
}

export function createWAL() {
  const isOnline = ref(typeof navigator !== "undefined" ? navigator.onLine : true);
  const pendingWALCount = ref(0);
  const quarantinedWALCount = ref(0);
  const isSyncing = ref(false);
  const lastSyncResult = ref(null);
  // the server answered 401/403: queued interviews wait until the surveyor signs in again
  const needsLogin = ref(false);
  let serverBackoffUntil = 0;

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
    // no catch: a submission that never reached the queue must fail the submit, not report success (#32)
    await db.wal.add(walEntry);
    await updatePendingCount();
    if (isOnline.value && autoSync) syncWAL();
    return walEntry;
  }

  // the next pending entries this pass has not tried yet
  async function getPendingWalEntries(tried) {
    try {
      const isGuest =
        typeof window !== "undefined" &&
        window.frappe &&
        (window.frappe.user === "Guest" || (window.frappe.session && window.frappe.session.user === "Guest"));
      // Chunk to max 5 records (or 1 for Guest) to eliminate memory spikes, payload limits, and guest batch rejections
      const limitCount = isGuest ? 1 : 5;
      return await db.wal
        .where("status")
        .equals("pending")
        .filter((e) => !tried.has(e.wal_id))
        .limit(limitCount)
        .toArray();
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

  // Each entry's submission keyed by its idempotency key, the key batch_push answers with. Each
  // payload is parsed once; a corrupt one is quarantined.
  async function readChunk(entries) {
    const chunk = new Map();
    for (const entry of entries) {
      try {
        const payload = JSON.parse(entry.payload_json);
        const key = payload.idempotency_key || entry.wal_id;
        chunk.set(key, { entry, submission: { ...payload, idempotency_key: key } });
      } catch (err) {
        try {
          await db.wal.update(entry.wal_id, {
            status: "quarantined",
            quarantine_reason: `Corrupt WAL payload: ${err.message}`,
            quarantined_at: new Date().toISOString(),
          });
        } catch (e) {}
      }
    }
    return chunk;
  }

  // batch_push's results for a chunk, plus `error` when the pass has to stop
  async function postChunk(chunk) {
    try {
      const res = await call("omniquery.api.sync.batch_push", { submissions: [...chunk.values()].map((c) => c.submission) });
      needsLogin.value = false;
      return { results: resultsOf(res) };
    } catch (err) {
      const kind = failureKind(err);
      if (kind === "auth") needsLogin.value = true;
      if (kind === "server") serverBackoffUntil = Date.now() + SERVER_BACKOFF_MS;
      if (kind !== "client") return { results: [], error: kind };
      if (chunk.size === 1) {
        const [key] = chunk.keys();
        return { results: [{ idempotency_key: key, status: "FAILED_ATTEMPT", error: err.message || "Client error (4xx)" }] };
      }
      // one refused submission fails the whole batch: send each alone, so the others still go
      const results = [];
      for (const [key, c] of chunk) {
        const single = await postChunk(new Map([[key, c]]));
        results.push(...single.results);
        if (single.error) return { results, error: single.error };
      }
      return { results };
    }
  }

  // An acknowledged entry leaves the queue and its response is marked synced; its audio stays for
  // syncPendingAudio to upload. Any other answer is a failed attempt, quarantined at the fifth or
  // when the server rejects it. An entry with no answer at all stays pending as it was (#87).
  async function markSynced(results, chunk) {
    for (const r of results) {
      const c = chunk.get(r.idempotency_key);
      if (!c) continue;
      try {
        if (acknowledged(r)) {
          await db.wal.delete(c.entry.wal_id);
          await db.responses.where("response_uid").equals(r.idempotency_key).modify({ synced: SYNCED });
        } else {
          const attempts = (c.entry.attempts || 0) + 1;
          const quarantine = attempts >= 5 || r.status === "REJECTED";
          await db.wal.update(c.entry.wal_id, {
            attempts,
            last_error: r.error || "Sync rejected",
            ...(quarantine && {
              status: "quarantined",
              quarantined_at: new Date().toISOString(),
              quarantine_reason: r.error || "Exceeded 5 sync attempts",
            }),
          });
        }
      } catch (e) {}
    }
    await updatePendingCount();
  }

  // Pushes the pending queue chunk by chunk, each entry at most once per pass, and stops when the
  // session is gone, the server is failing or the device gets no answer. syncWAL and the Sync
  // button's forceSyncAll both run it.
  async function pushPendingChunks() {
    const tally = { attempted: 0, synced: 0, errors: 0, results: [] };
    if (Date.now() < serverBackoffUntil) return tally;
    const tried = new Set();
    while (true) {
      const entries = await getPendingWalEntries(tried);
      if (!entries.length) break;
      for (const e of entries) tried.add(e.wal_id);
      const chunk = await readChunk(entries);
      if (!chunk.size) continue;
      const { results, error } = await postChunk(chunk);
      await markSynced(results, chunk);
      const synced = results.filter((r) => acknowledged(r) && chunk.has(r.idempotency_key)).length;
      tally.attempted += chunk.size;
      tally.synced += synced;
      tally.errors += chunk.size - synced;
      tally.results.push(...results);
      if (error) break;
    }
    return tally;
  }

  async function syncWAL() {
    if (isSyncing.value || !isOnline.value) return null;
    isSyncing.value = true;
    try {
      const { synced, results } = await pushPendingChunks();
      try {
        await syncPendingAudio();
      } catch (audioErr) {}
      return { syncedCount: synced, results };
    } catch (err) {
      console.warn("syncWAL error:", err);
      return { syncedCount: 0, error: err.message };
    } finally {
      isSyncing.value = false;
      await updatePendingCount();
    }
  }

  // startup, the online event and the Sync button can each ask at once: they share one run, so no
  // draft goes to the server twice
  let draftSyncRun = null;
  function syncAllDrafts() {
    draftSyncRun ||= sendUnsyncedDrafts().finally(() => (draftSyncRun = null));
    return draftSyncRun;
  }

  async function sendUnsyncedDrafts() {
    const isGuest =
      typeof window !== "undefined" &&
      window.frappe &&
      (window.frappe.user === "Guest" || (window.frappe.session && window.frappe.session.user === "Guest"));
    if (isGuest) return 0;

    let syncedCount = 0;
    try {
      // a draft is marked synced once the server stores it, and every local save unmarks it
      const drafts = await db.responses.where("status").equals("Draft").filter((d) => !d.synced).toArray();
      for (const draft of drafts) {
        const payload = buildResponsePayload({
          template: { name: draft.template_name, version: draft.template_version },
          responses: draft.responses,
          responseId: draft.response_uid,
          capturedAt: draft.updated_at || draft.created_at || new Date().toISOString(),
        });
        if (payload.items.length === 0) continue;
        try {
          const res = await call("omniquery.api.sync.sync_draft", { draft: payload });
          if (draftStored(res)) {
            await db.responses.update(draft.response_uid, { synced: SYNCED });
            syncedCount++;
          }
        } catch (e) {
          // one draft the server refuses does not hold back the others
          console.warn("Draft sync failed:", draft.response_uid, e);
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
        pendingAudios = await audioRecordingsFor(targetResponseUid)
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
            response_name: recordingResponse(rec),
            file_base64: b64,
            filename: rec.file_name || `interview_${recordingResponse(rec)}.webm`,
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
      const tally = await pushPendingChunks();
      summary.walCount = tally.attempted;
      summary.walSynced = tally.synced;
      summary.walErrors = tally.errors;

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

  let syncInterval = null;

  function handleOnline() {
    isOnline.value = true;
    syncWAL();
    // a draft whose sync failed, for instance as the surveyor left the survey offline (#35)
    syncAllDrafts();
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

  // one listener set and one 15s loop for the whole app: useWAL() below shares this instance
  if (getCurrentScope()) {
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
    if (isOnline.value) syncAllDrafts();

    syncInterval = setInterval(() => {
      if (isOnline.value && pendingWALCount.value > 0 && !isSyncing.value) {
        syncWAL();
      }
    }, 15000);

    onScopeDispose(() => {
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
    needsLogin,
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

// every component gets the same queue state, listeners and sync loop; they stop when the last one unmounts
export const useWAL = createSharedComposable(createWAL);
