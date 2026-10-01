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

  describe("TDD++ Invariants: Invalid State, Orange Card & ID, and Hover Tooltip", () => {
    it("renders orange card, orange ID badge, and Invalid badge with missing digits tooltip when input is incomplete (090)", async () => {
      const wrapper = mount(QuestionCard, {
        props: {
          question: phoneQuestion,
          modelValue: "090",
        },
      });

      // 1. Helper text reports digit count
      expect(wrapper.text()).toContain("3/10 digits");

      // 2. Card container has orange classes (border-amber-300, bg-amber-50/40, border-l-amber-500)
      const card = wrapper.find("[data-question-card]");
      expect(card.classes()).toContain("border-amber-300");
      expect(card.classes()).toContain("bg-amber-50/40");
      expect(card.classes()).toContain("border-l-amber-500");

      // 3. Question ID badge (Q5) turns orange
      const idBadge = wrapper.find("span.font-mono");
      expect(idBadge.classes()).toContain("border-amber-400");
      expect(idBadge.classes()).toContain("bg-amber-100");
      expect(idBadge.classes()).toContain("text-amber-900");
      expect(idBadge.text()).toBe("Q5");

      // 4. Invalid badge is shown instead of Answered
      const invalidBadge = wrapper.find('[data-testid="invalid-badge"]');
      expect(invalidBadge.exists()).toBe(true);
      expect(invalidBadge.text()).toContain("Invalid");
      expect(wrapper.find('[data-testid="answered-badge"]').exists()).toBe(false);

      // 5. Hover tooltip exists and contains exact missing digits message
      const tooltip = wrapper.find('[data-testid="invalid-tooltip"]');
      expect(tooltip.exists()).toBe(true);
      expect(tooltip.text()).toContain("Missing 7 digits (3/10 entered)");
      expect(invalidBadge.attributes("title")).toBe("Missing 7 digits (3/10 entered)");
    });

    it("renders orange card and Invalid badge when 10 digits start with 0 (0902348908)", async () => {
      const wrapper = mount(QuestionCard, {
        props: {
          question: phoneQuestion,
          modelValue: "0902348908",
        },
      });

      // Card & ID badge stay orange
      const card = wrapper.find("[data-question-card]");
      expect(card.classes()).toContain("border-amber-300");
      const idBadge = wrapper.find("span.font-mono");
      expect(idBadge.classes()).toContain("border-amber-400");

      // Invalid badge shown with leading zero explanation
      const invalidBadge = wrapper.find('[data-testid="invalid-badge"]');
      expect(invalidBadge.exists()).toBe(true);
      expect(invalidBadge.attributes("title")).toBe("Phone number cannot start with 0");

      const tooltip = wrapper.find('[data-testid="invalid-tooltip"]');
      expect(tooltip.text()).toContain("Phone number cannot start with 0");
    });

    it("dynamically transitions from orange Invalid to green Answered when 10 valid digits are typed", async () => {
      const wrapper = mount(QuestionCard, {
        props: {
          question: phoneQuestion,
          modelValue: "9876",
        },
      });

      // Initial incomplete state: orange
      expect(wrapper.find('[data-testid="invalid-badge"]').exists()).toBe(true);
      expect(wrapper.find("[data-question-card]").classes()).toContain("border-amber-300");

      // User finishes entering 10 valid digits
      await wrapper.setProps({ modelValue: "9876543210" });

      // State transitions to completed: green
      expect(wrapper.find('[data-testid="invalid-badge"]').exists()).toBe(false);
      const answeredBadge = wrapper.find('[data-testid="answered-badge"]');
      expect(answeredBadge.exists()).toBe(true);
      expect(answeredBadge.text()).toContain("Answered");

      const card = wrapper.find("[data-question-card]");
      expect(card.classes()).toContain("bg-[#edf3ef]");
      expect(card.classes()).toContain("border-[#d2dfd6]");

      const idBadge = wrapper.find("span.font-mono");
      expect(idBadge.classes()).toContain("border-emerald-300/80");
      expect(idBadge.classes()).toContain("text-emerald-800");
    });

    it("remains neutral and does not show Invalid badge when empty and untouched", () => {
      const wrapper = mount(QuestionCard, {
        props: {
          question: phoneQuestion,
          modelValue: "",
        },
      });

      const card = wrapper.find("[data-question-card]");
      expect(card.classes()).toContain("bg-white");
      expect(card.classes()).not.toContain("border-amber-300");

      const idBadge = wrapper.find("span.font-mono");
      expect(idBadge.classes()).toContain("bg-slate-100");
      expect(idBadge.classes()).not.toContain("border-amber-400");

      expect(wrapper.find('[data-testid="invalid-badge"]').exists()).toBe(false);
      expect(wrapper.find('[data-testid="answered-badge"]').exists()).toBe(false);
    });

    it("displays orange Invalid state when external errorMessage prop is supplied", () => {
      const wrapper = mount(QuestionCard, {
        props: {
          question: phoneQuestion,
          modelValue: "",
          errorMessage: "This field is required",
        },
      });

      expect(wrapper.find("[data-question-card]").classes()).toContain("border-amber-300");
      expect(wrapper.find("span.font-mono").classes()).toContain("border-amber-400");

      const invalidBadge = wrapper.find('[data-testid="invalid-badge"]');
      expect(invalidBadge.exists()).toBe(true);
      expect(invalidBadge.attributes("title")).toBe("This field is required");

      const tooltip = wrapper.find('[data-testid="invalid-tooltip"]');
      expect(tooltip.text()).toContain("This field is required");
    });
  });
});
