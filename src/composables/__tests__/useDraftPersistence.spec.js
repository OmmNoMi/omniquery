import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { db, compactLocalStorage, NOT_SYNCED, SYNCED } from "../../services/db";
import { useSurvey } from "../useSurvey";

// What a draft keeps on the device (#34): no row for an untouched survey, a cleared draft saved as
// cleared, its first created_at, and old synced submissions pruned without touching drafts.

const template = { name: "TMPL-DRAFT", title: "Draft Survey", version: 1, sections: [{ section_code: "s1", questions: [] }] };
const minutesAgo = (m) => new Date(Date.now() - m * 60000).toISOString();
const daysAgo = (d) => new Date(Date.now() - d * 86400000).toISOString();

function openSurvey(draftId = "DRAFT-1") {
  const survey = useSurvey();
  survey.activeTemplate.value = template;
  survey.currentDraftId.value = draftId;
  return survey;
}

describe("draft persistence (#34)", () => {
  beforeEach(async () => {
    await Promise.all([db.wal.clear(), db.responses.clear(), db.audio_recordings.clear(), db.templates.clear()]);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
  });
  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("writes no record for a survey opened and left without an answer", async () => {
    const survey = openSurvey();
    survey.responses.value = { q_blank: "  ", q_none: null };
    await survey.saveDraftLocally(0);
    expect(await db.responses.count()).toBe(0);
  });

  it("saves a draft whose answers were all cleared, so the old answers do not come back", async () => {
    const survey = openSurvey();
    survey.responses.value = { q1: "Sita" };
    await survey.saveDraftLocally(20);

    survey.responses.value = {};
    await survey.saveDraftLocally(0);

    expect((await db.responses.get("DRAFT-1")).responses).toEqual({});
  });

  it("stores a saved draft as not synced, in the 0/1 the synced index can find", async () => {
    const survey = openSurvey();
    survey.responses.value = { q1: "Sita" };
    await survey.saveDraftLocally(20);
    expect((await db.responses.get("DRAFT-1")).synced).toBe(NOT_SYNCED);
    expect(await db.responses.where("synced").equals(NOT_SYNCED).count()).toBe(1);
  });

  it("keeps a draft's first created_at across saves", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });
    const survey = openSurvey();
    survey.responses.value = { q1: "First" };
    vi.setSystemTime(new Date("2026-10-26T00:00:00.000Z"));
    await survey.saveDraftLocally(20);

    vi.setSystemTime(new Date("2026-10-26T01:00:00.000Z"));
    survey.responses.value = { q1: "First", q2: "Second" };
    await survey.saveDraftLocally(40);

    const row = await db.responses.get("DRAFT-1");
    expect(row.created_at).toBe("2026-10-26T00:00:00.000Z");
    expect(row.updated_at).toBe("2026-10-26T01:00:00.000Z");
  });

  it("resumes the draft saved last", async () => {
    await db.templates.put({ template_name: "TMPL-DRAFT", ...template });
    const draft = (uid, responses, updated) =>
      db.responses.put({ response_uid: uid, template_name: "TMPL-DRAFT", status: "Draft", responses, created_at: minutesAgo(60), updated_at: updated, synced: NOT_SYNCED });
    await draft("DRAFT-OLD", { q1: "Alpha", q2: "Beta", q3: "Gamma" }, minutesAgo(10));
    await draft("DRAFT-NEW", { q1: "Latest" }, minutesAgo(1));

    const survey = useSurvey();
    await survey.loadTemplate("TMPL-DRAFT");

    expect(survey.currentDraftId.value).toBe("DRAFT-NEW");
    expect(survey.responses.value).toEqual({ q1: "Latest" });
  });
});

describe("compactLocalStorage", () => {
  beforeEach(async () => {
    await Promise.all([db.responses.clear(), db.audio_recordings.clear()]);
  });

  it("prunes old synced submissions and their uploaded audio, and keeps drafts and unsynced work", async () => {
    const row = (uid, status, synced, updated) => ({ response_uid: uid, template_name: "T", status, synced, created_at: updated, updated_at: updated });
    await db.responses.bulkPut([
      row("OLD-SENT", "Submitted", SYNCED, daysAgo(40)),
      row("OLD-UNSENT", "Submitted", NOT_SYNCED, daysAgo(40)),
      row("NEW-SENT", "Submitted", SYNCED, daysAgo(2)),
      row("OLD-DRAFT-SYNCED", "Draft", SYNCED, daysAgo(40)),
    ]);
    await db.audio_recordings.bulkPut([
      { response_uid: "OLD-SENT", status: "synced", created_at: daysAgo(40) },
      { response_uid: "OLD-UNSENT", status: "pending", created_at: daysAgo(40) },
    ]);

    expect(await compactLocalStorage(30)).toBe(1);

    expect((await db.responses.toCollection().primaryKeys()).sort()).toEqual(["NEW-SENT", "OLD-DRAFT-SYNCED", "OLD-UNSENT"]);
    expect(await db.audio_recordings.toCollection().primaryKeys()).toEqual(["OLD-UNSENT"]);
  });
});
