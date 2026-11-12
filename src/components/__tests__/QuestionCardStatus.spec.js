import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import QuestionCard from "../survey/QuestionCard.vue";

describe("Issue #23: Question card status and actionable error copy", () => {
  it("after a valid answer, there is no role=alert and only the answered state", async () => {
    const question = {
      question_code: "q_business_name",
      label_en: "Enterprise Name",
      field_type: "Data",
      is_mandatory: 1,
    };

    // Card starts with a required error from form submission attempt
    const wrapper = mount(QuestionCard, {
      props: {
        question,
        modelValue: "Shree Ganesh Textiles",
        errorMessage: "This field is required",
      },
    });

    // When valid modelValue is present, the required error must be suppressed
    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(false);

    // Answered badge must be present
    expect(wrapper.text()).toContain("Answered");
  });

  it("an empty required question reads 'Choose a district' instead of generic 'This field is required'", () => {
    const question = {
      question_code: "q_district",
      label_en: "District",
      field_type: "Select",
      options: ["Jaipur", "Jodhpur", "Kota"],
      is_mandatory: 1,
    };

    const wrapper = mount(QuestionCard, {
      props: {
        question,
        modelValue: "",
        errorMessage: "This field is required",
      },
    });

    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toBe("Choose a district");
    expect(alert.text()).not.toBe("This field is required");
  });

  it("an empty required text question reads 'Enter entrepreneur name'", () => {
    const question = {
      question_code: "q_entrepreneur",
      label_en: "Q2. Entrepreneur Name",
      field_type: "Data",
      is_mandatory: 1,
    };

    const wrapper = mount(QuestionCard, {
      props: {
        question,
        modelValue: "",
        errorMessage: "This field is required",
      },
    });

    const alert = wrapper.find('[role="alert"]');
    expect(alert.exists()).toBe(true);
    expect(alert.text()).toBe("Enter entrepreneur name");
  });
});
