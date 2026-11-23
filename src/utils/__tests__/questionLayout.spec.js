import { describe, it, expect } from "vitest";
import { gridsByCode, groupHeading, isMatrixQuestion, layoutQuestions, parentGrid, splitQuestionNumber } from "../questionLayout";

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

describe("splitQuestionNumber", () => {
  it("splits a label into its number and its text", () => {
    expect(splitQuestionNumber("Q3a. Cows")).toEqual({ number: "Q3a", text: "Cows" });
    expect(splitQuestionNumber("Q3 Cows")).toEqual({ number: "Q3", text: "Cows" });
    expect(splitQuestionNumber("12. Village")).toEqual({ number: "12", text: "Village" });
    expect(splitQuestionNumber("b. - Age")).toEqual({ number: "b", text: "Age" });
  });

  it("gives a label with no number a null number, without its leading punctuation", () => {
    expect(splitQuestionNumber("गाँव का नाम")).toEqual({ number: null, text: "गाँव का नाम" });
    expect(splitQuestionNumber(": Village ")).toEqual({ number: null, text: "Village" });
    expect(splitQuestionNumber(undefined)).toEqual({ number: null, text: "" });
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
    const [alone] = layoutQuestions(run, { __: (text) => `hi:${text}` });
    expect(alone.title).toBe("hi:Breakdown table");
  });

  // #165: a heading is in the surveyor's language, while runs are still found by the authored label
  it("titles a group in the surveyor's language", () => {
    const t = { __: (text) => `hi:${text}`, getQuestionLabel: (x) => `label:${x.question_code}` };
    const [titled] = layoutQuestions([q("cows", "Q3a. Cows", { group_title: "Herd size" }), q("buffaloes", "Q3b. Buffaloes")], t);
    expect(titled.title).toBe("hi:Herd size");
    const [numbered] = layoutQuestions([q("cows", "Q3a. Cows"), q("buffaloes", "Q3b. Buffaloes")], t);
    expect(numbered.title).toBe("Q3");
    const [, afterLead] = layoutQuestions([q("lead", "Who owns the shop?"), q("a_share", "a. Own share"), q("b_share", "b. Partner share")], t);
    expect(afterLead.title).toBe("label:lead");
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

  it("gives a run whose group_code names its grid its own code, so the two cards never share an id (#140)", () => {
    const linked = sourcing.map((x) => ({ ...x, group_code: "activity_involvements", group_title: "Where you buy" }));
    const items = layoutQuestions([grid("Dynamic Grid"), ...linked]);
    expect(items.map((x) => x.type)).toEqual(["matrix", "group"]);
    expect(items[1].group_code).toBe("group_source_nearby_town_pct");
    expect(items[1].title).toBe("Where you buy");
    const lettered = [q("q3a", "Q3a. Cows", { group_code: "activity_involvements" }), q("q3b", "Q3b. Goats")];
    expect(layoutQuestions([grid("Dynamic Grid"), ...lettered])[1].group_code).toBe("group_Q3");
  });

  it("keeps a group_code that names no question of the section", () => {
    const own = sourcing.map((x) => ({ ...x, group_code: "sourcing" }));
    expect(layoutQuestions([grid("Dynamic Grid"), ...own])[1].group_code).toBe("sourcing");
  });

  it("draws a grid followed by a label that opens with a one-letter word as two cards (#140)", () => {
    const items = layoutQuestions([grid("Dynamic Grid"), q("owner", "I am the owner")]);
    expect(items.map((x) => x.type)).toEqual(["matrix", "single"]);
  });
});

describe("gridsByCode", () => {
  it("is the section's matrix questions by question_code, and nothing else", () => {
    const activity = q("activity_involvements", "Activity Involvements", { field_type: "Dynamic Grid" });
    const herd = q("herd", "Herd", { control_variant: "Matrix" });
    const grids = gridsByCode([activity, q("lead", "Who owns the shop?"), herd]);
    expect([...grids.keys()]).toEqual(["activity_involvements", "herd"]);
    expect(grids.get("herd")).toBe(herd);
    expect(gridsByCode(undefined).size).toBe(0);
  });
});

describe("parentGrid", () => {
  const activity = q("activity_involvements", "Activity Involvements", { field_type: "Dynamic Grid" });
  const lead = q("lead", "Who owns the shop?");

  it("is the grid the question's group_code names (#140)", () => {
    const share = q("a_share", "a. Own share", { group_code: "activity_involvements" });
    expect(parentGrid(share, gridsByCode([activity, share]))).toBe(activity);
  });

  it("is never read off the shape of a label", () => {
    const share = q("a_share", "a. Own share");
    expect(parentGrid(share, gridsByCode([activity, share]))).toBeNull();
  });

  it("is nothing when the group_code names no grid of the section, or the question itself", () => {
    expect(parentGrid(q("a_share", "a. Own share", { group_code: "lead" }), gridsByCode([lead]))).toBeNull();
    expect(parentGrid(q("a_share", "a. Own share", { group_code: "elsewhere" }), gridsByCode([activity]))).toBeNull();
    const selfLinked = { ...activity, group_code: "activity_involvements" };
    expect(parentGrid(selfLinked, gridsByCode([selfLinked]))).toBeNull();
    expect(parentGrid(q("a_share", "a. Own share", { group_code: "activity_involvements" }), undefined)).toBeNull();
  });
});
