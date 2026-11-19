import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { mount, flushPromises } from "@vue/test-utils";
import ProjectPage from "../project/ProjectPage.vue";
import { useTranslation } from "../../composables/useTranslation";

const { call } = vi.hoisted(() => ({ call: vi.fn() }));
// frappe-ui's own Tabs, so the tests drive its real tablist, roving tabindex and arrow keys (#17)
vi.mock("frappe-ui", async (importOriginal) => ({
  ...(await importOriginal()),
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

let mounted;
afterEach(() => mounted?.unmount());

// attached to the document, so focus is real and document.activeElement can be checked
async function mountPage(templates) {
  mounted = mount(ProjectPage, {
    props: { projectId: PROJECT, templates, cachedTemplatesMap: {}, isOnline: true },
    attachTo: document.body,
  });
  await flushPromises();
  return mounted;
}
// by its label in whichever language the page is showing
const { __ } = useTranslation();
const tabs = (wrapper) => wrapper.findAll("[role=tab]");
const tab = (wrapper, text) => tabs(wrapper).find((t) => t.text().includes(__(text)));
// a left click selects a frappe-ui (reka) tab on mousedown
const selectTab = (t) => t.trigger("mousedown", { button: 0, ctrlKey: false });
const tel = (wrapper) => wrapper.find("a[href^='tel:']");
const mailto = (wrapper) => wrapper.find("a[href^='mailto:']");

describe("ProjectPage help (#14, #51)", () => {
  // no mockReset/mockClear here: on vitest 3.2.7 a reset mock that then rejects fails the test
  // even when the page catches it. Each test sets its own result instead.

  it("shows no tabs, and no number, for a project that set no help", async () => {
    call.mockResolvedValue({ project: { name: PROJECT, project_name: "Sample Project", support_email: "", helpline_phone: "", sop_sections: "" } });
    const wrapper = await mountPage([template()]);
    // with only the surveys to show there is nothing to switch to: no tablist and no tab panel
    expect(wrapper.find("[role=tablist]").exists()).toBe(false);
    expect(wrapper.find("[role=tabpanel]").exists()).toBe(false);
    expect(wrapper.text()).toContain("Baseline");
    expect(wrapper.html()).not.toMatch(/tel:|mailto:|1800/);
    // and no empty helpline box, which would still take a gap in the header
    const emptyBoxes = wrapper.find(".rounded-3xl").findAll("div").filter((d) => d.element.childElementCount === 0 && !d.text());
    expect(emptyBoxes.map((d) => d.html())).toEqual([]);
  });

  it("shows the project's own phone, email and SOPs from get_project_details", async () => {
    call.mockResolvedValue({ project: { name: PROJECT, project_name: "Sample Project", ...HELP } });
    const wrapper = await mountPage([template()]);
    expect(call).toHaveBeenLastCalledWith("omniquery.api.survey.get_project_details", { project_id: PROJECT });

    // the helpline is shown once, in the header, with no tab of its own (#17)
    expect(tel(wrapper).attributes("href")).toBe("tel:+91 1800 000 111");
    expect(tel(wrapper).text()).toContain("+91 1800 000 111");
    expect(mailto(wrapper).attributes("href")).toBe("mailto:helpdesk@example.org");
    expect(mailto(wrapper).text()).toContain("helpdesk@example.org");
    expect(wrapper.findAll("a[href^='tel:']")).toHaveLength(1);
    expect(tabs(wrapper).map((t) => t.text())).toEqual([`${__("Surveys in this Project")} (1)`, __("Field SOPs & Protocols")]);

    await selectTab(tab(wrapper, "Field SOPs & Protocols"));
    expect(wrapper.html()).toContain("Introduce yourself first.");
  });

  it("still shows the help offline, from the cached templates, when the call fails", async () => {
    call.mockRejectedValue(new TypeError("Failed to fetch"));
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const wrapper = await mountPage([template(HELP)]);

    expect(tel(wrapper).attributes("href")).toBe("tel:+91 1800 000 111");
    expect(mailto(wrapper).attributes("href")).toBe("mailto:helpdesk@example.org");
    await selectTab(tab(wrapper, "Field SOPs & Protocols"));
    expect(wrapper.html()).toContain("Introduce yourself first.");
  });

  it("falls back to the cached templates for a project the endpoint does not return", async () => {
    call.mockResolvedValue({});
    const wrapper = await mountPage([template({ helpline_phone: "+91 1800 000 222" })]);
    expect(tel(wrapper).attributes("href")).toBe("tel:+91 1800 000 222");
    expect(mailto(wrapper).exists()).toBe(false);
  });

  it("shows the support email when the project has an email and no phone", async () => {
    call.mockResolvedValue({ project: { name: PROJECT, project_name: "Sample Project", support_email: "helpdesk@example.org" } });
    const wrapper = await mountPage([template()]);
    expect(tel(wrapper).exists()).toBe(false);
    expect(mailto(wrapper).attributes("href")).toBe("mailto:helpdesk@example.org");
  });
});

describe("ProjectPage tabs (#17)", () => {
  const withSops = () => [template({ sop_sections: HELP.sop_sections })];
  const selected = (wrapper) => tabs(wrapper).filter((t) => t.attributes("aria-selected") === "true").map((t) => t.text());
  const focusedText = () => document.activeElement?.textContent.trim();
  const panel = (wrapper) => wrapper.find("[role=tabpanel]:not([hidden])");
  const press = (key) => document.activeElement.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));

  it("is one tablist that Tab enters at the selected tab only, each tab naming its panel", async () => {
    call.mockResolvedValue({});
    const wrapper = await mountPage(withSops());
    expect(wrapper.findAll("[role=tablist]")).toHaveLength(1);
    const tablist = wrapper.find("[role=tablist]");
    const [surveys, sops] = tabs(wrapper);
    // frappe-ui (reka) keeps one tab stop, on the tablist, which hands focus to the selected tab
    expect(tablist.attributes("tabindex")).toBe("0");
    expect(tabs(wrapper).map((t) => t.attributes("tabindex"))).toEqual(["-1", "-1"]);
    tablist.element.focus();
    await flushPromises();
    expect(document.activeElement).toBe(surveys.element);
    expect(surveys.attributes("tabindex")).toBe("0");
    expect(sops.attributes("tabindex")).toBe("-1");
    expect(surveys.attributes("aria-selected")).toBe("true");
    expect(sops.attributes("aria-selected")).toBe("false");

    expect(panel(wrapper).attributes("id")).toBe(surveys.attributes("aria-controls"));
    expect(panel(wrapper).attributes("aria-labelledby")).toBe(surveys.attributes("id"));
    expect(panel(wrapper).text()).toContain("Baseline");
  });

  it("moves focus and selection with the arrow, Home and End keys", async () => {
    call.mockResolvedValue({});
    const wrapper = await mountPage(withSops());
    const surveysLabel = `${__("Surveys in this Project")} (1)`;
    const sopsLabel = __("Field SOPs & Protocols");
    tabs(wrapper)[0].element.focus();

    for (const [key, label] of [["ArrowRight", sopsLabel], ["ArrowLeft", surveysLabel], ["End", sopsLabel], ["Home", surveysLabel]]) {
      press(key);
      await flushPromises();
      expect(focusedText(), key).toBe(label);
      expect(selected(wrapper), key).toEqual([label]);
    }
    press("ArrowRight");
    await flushPromises();
    expect(panel(wrapper).text()).toContain("Introduce yourself first.");
    expect(panel(wrapper).attributes("aria-labelledby")).toBe(tab(wrapper, "Field SOPs & Protocols").attributes("id"));
  });

  it("falls back to the surveys when the selected SOPs tab goes away", async () => {
    // the cached template has SOPs; the details, once loaded, have none
    let resolve;
    call.mockReturnValue(new Promise((r) => (resolve = r)));
    const wrapper = await mountPage(withSops());
    await selectTab(tab(wrapper, "Field SOPs & Protocols"));
    expect(wrapper.text()).toContain("Introduce yourself first.");

    resolve({ project: { name: PROJECT, project_name: "Sample Project", sop_sections: "" } });
    await flushPromises();
    expect(wrapper.text()).not.toContain("Introduce yourself first.");
    expect(wrapper.text()).toContain("Baseline");
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

  describe("each fact once, one verb (#18)", () => {
    // asserted in English, whatever language the last test left on
    const { setLanguage, currentLang } = useTranslation();
    let lang;
    beforeEach(() => {
      lang = currentLang.value;
      setLanguage("en");
      // the header from the cached templates, as a surveyor sees it before the details load
      pendingDetails();
    });
    afterEach(() => setLanguage(lang));

    const count = (wrapper, text) => wrapper.text().split(text).length - 1;
    const RGAVP = "Rajasthan Grameen Aajeevika Vikas Parishad (RGAVP)";

    it("starts a survey with Start Survey, the verb the catalog uses", async () => {
      const wrapper = await mountPage([template()]);
      expect(wrapper.text()).toContain("Start Survey");
      expect(wrapper.text()).not.toContain("Fill Survey");
    });

    it("does not repeat the title as the description", async () => {
      const wrapper = await mountPage([template({ project_name: "Rural Health Initiative", project_description: " rural health  initiative " })]);
      expect(count(wrapper, "Rural Health Initiative")).toBe(1);
      expect(wrapper.text().toLowerCase().split("rural health").length - 1).toBe(1);
    });

    it("shows the project's description in the header only, not again on each survey card", async () => {
      const description = "A study of micro-enterprises.";
      const second = { ...template({ project_description: description }), name: "T2", title: "Endline" };
      const wrapper = await mountPage([template({ project_description: description }), second]);
      expect(count(wrapper, description)).toBe(1);
      expect(wrapper.text()).not.toContain("Field data collection instrument");
    });

    it("hides a survey's own description when it repeats the project's, and shows one that adds a fact", async () => {
      // a survey author often copies the project's description into the survey's own
      const description = "Study on Performance of SHG-led Women Entrepreneurs in Rajasthan";
      const copied = { ...template({ project_description: description }), description };
      const own = { ...template({ project_description: description }), name: "T2", title: "Endline", description: "Asked a year after the baseline." };
      const wrapper = await mountPage([copied, own]);
      expect(count(wrapper, description)).toBe(1);
      expect(wrapper.text()).toContain("Asked a year after the baseline.");
    });

    it("hides the workspace when the grantor already names it, and shows it when it adds a fact", async () => {
      const repeat = await mountPage([template({ workspace_title: RGAVP, grantor_organization: `${RGAVP} / SVEP` })]);
      expect(count(repeat, RGAVP)).toBe(1);
      repeat.unmount();

      const differs = await mountPage([template({ workspace_title: "Udaipur Cluster", grantor_organization: `${RGAVP} / SVEP` })]);
      expect(differs.text()).toContain("Udaipur Cluster");
    });
  });
});
