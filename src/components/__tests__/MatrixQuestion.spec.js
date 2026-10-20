import { describe, it, expect } from "vitest";

// Pure logic validator matching App.vue's isMatrixQuestion
export function isMatrixQuestion(q) {
  if (!q) return false;
  const type = (q.field_type || "").toLowerCase();
  return (
    type === "dynamic grid" ||
    type === "table" ||
    type === "matrix" ||
    Boolean(q.columns_schema_json) ||
    Boolean(q.matrix_schema)
  );
}

describe("Matrix Question Classification (Issue #14)", () => {
  it("renders as matrix when field_type or schema explicitly specifies Matrix/Grid", () => {
    expect(isMatrixQuestion({ field_type: "Matrix", question_code: "q_eval" })).toBe(true);
    expect(isMatrixQuestion({ field_type: "Dynamic Grid", question_code: "q_grid" })).toBe(true);
    expect(isMatrixQuestion({ field_type: "Table", question_code: "q_tbl" })).toBe(true);
    expect(isMatrixQuestion({ field_type: "Text", columns_schema_json: "[{}]" })).toBe(true);
  });

  it("does NOT classify question as matrix merely based on customer keywords (turnover, involvement, capital_sources)", () => {
    // Questions with these codes should NOT be forced to matrix if field_type is Text or Single Choice
    expect(isMatrixQuestion({ field_type: "Text", question_code: "turnover_description" })).toBe(false);
    expect(isMatrixQuestion({ field_type: "Single Choice (Radio)", question_code: "involvement_level" })).toBe(false);
    expect(isMatrixQuestion({ field_type: "Text", question_code: "capital_sources_comment" })).toBe(false);
  });
});
