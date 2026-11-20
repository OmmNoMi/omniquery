import { describe, it, expect } from "vitest";
import { addsFact, textKey } from "../text";

describe("textKey", () => {
  it("ignores case, extra spaces and line breaks", () => {
    expect(textKey("  Clean   Water\nMission ")).toBe("clean water mission");
    expect(textKey(null)).toBe("");
    expect(textKey(undefined)).toBe("");
  });
});

describe("addsFact (#18)", () => {
  it("is false for empty text", () => {
    expect(addsFact("", "Clean Water Mission")).toBe(false);
    expect(addsFact("   ", "Clean Water Mission")).toBe(false);
    expect(addsFact(null)).toBe(false);
  });

  it("is false when a shown label is the same text", () => {
    expect(addsFact("clean water  mission", "Clean Water Mission")).toBe(false);
  });

  it("is false when a shown label already contains the text", () => {
    expect(addsFact("Rajasthan Grameen Aajeevika Vikas Parishad (RGAVP)", "Rajasthan Grameen Aajeevika Vikas Parishad (RGAVP) / SVEP")).toBe(false);
  });

  it("is true when the text says something new", () => {
    expect(addsFact("A study of micro-enterprises", "Clean Water Mission")).toBe(true);
    // the text containing a label is still new: it says more than the label
    expect(addsFact("Clean Water Mission, phase 2", "Clean Water Mission")).toBe(true);
  });

  it("checks every shown label and skips empty ones", () => {
    expect(addsFact("Baseline", "", "Household Baseline")).toBe(false);
    expect(addsFact("Baseline", "", null)).toBe(true);
  });
});
