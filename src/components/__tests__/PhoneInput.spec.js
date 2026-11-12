import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import QuestionCard from "../survey/QuestionCard.vue";

describe("Issue #22: Phone field validation and mobile inputmode", () => {
  it("renders type=tel and inputmode=tel for Phone question", () => {
    const question = {
      question_code: "q_phone_number",
      label_en: "Mobile Phone Number",
      field_type: "Phone",
      is_mandatory: 1,
    };

    const wrapper = mount(QuestionCard, {
      props: {
        question,
        modelValue: "",
      },
    });

    const input = wrapper.find("input");
    expect(input.exists()).toBe(true);
    expect(input.attributes("type")).toBe("tel");
    expect(input.attributes("inputmode")).toBe("tel");
  });

  it("shows error and does not save when letters are entered in phone field", async () => {
    const question = {
      question_code: "q_phone_number",
      label_en: "Mobile Phone Number",
      field_type: "Phone",
      is_mandatory: 1,
    };

    const wrapper = mount(QuestionCard, {
      props: {
        question,
        modelValue: "",
      },
    });

    const input = wrapper.find("input[type='tel']");
    expect(input.exists()).toBe(true);

    await input.setValue("12abc");

    // Must not emit update:modelValue for invalid phone
    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeFalsy();

    // Must display validation error
    const err = wrapper.find('[role="alert"]');
    expect(err.exists()).toBe(true);
    expect(err.text()).toContain("Enter a 10-digit mobile number");
  });

  it("saves and clears error when valid 10-digit number is entered", async () => {
    const question = {
      question_code: "q_phone_number",
      label_en: "Mobile Phone Number",
      field_type: "Phone",
      is_mandatory: 1,
    };

    const wrapper = mount(QuestionCard, {
      props: {
        question,
        modelValue: "",
      },
    });

    const input = wrapper.find("input[type='tel']");
    await input.setValue("9876543210");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    expect(emitted[0]).toEqual(["9876543210"]);

    const err = wrapper.find('[role="alert"]');
    expect(err.exists()).toBe(false);
  });
});
