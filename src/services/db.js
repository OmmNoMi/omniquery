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
