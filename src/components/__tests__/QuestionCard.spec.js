import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import QuestionCard from "../survey/QuestionCard.vue";

describe("QuestionCard - Phone Validation and Input Handling", () => {
  const phoneQuestion = {
    question_code: "respondent_phone",
    label_en: "Q5. Respondent Phone Number",
    field_type: "Text",
    is_mandatory: true,
  };

  it("renders specialized numeric phone input when question is a phone question", () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: phoneQuestion,
        modelValue: "",
      },
    });

    const phoneInput = wrapper.find('input[type="tel"]');
    expect(phoneInput.exists()).toBe(true);
    expect(phoneInput.attributes("inputmode")).toBe("numeric");
    expect(phoneInput.attributes("maxlength")).toBe("10");
    expect(wrapper.text()).toContain("📞");
  });

  it("filters out non-numeric characters on input", async () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: phoneQuestion,
        modelValue: "",
      },
    });

    const phoneInput = wrapper.find('input[type="tel"]');
    // Simulate user typing letters, spaces, and numbers
    await phoneInput.setValue("98ab-76# 54");

    const emitted = wrapper.emitted("update:modelValue");
    expect(emitted).toBeTruthy();
    // Only numeric digits should be emitted
    expect(emitted[emitted.length - 1][0]).toBe("987654");
  });

  it("normalizes pasted phone numbers with +91 country code or leading 0 to 10 digits", async () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: phoneQuestion,
        modelValue: "",
      },
    });

    const phoneInput = wrapper.find('input[type="tel"]');

    // Case 1: Pasting +91 98765 43210
    await phoneInput.setValue("+91 98765 43210");
    let emitted = wrapper.emitted("update:modelValue");
    expect(emitted[emitted.length - 1][0]).toBe("9876543210");

    // Case 2: Pasting 09876543210
    await phoneInput.setValue("09876543210");
    emitted = wrapper.emitted("update:modelValue");
    expect(emitted[emitted.length - 1][0]).toBe("9876543210");
  });

  it("displays live digit count and signals completion on 10 digits", async () => {
    const wrapper = mount(QuestionCard, {
      props: {
        question: phoneQuestion,
        modelValue: "98765",
      },
    });

    expect(wrapper.text()).toContain("5/10 digits");

    // Update to 10 digits
    await wrapper.setProps({ modelValue: "9876543210" });
    expect(wrapper.text()).toContain("✓ 10 digits entered");
    expect(wrapper.text()).toContain("Answered");
  });
});
