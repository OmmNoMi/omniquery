import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import FSwitch from "../common/FSwitch.vue";
import FCurrencyInput from "../common/FCurrencyInput.vue";
import FRangeSlider from "../common/FRangeSlider.vue";
import QuestionCard from "../survey/QuestionCard.vue";
import GroupedQuestionCard from "../survey/GroupedQuestionCard.vue";
import MatrixQuestionCard from "../survey/MatrixQuestionCard.vue";
import { useTranslation } from "../../composables/useTranslation";

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

  // Each choice group is named by its question and says whether it is required (#19)
  describe("Survey choice groups (#19)", () => {
    const district = { question_code: "q_district", label_en: "District", field_type: "Select", options: ["Jaipur", "Jodhpur", "Kota"], is_mandatory: 1 };
    const sectors = { question_code: "q_sectors", label_en: "Business Sectors", field_type: "MultiSelect", options: ["Retail", "Manufacturing", "Services"], is_mandatory: 1 };
    const mountCard = (question, props = {}) => mount(QuestionCard, { props: { question, modelValue: "", ...props } });

    it("names a single choice by its question and marks it required", () => {
      const wrapper = mountCard(district);
      const label = wrapper.find("#q_label_q_district");
      expect(label.text()).toContain("District");
      // the label's asterisk is not read out as part of the name
      expect(label.find("span").attributes("aria-hidden")).toBe("true");
      const radiogroup = wrapper.find('[role="radiogroup"]');
      expect(radiogroup.attributes("aria-labelledby")).toBe("q_label_q_district");
      expect(radiogroup.attributes("aria-label")).toBeUndefined();
      expect(radiogroup.attributes("aria-required")).toBe("true");
      expect(radiogroup.attributes("aria-invalid")).toBe("false");
    });

    it("does not mark an optional choice required", () => {
      const radiogroup = mountCard({ ...district, is_mandatory: 0 }).find('[role="radiogroup"]');
      expect(radiogroup.attributes("aria-required")).toBe("false");
    });

    it("ties a single choice's help text and validation error to the group", () => {
      const wrapper = mountCard({ ...district, description: "Where the enterprise is registered" }, { errorMessage: "This field is required" });
      const radiogroup = wrapper.find('[role="radiogroup"]');
      expect(radiogroup.attributes("aria-describedby")).toBe("q_desc_q_district");
      expect(radiogroup.attributes("aria-invalid")).toBe("true");
      expect(radiogroup.attributes("aria-errormessage")).toBe("q_err_q_district");
      expect(wrapper.find("#q_err_q_district").exists()).toBe(true);
    });

    it("says a multi-select is required and invalid through its description, as a group allows", () => {
      const wrapper = mountCard(sectors, { modelValue: [], errorMessage: "This field is required" });
      const group = wrapper.find('[role="group"]');
      expect(group.attributes("aria-labelledby")).toBe("q_label_q_sectors");
      // ARIA 1.2 gives a group neither aria-required nor aria-invalid
      expect(group.attributes("aria-required")).toBeUndefined();
      expect(group.attributes("aria-invalid")).toBeUndefined();
      expect(group.attributes("aria-describedby")).toBe("q_req_q_sectors q_err_q_sectors");
      const required = wrapper.find("#q_req_q_sectors");
      expect(required.text()).toBe(useTranslation().__("Required"));
      expect(required.classes()).toContain("sr-only");
    });

    it("does not describe an optional multi-select as required", () => {
      const wrapper = mountCard({ ...sectors, is_mandatory: 0 }, { modelValue: [] });
      expect(wrapper.find('[role="group"]').attributes("aria-describedby")).toBeUndefined();
      expect(wrapper.find("#q_req_q_sectors").exists()).toBe(false);
    });

    it("names a sub-question's choices by its label, without the asterisk, and ties its error", () => {
      const group = {
        group_code: "g_operations",
        label_en: "Operations Group",
        questions: [{ question_code: "q_sub_1", label_en: "Operating Status", field_type: "Select", options: ["Active", "Inactive"], is_mandatory: 1 }],
      };
      const wrapper = mount(GroupedQuestionCard, { props: { group, responses: {}, validationErrors: { q_sub_1: "This field is required" } } });
      const radiogroup = wrapper.find('[role="radiogroup"]');
      expect(radiogroup.attributes("aria-labelledby")).toBe("sub_label_q_sub_1");
      expect(radiogroup.attributes("aria-label")).toBeUndefined();
      expect(radiogroup.attributes("aria-required")).toBe("true");
      expect(radiogroup.attributes("aria-errormessage")).toBe("sub_err_q_sub_1");
      expect(wrapper.find("#sub_err_q_sub_1").text()).toBe("This field is required");
      expect(wrapper.find("#sub_label_q_sub_1 span").attributes("aria-hidden")).toBe("true");
    });

    it("names a scale's tap pills and a rating by the question, and marks them required", () => {
      const scale = mountCard({ question_code: "q_confidence", label_en: "Confidence in bookkeeping", field_type: "Range", is_mandatory: 1 });
      const pills = scale.find('[role="radiogroup"]');
      expect(pills.attributes("aria-label")).toBe("Confidence in bookkeeping");
      expect(pills.attributes("aria-required")).toBe("true");

      const rating = mountCard({ question_code: "q_meeting", label_en: "SHG meeting quality", field_type: "Rating", is_mandatory: 1 });
      const stars = rating.find('[role="radiogroup"]');
      expect(stars.attributes("aria-label")).toBe("SHG meeting quality");
      expect(stars.attributes("aria-required")).toBe("true");
    });

    it("names every matrix cell by its row and column, in both layouts", () => {
      const matrix = {
        question_code: "q_herd",
        label_en: "Herd by season",
        field_type: "Matrix",
        columns: [
          { key: "count", label: "Count", type: "number" },
          { key: "value", label: "Value", type: "currency" },
          { key: "breed", label: "Breed", type: "select", options: ["Gir", "Sahiwal"] },
          { key: "notes", label: "Notes", type: "text" },
        ],
        rows: [{ id: "summer", label: "Summer" }],
      };
      const wrapper = mount(MatrixQuestionCard, { props: { question: matrix, modelValue: {} } });
      for (const layout of ["table", "cards"]) {
        const names = wrapper.findAll(`[data-matrix-layout=${layout}] [data-cell]`).map((c) => c.attributes("aria-label"));
        expect(names, layout).toEqual(["Summer, Count", "Summer, Value", "Summer, Breed", "Summer, Notes"]);
      }
    });
  });
});
