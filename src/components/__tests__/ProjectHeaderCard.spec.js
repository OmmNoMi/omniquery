import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import ProjectHeaderCard from "../dashboard/ProjectHeaderCard.vue";

describe("ProjectHeaderCard", () => {
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
    expect(wrapper.find("button[title*='Project']").exists()).toBe(false);
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
    expect(wrapper.find("button[title*='Project']").exists()).toBe(true);

    wrapper.vm.scrollToIndex(1);
    expect(wrapper.emitted("update:selectedProject")).toBeTruthy();
    expect(wrapper.emitted("update:selectedProject")[0]).toEqual(["PROJ-B"]);
  });
});
