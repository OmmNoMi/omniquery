import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import QuestionCard from "../survey/QuestionCard.vue";
import FCombobox from "../common/FCombobox.vue";

describe("Issue #24: Cascading District and Block filtering", () => {
  const blockQuestion = {
    question_code: "block",
    label_en: "Q2. Block",
    field_type: "Single Choice (Dropdown)",
    control_variant: "Combobox",
    depends_on_field: "district",
    options: {
      Baran: ["Baran", "Chhipabarod"],
      Churu: ["Ratangarh", "Sujangarh"],
    },
    is_mandatory: true,
  };

  it("limits Block options to Baran's blocks when Baran is the chosen District", async () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: blockQuestion,
        modelValue: "",
        allResponses: {
          district: "Baran",
        },
      },
    });

    const combobox = wrapper.findComponent(FCombobox);
    expect(combobox.exists()).toBe(true);
    const options = combobox.props("options");
    expect(options).toEqual([
      { value: "Baran", label: "Baran" },
      { value: "Chhipabarod", label: "Chhipabarod" },
    ]);

    // Open dropdown to ensure options list renders only Baran's blocks
    const trigger = wrapper.find('button[role="combobox"]');
    await trigger.trigger("click");
    const listbox = wrapper.find('[role="listbox"]');
    expect(listbox.exists()).toBe(true);
    expect(listbox.text()).toContain("Baran");
    expect(listbox.text()).toContain("Chhipabarod");
    expect(listbox.text()).not.toContain("Ratangarh");
    expect(listbox.text()).not.toContain("Sujangarh");
  });

  it("limits Block options in button grid mode", () => {
    const radioBlockQuestion = {
      ...blockQuestion,
      control_variant: "Radio",
    };

    const wrapper = mount(QuestionCard, {
      props: {
        question: radioBlockQuestion,
        modelValue: "",
        allResponses: {
          district: "Baran",
        },
      },
    });

    const renderedText = wrapper.text();
    expect(renderedText).toContain("Baran");
    expect(renderedText).toContain("Chhipabarod");
    expect(renderedText).not.toContain("Ratangarh");
    expect(renderedText).not.toContain("Sujangarh");
  });

  it("clears Block selection when District changes", async () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: blockQuestion,
        modelValue: "Chhipabarod",
        allResponses: {
          district: "Baran",
        },
      },
    });

    // Change parent district to Churu
    await wrapper.setProps({
      allResponses: {
        district: "Churu",
      },
    });

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted[0]).toEqual([""]);
  });

  it("shows no block options when District is not yet chosen", () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: blockQuestion,
        modelValue: "",
        allResponses: {},
      },
    });

    const combobox = wrapper.findComponent(FCombobox);
    expect(combobox.exists()).toBe(true);
    expect(combobox.props("options")).toEqual([]);
  });
});
