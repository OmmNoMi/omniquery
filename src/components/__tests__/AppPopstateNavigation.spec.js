import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import App from "../../App.vue";
import { db } from "../../services/db";

describe("Popstate Navigation & Back Button Invariant (Issue #38)", () => {
  let mockFetch;

  beforeEach(async () => {
    vi.restoreAllMocks();
    await db.responses.clear();
    await db.wal.clear();
    await db.templates.clear();

    mockFetch = vi.fn().mockImplementation(async (url) => {
      if (url.includes("get_bootstrap_data") || url.includes("list_active_templates")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: [
              {
                name: "TMPL-TEST-001",
                template_name: "TMPL-TEST-001",
                title: "Test Survey 1",
                status: "Published",
                project: "OQP-TEST-PROJ",
                version: 1,
                questions: [],
              },
            ],
          }),
        };
      }
      if (url.includes("get_schema")) {
        return {
          ok: true,
          status: 200,
          json: async () => ({
            message: {
              name: "TMPL-TEST-001",
              template_name: "TMPL-TEST-001",
              title: "Test Survey 1",
              version: 1,
              questions: [],
            },
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
    delete window.frappe.initial_project_id;
    delete window.frappe.initial_survey_id;
    window.history.pushState({}, "", "/omniquery");
  });

  it("navigates to catalog when pressing Back twice after deep-linking to a project", async () => {
    // 1. Initial deep-link to project with server-injected initial_project_id
    window.frappe.initial_project_id = "OQP-TEST-PROJ";
    window.history.pushState({}, "", "/omniquery/project/OQP-TEST-PROJ");

    const wrapper = mount(App);
    await vi.waitFor(() => {
      expect(wrapper.vm.activeProjectId).toBe("OQP-TEST-PROJ");
    });

    // 2. Open survey from project page
    await wrapper.vm.selectSurvey("TMPL-TEST-001");
    expect(wrapper.vm.activeTemplate?.name).toBe("TMPL-TEST-001");
    expect(window.location.pathname).toBe("/omniquery/TMPL-TEST-001");

    // 3. First Back button: return to project page
    window.history.pushState({}, "", "/omniquery/project/OQP-TEST-PROJ");
    window.dispatchEvent(new PopStateEvent("popstate"));
    await vi.waitFor(() => {
      expect(wrapper.vm.activeProjectId).toBe("OQP-TEST-PROJ");
      expect(wrapper.vm.activeTemplate).toBeNull();
    });

    // 4. Second Back button: return to catalog (/omniquery)
    window.history.pushState({}, "", "/omniquery");
    window.dispatchEvent(new PopStateEvent("popstate"));

    // Invariant: The catalog is shown; activeProjectId and activeTemplate are reset
    await vi.waitFor(() => {
      expect(wrapper.vm.activeProjectId).toBe("");
      expect(wrapper.vm.activeTemplate).toBeNull();
    });
    wrapper.unmount();
  });
});
