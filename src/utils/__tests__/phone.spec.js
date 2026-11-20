import { describe, it, expect } from "vitest";
import { isPhoneQuestion, isValidMobile } from "../phone";

// #22: a respondent's mobile number. omniquery/tests/test_phone.py checks the server's copy of
// the same rule against the same values.
describe("a mobile number", () => {
  it("takes ten digits, with spaces, dashes, brackets and a +91, 91 or 0 in front", () => {
    for (const value of ["9876543210", " 9876543210 ", "98765 43210", "98765-43210", "(98765) 43210", "+91 98765 43210", "919876543210", "09876543210"]) {
      expect(isValidMobile(value), value).toBe(true);
    }
  });

  it("refuses too few or too many digits, letters, and an empty answer", () => {
    for (const value of ["98765", "987654321", "98765432101", "+1 98765 43210 1", "12abc", "98765abcde", "98765x43210", "98765 43210 ext", "", null, undefined, "919876543"]) {
      expect(isValidMobile(value), String(value)).toBe(false);
    }
  });

  it("is a question only when its template says field type Phone", () => {
    expect(isPhoneQuestion({ question_code: "respondent_phone", field_type: "Phone" })).toBe(true);
    expect(isPhoneQuestion({ question_code: "respondent_phone", field_type: "Text" })).toBe(false);
    expect(isPhoneQuestion({ question_code: "owns_smartphone", label_en: "Do you own a smartphone?", field_type: "Single Choice (Radio)" })).toBe(false);
    expect(isPhoneQuestion(null)).toBe(false);
  });
});
