import { describe, it, expect, beforeEach, vi } from "vitest";
import { db, compactLocalStorage } from "../../services/db";
import { useSurvey } from "../useSurvey";
import { useWAL, _resetWALInstance } from "../useWAL";

describe("Draft Persistence & Storage Compaction Invariants (#34)", () => {
  beforeEach(async () => {
    _resetWALInstance();
    await db.wal.clear();
    await db.responses.clear();
    await db.audio_recordings.clear();
    await db.templates.clear();
    vi.restoreAllMocks();
  });

  it("opening a survey without answering writes no record", async () => {
    const { loadTemplate, responses, saveDraftLocally } = useSurvey();

    await db.templates.put({
      template_name: "TMPL-CLEAN",
      title: "Clean Survey",
      version: 1,
      sections: [{ section_code: "s1", questions: [] }],
    });

    await loadTemplate("TMPL-CLEAN");
    expect(responses.value).toEqual({});

    // Attempt draft save with empty responses
    await saveDraftLocally(0);

    const count = await db.responses.count();
    expect(count).toBe(0);
  });

  it("resume opens the draft with the most answers", async () => {
    const { loadTemplate, responses, currentDraftId } = useSurvey();

    await db.templates.put({
      template_name: "TMPL-MULTI",
      title: "Multi Draft Survey",
      version: 1,
      sections: [{ section_code: "s1", questions: [] }],
    });

    // Draft A: Updated 10 minutes ago, 4 answers
    await db.responses.put({
      response_uid: "DRAFT-WITH-ANSWERS",
      template_name: "TMPL-MULTI",
      title: "Multi Draft Survey",
      responses: { q1: "Alpha", q2: "Beta", q3: "Gamma", q4: "Delta" },
      active_section_index: 0,
      progress_percent: 50,
      status: "Draft",
      created_at: new Date(Date.now() - 3600000).toISOString(),
      updated_at: new Date(Date.now() - 600000).toISOString(),
      synced: 0,
    });

    // Draft B: Updated 1 minute ago, empty (0 answers)
    await db.responses.put({
      response_uid: "DRAFT-EMPTY-NEW",
      template_name: "TMPL-MULTI",
      title: "Multi Draft Survey",
      responses: {},
      active_section_index: 0,
      progress_percent: 0,
      status: "Draft",
      created_at: new Date(Date.now() - 120000).toISOString(),
      updated_at: new Date(Date.now() - 60000).toISOString(),
      synced: 0,
    });

    // Resume survey without explicit draft ID
    await loadTemplate("TMPL-MULTI", false);

    expect(currentDraftId.value).toBe("DRAFT-WITH-ANSWERS");
    expect(responses.value.q1).toBe("Alpha");
    expect(responses.value.q4).toBe("Delta");
  });

  it("created_at stays the same across saves", async () => {
    const { loadTemplate, responses, saveDraftLocally, currentDraftId } = useSurvey();

    await db.templates.put({
      template_name: "TMPL-TIMESTAMPS",
      title: "Timestamp Test Survey",
      version: 1,
      sections: [{ section_code: "s1", questions: [] }],
    });

    await loadTemplate("TMPL-TIMESTAMPS");
    currentDraftId.value = "DRAFT-TS-001";
    responses.value = { q1: "First Answer" };

    // First save
    const t1 = "2026-10-26T00:00:00.000Z";
    vi.setSystemTime(new Date(t1));
    await saveDraftLocally(20);

    const record1 = await db.responses.get("DRAFT-TS-001");
    expect(record1).toBeDefined();
    expect(record1.created_at).toBe(t1);

    // Second save 1 hour later
    const t2 = "2026-10-26T01:00:00.000Z";
    vi.setSystemTime(new Date(t2));
    responses.value.q2 = "Second Answer";
    await saveDraftLocally(40);

    const record2 = await db.responses.get("DRAFT-TS-001");
    expect(record2.created_at).toBe(t1); // Invariant: created_at is NEVER overwritten
    expect(record2.updated_at).toBe(t2);
  });

  it("after a server acknowledgement, the WAL row and audio blob are gone", async () => {
    const { queueWAL, syncWAL } = useWAL();

    const testUid = "RESP-SYNC-PRUNE-001";
    const testBlob = new Blob(["mock-audio"], { type: "audio/webm" });

    // Enqueue WAL item
    const walEntry = await queueWAL(
      "OmniQuery Response",
      {
        idempotency_key: testUid,
        survey_template: "TMPL-PRUNE",
        items: [{ question_code: "q1", value: "Answer" }],
      },
      false
    );

    // Save corresponding response and audio recording
    await db.responses.put({
      response_uid: testUid,
      template_name: "TMPL-PRUNE",
      status: "Submitted",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      synced: 0,
    });

    await db.audio_recordings.put({
      response_uid: testUid,
      blob: testBlob,
      mime_type: "audio/webm",
      file_name: `interview_${testUid}.webm`,
      status: "pending",
      created_at: new Date().toISOString(),
    });

    // Mock server acknowledgement
    globalThis.fetch = vi.fn().mockImplementation(async (url) => {
      if (url.includes("batch_push")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: {
              results: [{ idempotency_key: testUid, status: "SUCCESS" }],
            },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({
          message: { status: "SUCCESS", file_url: `/files/${testUid}.webm` },
        }),
      };
    });

    await syncWAL();

    // Invariant: WAL row is pruned after acknowledgement
    const walRecord = await db.wal.get(walEntry.wal_id);
    expect(walRecord).toBeUndefined();

    // Invariant: Audio recording blob is pruned after acknowledgement
    const audioRecord = await db.audio_recordings.get(testUid);
    expect(audioRecord).toBeUndefined();

    // Invariant: response synced status is integer 1
    const responseRecord = await db.responses.get(testUid);
    expect(responseRecord.synced).toBe(1);
  });
});
