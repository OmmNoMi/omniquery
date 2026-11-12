import { describe, it, expect, vi } from "vitest";
import { mount } from "@vue/test-utils";
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
});
