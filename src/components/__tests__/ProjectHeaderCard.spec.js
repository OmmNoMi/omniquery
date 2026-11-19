import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ProjectHeaderCard from "../dashboard/ProjectHeaderCard.vue";
import { useTranslation } from "../../composables/useTranslation";

const { __ } = useTranslation();

describe("ProjectHeaderCard", () => {
  // the app starts in Hindi; these tests read English labels unless they set a language
  beforeEach(() => useTranslation().setLanguage("en"));

  it("collapses one project's templates into a single card", () => {
    const templates = [
      { project: "PROJ-SHG", project_name: "Rural Women Entrepreneurs Study", template_name: "T1" },
      { project: "PROJ-SHG", project_name: "Rural Women Entrepreneurs Study", template_name: "T3" },
    ];

    const wrapper = mount(ProjectHeaderCard, { props: { templates, selectedProject: "ALL" } });

    expect(wrapper.vm.projectList.length).toBe(1);
    expect(wrapper.find("h1").text()).toBe("Rural Women Entrepreneurs Study");
    expect(wrapper.text()).toContain(`2 ${__("Surveys")}`);
    // Pagination controls should NOT be visible when length === 1
    expect(wrapper.find("button[title='Next project']").exists()).toBe(false);
  });

  it("keeps two projects that share a title apart, each with its id and its own surveys (#15)", () => {
    const templates = [
      { project: "PROJ-SHG", project_name: "Rural Women Entrepreneurs Study", template_name: "T1" },
      { project: "OQP-001-001", project_name: "Rural Women Entrepreneurs Study", template_name: "T2" },
      { project: "PROJ-SHG", project_name: "Rural Women Entrepreneurs Study", template_name: "T3" },
    ];

    const wrapper = mount(ProjectHeaderCard, { props: { templates, selectedProject: "ALL" } });

    expect(wrapper.vm.projectList.map((p) => p.id)).toEqual(["PROJ-SHG", "OQP-001-001"]);
    const titles = wrapper.findAll("h1").map((h) => h.text());
    expect(titles).toEqual([
      "Rural Women Entrepreneurs Study PROJ-SHG",
      "Rural Women Entrepreneurs Study OQP-001-001",
    ]);
    const counts = wrapper.findAll("[data-project-index]").map((card) => card.text());
    expect(counts[0]).toContain(`2 ${__("Surveys")}`);
    expect(counts[1]).toContain(`1 ${__("Surveys")}`);
  });

  it("shows no id beside a title only one project uses", () => {
    const templates = [
      { project: "PROJ-A", project_name: "Dairy Project", template_name: "T1" },
      { project: "PROJ-B", project_name: "Solar Energy Survey", template_name: "T2" },
    ];

    const wrapper = mount(ProjectHeaderCard, { props: { templates, selectedProject: "ALL" } });

    expect(wrapper.findAll("h1").map((h) => h.text())).toEqual(["Dairy Project", "Solar Energy Survey"]);
  });

  it("renders multiple unique projects and emits select-project on change", async () => {
    const templates = [
      {
        project: "PROJ-A",
        project_name: "Dairy Project",
        template_name: "T1",
      },
      {
        project: "PROJ-B",
        project_name: "Solar Energy Survey",
        template_name: "T2",
      },
    ];

    const wrapper = mount(ProjectHeaderCard, {
      props: {
        templates,
        selectedProject: "PROJ-A",
      },
    });

    expect(wrapper.vm.projectList.length).toBe(2);
    expect(wrapper.find("button[title='Next project']").exists()).toBe(true);

    wrapper.vm.scrollToIndex(1);
    expect(wrapper.emitted("update:selectedProject")).toBeTruthy();
    expect(wrapper.emitted("update:selectedProject")[0]).toEqual(["PROJ-B"]);
  });

  describe("project details button at 375px (#41)", () => {
    afterEach(() => useTranslation().setLanguage("en"));

    const mountCard = () =>
      mount(ProjectHeaderCard, {
        props: { templates: [{ project: "PROJ-A", project_name: "Dairy Project", template_name: "T1" }], selectedProject: "PROJ-A" },
      });
    const detailsButton = (wrapper) => wrapper.findAll("button").find((b) => b.find("span.sm\\:hidden").exists());

    // each label is one whole phrase, so a translation can reorder its words; the short one fits a phone
    const LABELS = {
      en: ["Project details", "Project details and training materials"],
      hi: ["प्रोजेक्ट विवरण", "प्रोजेक्ट विवरण और प्रशिक्षण सामग्री"],
    };

    for (const [language, [short, full]] of Object.entries(LABELS)) {
      it(`shows the short label on a phone and the full one from sm up, in ${language}`, async () => {
        useTranslation().setLanguage(language);
        const wrapper = mountCard();
        const button = detailsButton(wrapper);
        expect(button, "details button").toBeDefined();
        expect(button.find("span.sm\\:hidden").text()).toBe(short);
        expect(button.find("span.hidden.sm\\:inline").text()).toBe(full);
        await button.trigger("click");
        expect(wrapper.emitted("open-project-details")).toEqual([["PROJ-A"]]);
      });
    }
  });

  // frappe-ui Button drops an aria-label attribute, so the arrows are named with :label (PR #94)
  describe("project arrows have an accessible name", () => {
    afterEach(() => useTranslation().setLanguage("en"));
    const NAMES = { en: ["Previous project", "Next project"], hi: ["पिछला प्रोजेक्ट", "अगला प्रोजेक्ट"] };

    for (const [language, names] of Object.entries(NAMES)) {
      it(`names the previous and next buttons, in ${language}`, () => {
        useTranslation().setLanguage(language);
        const templates = [
          { project: "PROJ-A", project_name: "Dairy Project", template_name: "T1" },
          { project: "PROJ-B", project_name: "Solar Energy Survey", template_name: "T2" },
        ];
        const wrapper = mount(ProjectHeaderCard, { props: { templates, selectedProject: "PROJ-A" } });
        for (const name of names) expect(wrapper.find(`button[aria-label='${name}']`).exists(), name).toBe(true);
      });
    }
  });
});
