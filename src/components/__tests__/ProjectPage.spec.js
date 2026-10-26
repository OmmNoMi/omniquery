import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ProjectPage from "../project/ProjectPage.vue";

// Mock frappe-ui call
vi.mock("frappe-ui", () => ({
  Button: {
    name: "Button",
    template: "<button><slot /></button>",
  },
  call: vi.fn().mockResolvedValue({}),
}));

describe("ProjectPage Component (Issue #14)", () => {
  it("renders NO helpline phone link, button, or tab when helpline_phone is empty", () => {
    const wrapper = mount(ProjectPage, {
      props: {
        projectId: "PROJ-CLEAN",
        templates: [
          {
            project: "PROJ-CLEAN",
            project_name: "Clean Enterprise Initiative",
            template_name: "T1",
            title: "General Baseline Survey",
            helpline_phone: "",
            helpline_email: "",
          },
        ],
        cachedTemplatesMap: {},
        isOnline: true,
      },
    });

    // 1. No tel: link exists anywhere in DOM
    const telLinks = wrapper.findAll("a[href^='tel:']");
    expect(telLinks.length).toBe(0);

    // 2. No hardcoded helpline numbers appear
    expect(wrapper.text()).not.toContain("1800");

    // 3. Helpline tab is NOT rendered
    const helplineTab = wrapper.findAll("button").filter((b) => b.text().includes("Helpline"));
    expect(helplineTab.length).toBe(0);
  });

  it("renders helpline only when helpline_phone is configured on project", () => {
    const wrapper = mount(ProjectPage, {
      props: {
        projectId: "PROJ-WITH-HELPLINE",
        templates: [
          {
            project: "PROJ-WITH-HELPLINE",
            project_name: "Farmer Support Initiative",
            helpline_phone: "1800999000",
            helpline_email: "support@customdomain.org",
          },
        ],
        cachedTemplatesMap: {},
        isOnline: true,
      },
    });

    const telLinks = wrapper.findAll("a[href^='tel:']");
    expect(telLinks.length).toBeGreaterThanOrEqual(1);
    expect(telLinks[0].attributes("href")).toBe("tel:1800999000");
  });

  describe("Project templates filtering (Issue #15)", () => {
    it("shows empty state and zero surveys when project has no templates of its own", () => {
      const wrapper = mount(ProjectPage, {
        props: {
          projectId: "PROJ-EMPTY",
          templates: [
            {
              name: "T-OTHER-1",
              template_name: "T-OTHER-1",
              project: "PROJ-OTHER",
              project_name: "Other Enterprise Study",
              title: "Other Project Survey",
            },
            {
              name: "T-OTHER-2",
              template_name: "T-OTHER-2",
              project: "PROJ-OTHER-2",
              project_name: "Second Other Study",
              title: "Second Other Survey",
            },
          ],
          cachedTemplatesMap: {},
          isOnline: true,
        },
      });

      // Must NOT display surveys belonging to other projects
      expect(wrapper.text()).not.toContain("Other Project Survey");
      expect(wrapper.text()).not.toContain("Second Other Survey");

      // Header survey count must be 0
      expect(wrapper.text()).toContain("0 Surveys Assigned");

      // Empty state copy must be visible
      expect(wrapper.text()).toContain("No published surveys found for this project");
    });
  });

  describe("Project header stability and zero raw IDs (Issue #16)", () => {
    it("preserves status without layout flip and never renders raw workspace ID", async () => {
      const rawWsId = ["OQW", "101"].join("-");
      const { call } = await import("frappe-ui");
      call.mockResolvedValueOnce({
        project: {
          name: "PROJ-HEADER-TEST",
          project_name: "Header Stability Initiative",
          workspace: rawWsId,
        },
      });

      const wrapper = mount(ProjectPage, {
        props: {
          projectId: "PROJ-HEADER-TEST",
          templates: [
            {
              project: "PROJ-HEADER-TEST",
              project_name: "Header Stability Initiative",
              workspace: rawWsId,
              workspace_title: "Livelihoods Enterprise Hub",
              status: "Active",
            },
          ],
          cachedTemplatesMap: {},
          isOnline: true,
        },
      });

      // Before resolution (from bootstrap data)
      expect(wrapper.text()).toContain("Active");
      expect(wrapper.text()).not.toContain("Active Field Project");
      expect(wrapper.text()).not.toContain(rawWsId);

      // Wait for fetchProjectMeta to resolve
      await flushPromises();

      // After resolution: status must NOT flip to fallback and raw ID must NEVER show
      expect(wrapper.text()).toContain("Active");
      expect(wrapper.text()).not.toContain("Active Field Project");
      expect(wrapper.text()).not.toContain(rawWsId);
    });
  });
});
