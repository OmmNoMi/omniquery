import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../../App.vue";
import { db } from "../../services/db";

describe("AppDraftSync Specs (Issue #35)", () => {
  let mockFetch;

  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.responses.clear();
    await db.wal.clear();
    await db.templates.clear();

    mockFetch = vi.fn().mockImplementation(async (url, opts) => {
      if (url.includes("get_bootstrap_data") || url.includes("list_active_templates")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: [
              {
                name: "TMPL-TEST-001",
                template_name: "TMPL-TEST-001",
                title: "Test Survey",
                status: "Published",
                version: 1,
                questions: [
                  { question_code: "q_name", label_en: "Respondent Name" },
                  { question_code: "q_age", label_en: "Respondent Age" },
                ],
              },
            ],
          }),
        };
      }
      if (url.includes("sync_draft")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: { status: "SUCCESS", doc_name: "OQS-TEST-DRAFT" },
          }),
        };
      }
      return {
        ok: true,
        status: 200,
        json: async () => ({ message: {} }),
      };
    });

    globalThis.fetch = mockFetch;
    if (typeof window !== "undefined") {
      window.fetch = mockFetch;
    }
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("goHome() after an answer calls the sync with that template and those responses", async () => {
    const wrapper = mount(App);

    // Simulate opening survey and recording an answer
    const template = {
      name: "TMPL-TEST-001",
      template_name: "TMPL-TEST-001",
      title: "Test Survey",
      version: 1,
      questions: [
        { question_code: "q_name", label_en: "Respondent Name" },
        { question_code: "q_age", label_en: "Respondent Age" },
      ],
    };

    // Access vm state directly
    const vm = wrapper.vm;
    vm.activeTemplate = template;
    vm.currentDraftId = "DRAFT-TEST-123";
    vm.responses = { q_name: "Ramesh Sharma" };

    // Trigger exit/goHome
    await vm.goHome();

    // Verify sync_draft was called with that template and those responses
    const syncDraftCall = mockFetch.mock.calls.find((call) =>
      call[0].includes("sync_draft")
    );

    expect(syncDraftCall).toBeDefined();
    const body = JSON.parse(syncDraftCall[1].body);
    const draft = body.draft || body;
    expect(draft.survey_template).toBe("TMPL-TEST-001");
    // Client should not send identity at all (identity comes strictly from session on server)
    expect(draft.surveyor).toBeUndefined();
    expect(draft.items).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question_code: "q_name",
          value: "Ramesh Sharma",
        }),
      ])
    );
  });
});
