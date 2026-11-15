import Dexie from "dexie";

export const db = new Dexie("OmniQueryDB_v2");

db.version(1).stores({
  templates: "template_name, title, project, modified",
  responses: "response_uid, template_name, status, created_at, synced",
  wal: "wal_id, entity_type, operation, status, timestamp, attempts",
  respondents: "respondent_uid, primary_name, respondent_type, phone_hash, village_city, district",
});

db.version(2).stores({
  templates: "template_name, title, project, modified",
  responses: "response_uid, template_name, status, created_at, updated_at, synced",
  wal: "wal_id, entity_type, operation, status, timestamp, attempts",
  respondents: "respondent_uid, primary_name, respondent_type, phone_hash, village_city, district",
});

db.version(3).stores({
  templates: "template_name, title, project, modified",
  responses: "response_uid, template_name, status, created_at, updated_at, synced",
  wal: "wal_id, entity_type, operation, status, timestamp, attempts",
  respondents: "respondent_uid, primary_name, respondent_type, phone_hash, village_city, district",
  audio_recordings: "response_uid, status, created_at",
});

// IndexedDB cannot index a boolean, so a response's `synced` is stored as 0 or 1: only then does
// where("synced").equals(SYNCED) find it. Version 4 rewrites the true/false that older builds wrote.
// test/guards/synced_encoding.test.js keeps a boolean from being written again.
export const SYNCED = 1;
export const NOT_SYNCED = 0;

db.version(4)
  .stores({
    templates: "template_name, title, project, modified",
    responses: "response_uid, template_name, status, created_at, updated_at, synced",
    wal: "wal_id, entity_type, operation, status, timestamp, attempts",
    respondents: "respondent_uid, primary_name, respondent_type, phone_hash, village_city, district",
    audio_recordings: "response_uid, status, created_at",
  })
  .upgrade((tx) =>
    tx
      .table("responses")
      .toCollection()
      .modify((r) => {
        r.synced = r.synced === true || r.synced === SYNCED ? SYNCED : NOT_SYNCED;
      })
  );

// A response keeps the created_at of its first save. The draft save and the submit both write the
// whole row with put(), which Dexie runs through this hook when the row exists (#34).
db.responses.hook("updating", (mods, key, row) => {
  if ("created_at" in mods && row.created_at) return { created_at: row.created_at };
});

// A response's recordings. The first is keyed by the response's ID. A draft left mid-recording and
// recorded again after resuming adds parts keyed "<ID>~2", "<ID>~3", each naming its response (#37)
export const recordingResponse = (rec) => rec.response_name || rec.response_uid;
export const recordingKey = (responseUid, part) => (part > 1 ? `${responseUid}~${part}` : responseUid);

export function audioRecordingsFor(responseUid) {
  return db.audio_recordings
    .where("response_uid")
    .startsWith(responseUid)
    .filter((rec) => recordingResponse(rec) === responseUid);
}

if (typeof window !== "undefined" && window.indexedDB) {
  try {
    window.indexedDB.deleteDatabase("OmniQueryDB");
  } catch (e) {
    // Legacy database cleanup fallback
  }
}

/**
 * Prunes synced responses older than `retentionDays` (default 30 days) to prevent
 * storage bloat on field devices, while preserving pending WAL items, unsynced drafts,
 * and audio recordings.
 */
export async function compactLocalStorage(retentionDays = 30) {
  try {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
    const cutoffIso = cutoffDate.toISOString();

    // submitted interviews only: a synced draft is still the surveyor's work in progress
    const oldSyncedResponses = await db.responses
      .where("status")
      .equals("Submitted")
      .and((r) => r.synced === SYNCED && r.updated_at && r.updated_at < cutoffIso)
      .toArray();

    if (oldSyncedResponses.length > 0) {
      const uidsToDelete = oldSyncedResponses.map((r) => r.response_uid);
      await db.responses.bulkDelete(uidsToDelete);
      // Clean up corresponding synced audio recordings
      await db.audio_recordings
        .where("status")
        .equals("synced")
        .filter((a) => uidsToDelete.includes(recordingResponse(a)))
        .delete();
      return uidsToDelete.length;
    }
    return 0;
  } catch (err) {
    console.warn("Storage compaction skipped:", err);
    return 0;
  }
}
