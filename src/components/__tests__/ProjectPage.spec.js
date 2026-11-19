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

describe("ProjectPage surveys (#15)", () => {
  const otherProjects = [
    { name: "T-OTHER-1", title: "Other Project Survey", project: "PROJ-OTHER", project_name: "Other Enterprise Study" },
    { name: "T-OTHER-2", title: "Second Other Survey", project: "PROJ-OTHER-2", project_name: "Second Other Study" },
  ];

  it("lists none of another project's surveys when the project has none of its own", async () => {
    call.mockResolvedValue({});
    const wrapper = await mountPage(otherProjects);

    expect(wrapper.text()).not.toContain("Other Project Survey");
    expect(wrapper.text()).not.toContain("Second Other Survey");
    expect(wrapper.text()).toContain(`0 ${__("Surveys Assigned")}`);
    expect(wrapper.text()).toContain(__("No published surveys found for this project"));
    // nothing to pick or download, so no header bar over the empty state
    expect(wrapper.text()).not.toContain(__("Select a survey to start collecting field data"));
    expect(wrapper.text()).not.toContain(__("Download all for offline"));
  });

  it("lists only the project's own surveys, under the header bar", async () => {
    call.mockResolvedValue({});
    const wrapper = await mountPage([template(), ...otherProjects]);

    expect(wrapper.text()).toContain("Baseline");
    expect(wrapper.text()).not.toContain("Other Project Survey");
    expect(wrapper.text()).toContain(`1 ${__("Surveys Assigned")}`);
    expect(wrapper.text()).toContain(__("Select a survey to start collecting field data"));
    expect(wrapper.text()).toContain(__("Download all for offline"));
    expect(wrapper.text()).not.toContain(__("No published surveys found for this project"));
  });
});

describe("ProjectPage header (#16)", () => {
  const WORKSPACE = "WS-SAMPLE";
  const headerCard = (wrapper) => wrapper.find(".rounded-3xl").text();
  // get_project_details still on its way, so the header shows what the cached templates know
  function pendingDetails() {
    let resolve;
    call.mockReturnValue(new Promise((r) => (resolve = r)));
    return (value) => resolve(value);
  }

  it("shows the project's own status from its templates, and does not change when the details load", async () => {
    const resolveDetails = pendingDetails();
    const wrapper = await mountPage([template({ project_status: "Completed", workspace: WORKSPACE, workspace_title: "Sample Workspace" })]);
    const before = headerCard(wrapper);
    expect(before).toContain(__("Completed"));
    expect(before).toContain("Sample Workspace");

    resolveDetails({ project: { name: PROJECT, project_name: "Sample Project", status: "Completed", workspace: WORKSPACE, workspace_title: "Sample Workspace" } });
    await flushPromises();
    expect(headerCard(wrapper)).toBe(before);
  });

  it("shows no made-up status before the project's status is known", async () => {
    const resolveDetails = pendingDetails();
    const wrapper = await mountPage([]);
    expect(headerCard(wrapper)).not.toContain(__("Active"));

    resolveDetails({ project: { name: PROJECT, project_name: "Sample Project", status: "Archived" } });
    await flushPromises();
    expect(headerCard(wrapper)).toContain(__("Archived"));
  });

  it("never shows the workspace's raw id, cached or loaded", async () => {
    const resolveDetails = pendingDetails();
    const wrapper = await mountPage([template({ project_status: "Active", workspace: WORKSPACE, workspace_title: "" })]);
    expect(wrapper.text()).not.toContain(WORKSPACE);

    resolveDetails({ project: { name: PROJECT, project_name: "Sample Project", status: "Active", workspace: WORKSPACE, workspace_title: "" } });
    await flushPromises();
    expect(wrapper.text()).not.toContain(WORKSPACE);
  });
});
