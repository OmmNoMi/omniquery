import { describe, it, expect } from "vitest";
import { answerNumber, comparisonError, comparisonRule } from "../answerComparison";

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
    expect(comparisonError(expenses("lt"), { q_expenses: "9", q_income: "1" })).toBe("");
  });

  it("reads plain numbers only", () => {
    expect(["0", "-3", "+4", "2.5", ".5", "5.", "1e3", " 7 "].map(answerNumber)).toEqual([0, -3, 4, 2.5, 0.5, 5, 1000, 7]);
    expect(["", "1,000", "12 kg", "0x10", "Infinity", "--1", "."].map(answerNumber)).toEqual(Array(7).fill(null));
  });
});
