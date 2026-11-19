import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h } from "vue";
import { useSurveyApp } from "../useSurveyApp";
import { useWAL } from "../useWAL";
import { db, NOT_SYNCED, SYNCED } from "../../services/db";
import { buildResponsePayload, draftStored } from "../../utils/responsePayload";

// #35: leaving a survey sends its last answers to the server as a draft. The server decides who did
// it from the session, so no payload carries a surveyor. A draft is marked synced only when the
// server stored it; one that was not goes again when the device is next online.

const template = {
  name: "TMPL-TEST-001",
  title: "Test Survey",
  version: 1,
  questions: [{ question_code: "q_name", label_en: "Respondent Name" }],
};

let draftReply;
let wrapper;
let fetchMock;

const draftCalls = () =>
  fetchMock.mock.calls.filter(([url]) => String(url).includes("sync_draft")).map(([, opts]) => JSON.parse(opts.body).draft);

function mountApp() {
  let app;
  wrapper = mount(defineComponent({ setup: () => ((app = useSurveyApp()), () => h("div")) }));
  return app;
}

async function openSurvey(app, answers) {
  app.activeTemplate.value = template;
  app.currentDraftId.value = "OQS-TEST-001-abc123";
  app.responses.value = answers;
}

const stored = () => db.responses.get("OQS-TEST-001-abc123");
const setOnline = (online) => window.dispatchEvent(new Event(online ? "online" : "offline"));

beforeEach(async () => {
  await Promise.all([db.responses.clear(), db.wal.clear(), db.templates.clear()]);
  draftReply = { status: "SUCCESS", doc_name: "OQS-TEST-001-abc123" };
  fetchMock = vi.fn(async (url) => ({
    ok: true,
    status: 200,
    headers: new Headers({ "content-type": "application/json" }),
    json: async () => ({ message: String(url).includes("sync_draft") ? draftReply : {} }),
  }));
  vi.stubGlobal("fetch", fetchMock);
  setOnline(true);
});

afterEach(() => {
  wrapper?.unmount();
  vi.unstubAllGlobals();
});

describe("leaving a survey (#35)", () => {
  it("sends the last answers as a draft, with no surveyor, and marks it synced", async () => {
    const app = mountApp();
    await openSurvey(app, { q_name: "Ramesh Sharma", q_blank: "  " });

    await app.goHome();

    const [draft] = draftCalls().filter((d) => d.idempotency_key === "OQS-TEST-001-abc123");
    expect(draft.survey_template).toBe("TMPL-TEST-001");
    expect(draft.items).toEqual([{ question_code: "q_name", question_label: "Respondent Name", value: "Ramesh Sharma" }]);
    expect(draft).not.toHaveProperty("surveyor");
    expect(app.activeTemplate.value).toBeNull();
    expect((await stored()).synced).toBe(SYNCED);
  });

  it("keeps a draft the server rejected unsynced", async () => {
    draftReply = { status: "REJECTED", error: "Permission denied for template TMPL-TEST-001" };
    const app = mountApp();
    await openSurvey(app, { q_name: "Ramesh Sharma" });

    await app.goHome();

    expect(draftCalls()).not.toHaveLength(0);
    expect((await stored()).synced).toBe(NOT_SYNCED);
  });

  it("sends a draft left offline once the device is back online", async () => {
    const app = mountApp();
    await openSurvey(app, { q_name: "Ramesh Sharma" });
    setOnline(false);

    await app.goHome();
    expect(draftCalls()).toHaveLength(0);
    expect((await stored()).synced).toBe(NOT_SYNCED);

    setOnline(true);
    await vi.waitFor(async () => expect((await stored()).synced).toBe(SYNCED));
    expect(draftCalls().map((d) => d.idempotency_key)).toContain("OQS-TEST-001-abc123");
  });
});

describe("syncAllDrafts", () => {
  const putDraft = (uid, answers, synced = NOT_SYNCED) =>
    db.responses.put({ response_uid: uid, template_name: "TMPL-TEST-001", status: "Draft", responses: answers, synced, created_at: "2026-11-14T00:00:00Z" });

  it("sends only unsynced drafts and marks only the stored ones", async () => {
    await putDraft("D-DONE", { q_name: "Already sent" }, SYNCED);
    await putDraft("D-OK", { q_name: "Sita" });
    await putDraft("D-FAIL", { q_name: "Gita" });
    await putDraft("D-EMPTY", {});
    fetchMock.mockImplementation(async (url, opts) => {
      const uid = JSON.parse(opts.body).draft?.idempotency_key;
      if (uid === "D-FAIL") return { ok: false, status: 500, headers: new Headers(), json: async () => ({}), text: async () => "{}" };
      return { ok: true, status: 200, headers: new Headers({ "content-type": "application/json" }), json: async () => ({ message: { status: "SUCCESS" } }) };
    });

    const { syncAllDrafts } = useWAL();
    // D-FAIL fails first and does not hold back D-OK
    expect(await syncAllDrafts()).toBe(1);

    expect(draftCalls().map((d) => d.idempotency_key).sort()).toEqual(["D-FAIL", "D-OK"]);
    expect(draftCalls().every((d) => !("surveyor" in d))).toBe(true);
    expect((await db.responses.get("D-OK")).synced).toBe(SYNCED);
    expect((await db.responses.get("D-FAIL")).synced).toBe(NOT_SYNCED);
  });
});

describe("buildResponsePayload", () => {
  it("drops unanswered questions, labels the rest and names no surveyor", () => {
    const payload = buildResponsePayload({
      template,
      responses: { q_name: "Sunita", q_other: 0, q_none: null, q_space: " " },
      responseId: "OQS-1",
      gps: { latitude: 26.9, longitude: 75.8, accuracy: 12, status: "Captured" },
      capturedAt: "2026-11-14T10:00:00Z",
    });
    expect(payload).toEqual({
      idempotency_key: "OQS-1",
      survey_template: "TMPL-TEST-001",
      template_version: 1,
      respondent: "",
      captured_at_local: "2026-11-14T10:00:00Z",
      gps_latitude: 26.9,
      gps_longitude: 75.8,
      gps_accuracy: 12,
      gps_status: "Captured",
      items: [
        { question_code: "q_name", question_label: "Respondent Name", value: "Sunita" },
        { question_code: "q_other", question_label: "q_other", value: 0 },
      ],
    });
  });

  it("keeps a 0 coordinate and a 0 accuracy, and says why there is no location (#27)", () => {
    const build = (gps) => buildResponsePayload({ template, responses: { q_name: "Sunita" }, responseId: "OQS-1", gps });
    expect(build({ latitude: 0, longitude: 32.5, accuracy: 0, status: "Captured" })).toMatchObject({
      gps_latitude: 0,
      gps_longitude: 32.5,
      gps_accuracy: 0,
      gps_status: "Captured",
    });
    expect(build({ status: "Denied" })).toMatchObject({ gps_latitude: null, gps_longitude: null, gps_accuracy: null, gps_status: "Denied" });
    expect(build(null), "a background sync knows nothing about the location").toMatchObject({ gps_latitude: null, gps_status: null });
  });

  it("counts only SUCCESS as stored", () => {
    expect(["SUCCESS", "REJECTED", "ALREADY_SUBMITTED"].map((status) => draftStored({ status }))).toEqual([true, false, false]);
    expect(draftStored(undefined)).toBe(false);
  });
});
