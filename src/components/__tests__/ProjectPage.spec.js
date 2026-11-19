import { describe, it, expect, vi } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ProjectPage from "../project/ProjectPage.vue";
import { useTranslation } from "../../composables/useTranslation";

const { call } = vi.hoisted(() => ({ call: vi.fn() }));
vi.mock("frappe-ui", () => ({
  Button: { name: "Button", emits: ["click"], template: "<button @click=\"$emit('click')\"><slot /></button>" },
  call,
}));

const PROJECT = "PROJ-Sample";
const HELP = {
  support_email: "helpdesk@example.org",
  helpline_phone: "+91 1800 000 111",
  sop_sections: "<p>Introduce yourself first.</p>",
};
// list_active_templates and the bootstrap send the project's help on every template (#14)
const template = (help = {}) => ({ name: "T1", title: "Baseline", project: PROJECT, project_name: "Sample Project", ...help });

async function mountPage(templates) {
  const wrapper = mount(ProjectPage, {
    props: { projectId: PROJECT, templates, cachedTemplatesMap: {}, isOnline: true },
  });
  await flushPromises();
  return wrapper;
}
// by its label in whichever language the page is showing
const { __ } = useTranslation();
const tab = (wrapper, text) => wrapper.findAll("button").find((b) => b.text().includes(__(text)));

describe("ProjectPage help (#14, #51)", () => {
  // no mockReset/mockClear here: on vitest 3.2.7 a reset mock that then rejects fails the test
  // even when the page catches it. Each test sets its own result instead.

  it("shows no helpline or SOP tab, and no number, for a project that set none", async () => {
    call.mockResolvedValue({ project: { name: PROJECT, project_name: "Sample Project", support_email: "", helpline_phone: "", sop_sections: "" } });
    const wrapper = await mountPage([template()]);
    expect(tab(wrapper, "Supervisor Helpline")).toBeUndefined();
    expect(tab(wrapper, "Field SOPs & Protocols")).toBeUndefined();
    expect(wrapper.html()).not.toMatch(/tel:|mailto:|1800/);
  });

  it("shows the project's own phone, email and SOPs from get_project_details", async () => {
    call.mockResolvedValue({ project: { name: PROJECT, project_name: "Sample Project", ...HELP } });
    const wrapper = await mountPage([template()]);
    expect(call).toHaveBeenLastCalledWith("omniquery.api.survey.get_project_details", { project_id: PROJECT });

    await tab(wrapper, "Supervisor Helpline").trigger("click");
    expect(wrapper.find("a[href^='tel:']").attributes("href")).toBe("tel:+91 1800 000 111");
    expect(wrapper.find("a[href^='mailto:']").attributes("href")).toBe("mailto:helpdesk@example.org");

    await tab(wrapper, "Field SOPs & Protocols").trigger("click");
    expect(wrapper.html()).toContain("Introduce yourself first.");
  });

  it("still shows the help offline, from the cached templates, when the call fails", async () => {
    call.mockRejectedValue(new TypeError("Failed to fetch"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const wrapper = await mountPage([template(HELP)]);

    await tab(wrapper, "Supervisor Helpline").trigger("click");
    expect(wrapper.find("a[href^='tel:']").attributes("href")).toBe("tel:+91 1800 000 111");
    expect(wrapper.find("a[href^='mailto:']").attributes("href")).toBe("mailto:helpdesk@example.org");
    await tab(wrapper, "Field SOPs & Protocols").trigger("click");
    expect(wrapper.html()).toContain("Introduce yourself first.");
  });

  it("falls back to the cached templates for a project the endpoint does not return", async () => {
    call.mockResolvedValue({});
    const wrapper = await mountPage([template({ helpline_phone: "+91 1800 000 222" })]);
    await tab(wrapper, "Supervisor Helpline").trigger("click");
    expect(wrapper.find("a[href^='tel:']").attributes("href")).toBe("tel:+91 1800 000 222");
    expect(wrapper.find("a[href^='mailto:']").exists()).toBe(false);
  });
});
