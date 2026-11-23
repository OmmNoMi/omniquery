import { describe, it, expect } from "vitest";
import { gridsByCode, groupHeading, inDisplayOrder, isMatrixQuestion, layoutQuestions, parentGrid } from "../questionLayout";

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

describe("inDisplayOrder (#169)", () => {
  const row = (question_code, display_order, extra = {}) => ({ question_code, section_code: "SEC_A", display_order, ...extra });
  const codes = (schema) => schema.questions.map((question) => question.question_code);

  it("puts questions saved out of place back in their Order, as the SHG survey's Section A was", () => {
    const saved = [row("q6", 6), row("q9", 9), row("q7", 7), row("q8", 8), row("q15", 15), row("q18", 18), row("q16", 16)];
    expect(codes(inDisplayOrder({ questions: saved, sections: [] }))).toEqual(["q6", "q7", "q8", "q9", "q15", "q16", "q18"]);
  });

  it("orders the sections by their Order too", () => {
    const sections = [{ section_code: "B", display_order: 2 }, { section_code: "A", display_order: 1 }];
    expect(inDisplayOrder({ sections, questions: [] }).sections.map((s) => s.section_code)).toEqual(["A", "B"]);
  });

  it("keeps the template's row order between rows that share an Order, as new rows all start at 1", () => {
    const saved = [row("c", 1), row("a", 1), row("b", 1), row("first", 0.5)];
    expect(codes(inDisplayOrder({ questions: saved }))).toEqual(["first", "c", "a", "b"]);
  });

  it("leaves a row with no Order in its own place, as the compiler gives it its idx", () => {
    const saved = [row("one", undefined), row("two", null), row("four", "4"), row("three", 3)];
    expect(codes(inDisplayOrder({ questions: saved }))).toEqual(["one", "two", "three", "four"]);
  });

  it("gives a row with no Order its row number from 1, as the compiler's idx, so a row ordered there comes first", () => {
    const saved = [row("ordered_2", 2), row("second_row", undefined)];
    expect(codes(inDisplayOrder({ questions: saved }))).toEqual(["ordered_2", "second_row"]);
  });

  it("returns a new schema and leaves the one it was given, and what it cannot order, alone", () => {
    const saved = [row("b", 2), row("a", 1)];
    const schema = { title: "Survey", questions: saved };
    const ordered = inDisplayOrder(schema);
    expect(ordered).not.toBe(schema);
    expect(ordered.title).toBe("Survey");
    expect(codes(schema)).toEqual(["b", "a"]);
    expect(inDisplayOrder(null)).toBe(null);
    expect(inDisplayOrder({ title: "Empty" })).toEqual({ title: "Empty", sections: undefined, questions: undefined });
  });
});
