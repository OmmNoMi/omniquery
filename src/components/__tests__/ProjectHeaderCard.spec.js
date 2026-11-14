import { describe, it, expect, afterEach, beforeEach } from "vitest";
import { mount } from "@vue/test-utils";
import ProjectHeaderCard from "../dashboard/ProjectHeaderCard.vue";
import { useTranslation } from "../../composables/useTranslation";

describe("ProjectHeaderCard", () => {
  // the app starts in Hindi; these tests read English labels unless they set a language
  beforeEach(() => useTranslation().setLanguage("en"));

  it("deduplicates projects with matching normalized names", () => {
    const templates = [
      {
        project: "PROJ-SHG",
        project_name: "Rajasthan Women Entrepreneurs Study",
        template_name: "T1",
      },
      {
        project: "OQP-001-001",
        project_name: "Rajasthan Women Entrepreneurs Study",
        template_name: "T2",
      },
      {
        project: "PROJ-SHG",
        project_name: "Rajasthan Women Entrepreneurs Study",
        template_name: "T3",
      },
    ];

    const wrapper = mount(ProjectHeaderCard, {
      props: {
        templates,
        selectedProject: "ALL",
      },
    });

    // Even though 3 templates and 2 different project IDs exist,
    // they share the exact normalized project_name so only 1 card is rendered
    expect(wrapper.vm.projectList.length).toBe(1);
    expect(wrapper.vm.projectList[0].project_name).toBe("Rajasthan Women Entrepreneurs Study");
    // Pagination controls should NOT be visible when length === 1
    expect(wrapper.find("button[title='Next project']").exists()).toBe(false);
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
