import { describe, it, expect } from "vitest";
import { groupHeading, isMatrixQuestion, layoutQuestions } from "../questionLayout";

const q = (question_code, label_en, extra = {}) => ({ question_code, label_en, field_type: "Text", ...extra });

describe("isMatrixQuestion", () => {
  it("is true for a grid, a table, a matrix field or the Matrix control variant", () => {
    expect(isMatrixQuestion({ field_type: "Matrix" })).toBe(true);
    expect(isMatrixQuestion({ field_type: "Dynamic Grid" })).toBe(true);
    expect(isMatrixQuestion({ field_type: "table" })).toBe(true);
    expect(isMatrixQuestion({ field_type: "Text", control_variant: "Matrix" })).toBe(true);
  });

  it("never reads the question code, so one client's codes make nothing a matrix (#14)", () => {
    for (const code of ["seasonal_turnovers", "activity_involvements", "capital_sources", "loan_usages"]) {
      expect(isMatrixQuestion({ field_type: "Text", question_code: code })).toBe(false);
    }
    expect(isMatrixQuestion({ field_type: "Single Choice (Radio)", control_variant: "Rating" })).toBe(false);
    expect(isMatrixQuestion(null)).toBe(false);
  });
});

describe("groupHeading", () => {
  it("takes the code and title the template sets on the first question", () => {
    expect(groupHeading({ group_code: "herd", group_title: "Herd size" }, "group_Q3", "Q3")).toEqual({
      group_code: "herd",
      title: "Herd size",
    });
  });

  it("falls back to what the survey already shows when the template sets neither", () => {
    expect(groupHeading({}, "group_Q3", "Q3")).toEqual({ group_code: "group_Q3", title: "Q3" });
  });
});

describe("layoutQuestions", () => {
  it("titles a Q-number run from the template, with no invented description (#14)", () => {
    const [group] = layoutQuestions([
      q("cows", "Q3a. Cows", { group_title: "Herd size", group_code: "herd" }),
      q("buffaloes", "Q3b. Buffaloes"),
    ]);
    expect(group).toMatchObject({ type: "group", group_code: "herd", title: "Herd size", number: "Q3", description: "" });
    expect(group.questions.map((x) => x.question_code)).toEqual(["cows", "buffaloes"]);
  });

  it("names an untitled Q-number run by its number, never by its codes", () => {
    const [group] = layoutQuestions([q("q1a_member_name", "Q1a. Name"), q("q1b_member_age", "Q1b. Age")]);
    expect(group).toMatchObject({ group_code: "group_Q1", title: "Q1", description: "" });
  });

  it("names an untitled lettered run after the question before it, else Breakdown table", () => {
    const run = [q("a_share", "a. Own share"), q("b_share", "b. Partner share")];
    const [, afterLead] = layoutQuestions([q("lead", "Who owns the shop?"), ...run]);
    expect(afterLead).toMatchObject({ type: "group", group_code: "group_a_share", title: "Who owns the shop?" });
    const [alone] = layoutQuestions(run, (text) => `hi:${text}`);
    expect(alone.title).toBe("hi:Breakdown table");
  });

  it("puts a matrix question on its own matrix card and the rest on single cards", () => {
    const items = layoutQuestions([q("grid", "Sources", { field_type: "Matrix" }), q("note", "Notes")]);
    expect(items.map((x) => x.type)).toEqual(["matrix", "single"]);
  });
});
