import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FSwitch from "../common/FSwitch.vue";
import FCurrencyInput from "../common/FCurrencyInput.vue";
import FRangeSlider from "../common/FRangeSlider.vue";
import QuestionCard from "../survey/QuestionCard.vue";

describe("Gate 2: Accessibility Invariants (WCAG 2.2 AA)", () => {
  describe("FSwitch", () => {
    it("renders role switch with accessible name and id", () => {
      const wrapper = mount(FSwitch, {
        props: {
          id: "switch_1",
          modelValue: true,
          ariaLabel: "Is enterprise registered?",
          ariaDescribedby: "desc_1",
        },
      });

      const button = wrapper.find("button[role='switch']");
      expect(button.exists()).toBe(true);
      expect(button.attributes("id")).toBe("switch_1");
      expect(button.attributes("aria-label")).toBe("Is enterprise registered?");
      expect(button.attributes("aria-checked")).toBe("true");
      expect(button.attributes("aria-describedby")).toBe("desc_1");
    });
  });

  describe("FCurrencyInput", () => {
    it("associates input id and provides accessible quick increment chips", () => {
      const wrapper = mount(FCurrencyInput, {
        props: {
          id: "curr_input_1",
          modelValue: 5000,
          ariaLabel: "Monthly Revenue",
          ariaDescribedby: "curr_desc_1",
          increments: [100, 500, 1000],
        },
      });

      const input = wrapper.find("input[type='number']");
      expect(input.exists()).toBe(true);
      expect(input.attributes("id")).toBe("curr_input_1");
      expect(input.attributes("aria-label")).toBe("Monthly Revenue");
      expect(input.attributes("aria-describedby")).toBe("curr_desc_1");

      const chips = wrapper.findAll("div[role='toolbar'] button");
      expect(chips.length).toBeGreaterThanOrEqual(3);
      expect(chips[0].attributes("aria-label")).toContain("100");
    });
  });

  describe("FRangeSlider", () => {
    it("exposes slider range values and accessible ARIA attributes", () => {
      const wrapper = mount(FRangeSlider, {
        props: {
          id: "slider_1",
          format: "slider",
          min: 0,
          max: 10,
          step: 1,
          modelValue: 5,
          unit: "Years",
          ariaLabel: "Years of Experience",
        },
      });

      const rangeInput = wrapper.find("input[type='range']");
      expect(rangeInput.exists()).toBe(true);
      expect(rangeInput.attributes("id")).toBe("slider_1");
      expect(rangeInput.attributes("aria-label")).toBe("Years of Experience");
      expect(rangeInput.attributes("aria-valuemin")).toBe("0");
      expect(rangeInput.attributes("aria-valuemax")).toBe("10");
      expect(rangeInput.attributes("aria-valuenow")).toBe("5");
      expect(rangeInput.attributes("aria-valuetext")).toContain("5 Years");
    });
  });

  describe("QuestionCard", () => {
    it("programmatically links label for to input id and associates description and error", () => {
      const question = {
        question_code: "q_business_name",
        label_en: "Enterprise Business Name",
        description: "Official trade name as per Udyam or GST certificate",
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

      const label = wrapper.find("label");
      expect(label.attributes("for")).toBe("q_input_q_business_name");

      const input = wrapper.find("#q_input_q_business_name");
      expect(input.exists()).toBe(true);
      expect(input.attributes("aria-describedby")).toBe("q_desc_q_business_name");
      expect(input.attributes("aria-invalid")).toBe("true");
      expect(input.attributes("aria-errormessage")).toBe("q_err_q_business_name");

      const desc = wrapper.find("#q_desc_q_business_name");
      expect(desc.exists()).toBe(true);

      const err = wrapper.find("#q_err_q_business_name");
      expect(err.exists()).toBe(true);
      expect(err.attributes("role")).toBe("alert");
    });
  });
});
