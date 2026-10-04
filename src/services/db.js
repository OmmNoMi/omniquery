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

    const oldSyncedResponses = await db.responses
      .where("synced")
      .equals(1)
      .or("status")
      .equals("Submitted")
      .filter((r) => r.synced === true && r.updated_at && r.updated_at < cutoffIso)
      .toArray();

    if (oldSyncedResponses.length > 0) {
      const uidsToDelete = oldSyncedResponses.map((r) => r.response_uid);
      await db.responses.bulkDelete(uidsToDelete);
      // Clean up corresponding synced audio recordings
      await db.audio_recordings
        .where("status")
        .equals("synced")
        .filter((a) => uidsToDelete.includes(a.response_uid))
        .delete();
      return uidsToDelete.length;
    }
    return 0;
  } catch (err) {
    console.warn("Storage compaction skipped:", err);
    return 0;
  }
}
