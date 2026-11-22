import { describe, it, expect } from "vitest";
import { COMPARISON_FALLBACK, answerNumber, comparisonError, comparisonRule } from "../answerComparison";
import { useTranslation } from "../../composables/useTranslation";

// #159: a number answer checked against another, from the rule in a question's Validation Rules (JSON)
const expenses = (operator, extra = {}) => ({
  question_code: "q_expenses",
  validation_rules: { min: 0, compare_to: "q_income", operator, message: "Check expenses against income", ...extra },
});

describe("answer comparisons (#159)", () => {
  it("reads a rule only when it names the other question and an operator", () => {
    expect(comparisonRule(expenses("lte"))).toMatchObject({ compare_to: "q_income", operator: "lte" });
    expect(comparisonRule({ validation_rules: { min: 0, max: 7 } })).toBeNull();
    expect(comparisonRule({ validation_rules: { compare_to: "q_income" } })).toBeNull();
    expect(comparisonRule({ validation_rules: { operator: "lte" } })).toBeNull();
    expect(comparisonRule({})).toBeNull();
    // the old singular key was never in the compiled schema
    expect(comparisonRule({ validation_rule: { compare_to: "q_income", operator: "lte" } })).toBeNull();
  });

  it("compares with lte, gte and eq", () => {
    const at = (operator, a, b) => comparisonError(expenses(operator), { q_expenses: a, q_income: b });
    expect([at("lte", "5", "6"), at("lte", "6", "6"), at("lte", "7", "6")]).toEqual(["", "", "Check expenses against income"]);
    expect([at("gte", "5", "6"), at("gte", "6", "6"), at("gte", "7", "6")]).toEqual(["Check expenses against income", "", ""]);
    expect([at("eq", "5", "6"), at("eq", "6", "6"), at("eq", "6.0", "6")]).toEqual(["Check expenses against income", "", ""]);
  });

  it("compares numbers, not text", () => {
    // as text "10" sorts before "9"
    expect(comparisonError(expenses("lte"), { q_expenses: "10", q_income: "9" })).toBe("Check expenses against income");
    expect(comparisonError(expenses("lte"), { q_expenses: 9, q_income: 10 })).toBe("");
  });

  it("waits until both answers are numbers", () => {
    for (const blank of [undefined, null, "", "  ", "12,000", "₹500", "abc"]) {
      expect(comparisonError(expenses("lte"), { q_expenses: "900", q_income: blank })).toBe("");
      expect(comparisonError(expenses("gte"), { q_expenses: blank, q_income: "900" })).toBe("");
    }
    // a 0 income is an answer
    expect(comparisonError(expenses("lte"), { q_expenses: "900", q_income: "0" })).toBe("Check expenses against income");
  });

  it("checks nothing for an operator it does not know", () => {
    // an object's own keys only: "constructor" is on every object and would throw
    for (const operator of ["lt", "constructor", "toString", "hasOwnProperty", "__proto__"]) {
      expect(comparisonError(expenses(operator), { q_expenses: "9", q_income: "1" }), operator).toBe("");
    }
  });

  it("shows the message picked for the surveyor's language, or a stock one when the rule has none", () => {
    const answers = { q_expenses: "9", q_income: "1" };
    const hindi = (rule) => rule.message_hi;
    expect(comparisonError(expenses("lte", { message_hi: "खर्च जाँचें" }), answers, hindi)).toBe("खर्च जाँचें");
    // a template submitted before #159 was never checked for a message
    expect(comparisonError(expenses("lte", { message: undefined }), answers)).toBe(COMPARISON_FALLBACK);
    expect(comparisonError(expenses("lte", { message: "" }), answers)).toBe(COMPARISON_FALLBACK);
    expect(comparisonError(expenses("lte"), answers, hindi)).toBe(COMPARISON_FALLBACK);
    // QuestionCard shows it through __(), and the field app starts in Hindi
    expect(useTranslation().__(COMPARISON_FALLBACK)).toBe("यह उत्तर पहले दिए गए उत्तर से मेल नहीं खाता");
  });

  it("reads plain numbers only", () => {
    expect(["0", "-3", "+4", "2.5", ".5", "5.", "1e3", " 7 "].map(answerNumber)).toEqual([0, -3, 4, 2.5, 0.5, 5, 1000, 7]);
    expect(["", "1,000", "12 kg", "0x10", "Infinity", "--1", "."].map(answerNumber)).toEqual(Array(7).fill(null));
  });
});
