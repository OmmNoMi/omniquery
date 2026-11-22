import { describe, it, expect } from "vitest";
import { groupHeading, isMatrixQuestion, layoutQuestions, parentGrid } from "../questionLayout";

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

  // #140: the SHG survey's activity grid was swallowed by the sourcing questions after it: they took
  // its place under its title, and the grid itself was never drawn
  const grid = (field_type) => q("activity_involvements", "Activity Involvements", { field_type });
  const sourcing = [
    q("source_nearby_town_pct", "a. Nearby town/district (%)"),
    q("source_wholesale_in_state_pct", "b. Wholesale market in the state (%)"),
    q("source_wholesale_out_state_pct", "c. Wholesale market outside the state (%)"),
    q("source_online_pct", "d. Order online (Amazon/Meesho) (%)"),
  ];

  for (const field_type of ["Dynamic Grid", "Table"]) {
    it(`draws a ${field_type} before a lettered run as its own card, and the run apart (#140)`, () => {
      const items = layoutQuestions([grid(field_type), ...sourcing, q("marketing_methods", "Q8. How do you sell?")]);
      expect(items.map((x) => x.type)).toEqual(["matrix", "group", "single"]);
      expect(items[0].question.question_code).toBe("activity_involvements");
      expect(items[1].questions.map((x) => x.question_code)).toEqual(sourcing.map((x) => x.question_code));
      expect(items[1].title).toBe("Breakdown table");
    });
  }

  it("draws a grid followed by a label that opens with a one-letter word as two cards (#140)", () => {
    const items = layoutQuestions([grid("Dynamic Grid"), q("owner", "I am the owner")]);
    expect(items.map((x) => x.type)).toEqual(["matrix", "single"]);
  });
});

describe("parentGrid", () => {
  const activity = q("activity_involvements", "Activity Involvements", { field_type: "Dynamic Grid" });
  const lead = q("lead", "Who owns the shop?");

  it("is the grid the question's group_code names (#140)", () => {
    const share = q("a_share", "a. Own share", { group_code: "activity_involvements" });
    expect(parentGrid(share, [activity, share])).toBe(activity);
  });

  it("is never read off the shape of a label", () => {
    const share = q("a_share", "a. Own share");
    expect(parentGrid(share, [activity, share])).toBeNull();
  });

  it("is nothing when the group_code names no grid of the section, or the question itself", () => {
    expect(parentGrid(q("a_share", "a. Own share", { group_code: "lead" }), [lead])).toBeNull();
    expect(parentGrid(q("a_share", "a. Own share", { group_code: "elsewhere" }), [activity])).toBeNull();
    expect(parentGrid(activity, [{ ...activity, group_code: "activity_involvements" }])).toBeNull();
    expect(parentGrid({ ...activity, group_code: "activity_involvements" }, [activity])).toBeNull();
  });
});
