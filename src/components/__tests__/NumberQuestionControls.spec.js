import { describe, it, expect } from "vitest";
import { mount } from "@vue/test-utils";
import QuestionCard from "../survey/QuestionCard.vue";
import FCurrencyInput from "../common/FCurrencyInput.vue";
import FRangeSlider from "../common/FRangeSlider.vue";
import FRating from "../common/FRating.vue";

// #159: an answer comparison is a number check, so every field type the server lets a rule compare
// (NUMBER_FIELD_TYPES in omniquery/services/answer_comparisons.py) must take a number on the device.
const card = (field_type, extra = {}) =>
  mount(QuestionCard, { props: { question: { question_code: "q_amount", label_en: "Amount", field_type, ...extra }, modelValue: "" } });

describe("a number question takes a number (#159)", () => {
  it("an Integer is a whole-number input", () => {
    const input = card("Integer").find("input");
    expect(input.attributes("type")).toBe("number");
    expect(input.attributes("step")).toBeUndefined();
  });

  it("a Decimal takes any fraction", () => {
    const input = card("Decimal").find("input");
    expect(input.attributes("type")).toBe("number");
    expect(input.attributes("step")).toBe("any");
  });

  it("a Currency (INR) is the currency input, or a number input when its label reads as an age", () => {
    expect(card("Currency (INR)").findComponent(FCurrencyInput).exists()).toBe(true);
    const wages = card("Currency (INR)", { label_en: "Monthly wages" });
    expect(wages.findComponent(FCurrencyInput).exists()).toBe(false);
    expect(wages.find("input").attributes("type")).toBe("number");
  });

  it("a Range (Slider) is the slider and a Rating (1-5) is the stars", () => {
    expect(card("Range (Slider)").findComponent(FRangeSlider).exists()).toBe(true);
    expect(card("Rating (1-5)").findComponent(FRating).exists()).toBe(true);
  });

  it("a Text question is still free text", () => {
    expect(card("Text").find("input").attributes("type")).toBe("text");
  });
});
