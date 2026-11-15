import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import { nextTick } from "vue";

// What the surveyor sees when an interview cannot be stored (#32) or uploaded for a lost session
// (#33). Only the server is faked, at frappe-ui's call(); the app, its views and IndexedDB are real.
let batchPush;
vi.mock("frappe-ui", async (importOriginal) => {
  const actual = await importOriginal();
  return {
    ...actual,
    call: vi.fn(async (method, args) => {
      if (method === "omniquery.api.survey.get_bootstrap_data") return { is_unassigned: false, templates: [] };
      if (method === "omniquery.api.sync.batch_push") return batchPush(args.submissions);
      return {};
    }),
  };
});

import App from "../../App.vue";
import { db } from "../../services/db";
import { useTranslation } from "../../composables/useTranslation";

const template = {
  name: "TMPL-TEST",
  title: "Test Survey",
  version: 1,
  sections: [{ section_code: "sec_1", section_title: "Section 1", questions: [{ question_code: "q_name", label_en: "Name" }] }],
};
const text = () => document.body.textContent;
const button = (label) => [...document.body.querySelectorAll("button")].find((b) => b.textContent.trim() === label);

async function settle() {
  await flushPromises();
  await vi.waitFor(() => {
    if (text().includes("Loading surveys")) throw new Error("still loading");
  });
  await flushPromises();
}

describe("App alerts for an interview that did not get through", () => {
  let wrapper;

  beforeEach(async () => {
    useTranslation().setLanguage("en");
    await Promise.all([db.wal.clear(), db.responses.clear(), db.templates.clear()]);
    batchPush = vi.fn(async (subs) => ({ results: subs.map((s) => ({ idempotency_key: s.idempotency_key, status: "SUCCESS" })) }));
    window.history.replaceState({}, "", "/omniquery");
    window.scrollTo = vi.fn();
    wrapper = mount(App, { attachTo: document.body });
    await settle();
  });
  afterEach(() => {
    wrapper?.unmount();
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  async function fillSurvey() {
    const s = wrapper.vm.s;
    s.activeTemplate = template;
    s.currentDraftId = "OQS-TEST-SUBMIT";
    s.responses = { q_name: "Sunita" };
    await nextTick();
    return s;
  }

  it("keeps the answers on screen with a Try again when the device cannot store the submit (#32)", async () => {
    const s = await fillSurvey();
    const add = vi.spyOn(db.wal, "add").mockRejectedValue(new Error("QuotaExceededError"));

    await s.submitForm();
    await nextTick();

    expect(s.isSubmitted, "no success screen for an interview that was never queued").toBe(false);
    expect(s.isSubmitting, "the submit button is not left spinning").toBe(false);
    expect(s.responses).toEqual({ q_name: "Sunita" });
    expect(text()).toContain("Interview not saved");
    expect(text()).toContain("Storage may be full");

    add.mockRestore();
    button("Try again").click();
    await vi.waitFor(() => expect(s.isSubmitted).toBe(true));
    expect(s.submissionError).toBe("");
    expect(text()).not.toContain("Interview not saved");
  });

  it("asks the surveyor to sign in again when the server says the session is gone (#33)", async () => {
    const s = await fillSurvey();
    batchPush.mockRejectedValue(Object.assign(new Error("batch_push 403"), { status: 403 }));

    await s.submitForm();
    await vi.waitFor(() => expect(text()).toContain("Session expired"));

    expect(text()).toContain("Sign in again to upload 1 interview");
    expect(button("Sign in"), "a Sign in button in the alert").toBeTruthy();
  });

  it("shows no session alert when a refused submission is not a lost session", async () => {
    const s = await fillSurvey();
    batchPush.mockRejectedValue(Object.assign(new Error("batch_push 417"), { status: 417, exc_type: "ValidationError" }));

    await s.submitForm();
    await flushPromises();

    expect(s.isSubmitted).toBe(true);
    expect(text()).not.toContain("Session expired");
  });
});
