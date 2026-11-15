import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles";

// Copy and dialog rules (#44): frappe-ui Dialog and toast instead of native browser dialogs,
// no internal jargon in user-facing strings, no __("x") || "x" fallbacks, sentence-case labels.

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);

// Existing Title Case labels per file. New code must use sentence case, and a file may only go down.
// Lower a count when you fix a label; the sweep of the rest is on ROADMAP.md.
export const TITLE_CASE_ALLOWLIST = {
  "src/App.vue": 3,
  "src/components/common/FCurrencyInput.vue": 2,
  "src/components/common/FRangeSlider.vue": 1,
  "src/components/dashboard/FilledFormsModal.vue": 15,
  "src/components/dashboard/ProjectHeaderCard.vue": 5,
  "src/components/dashboard/SurveyorDashboard.vue": 9,
  "src/components/header/CompactHeader.vue": 15,
  "src/components/project/ProjectPage.vue": 23,
  "src/components/survey/FocusModeModal.vue": 5,
  "src/components/survey/GroupedQuestionCard.vue": 1,
  "src/components/survey/MatrixQuestionCard.vue": 11,
  "src/components/survey/QuestionCard.vue": 14,
  "src/components/survey/SectionCard.vue": 1,
  "src/composables/useSession.js": 1,
  "src/composables/useSurveyApp.js": 2,
  "src/views/Catalog.vue": 6,
  "src/views/Success.vue": 2,
};

const isComment = (line) => /^\s*(\/\/|\*|\/\*)/.test(line);

// window.confirm( / globalThis.alert( / prompt( — but not toast.confirm(, show_alert( or confirmExit(
const NATIVE_DIALOG = /(?:\b(?:window|globalThis|self)\s*\.\s*|(?:^|[^.\w$]))(?:confirm|alert|prompt)\s*\(/;

export function nativeDialogCalls(source) {
  return source
    .split("\n")
    .map((text, i) => ({ text, line: i + 1 }))
    .filter(({ text }) => !isComment(text) && NATIVE_DIALOG.test(text));
}

// every string literal passed to __()
const TRANSLATED = /__\(\s*(["'`])((?:\\.|(?!\1).)*)\1/g;

export function translatedStrings(source) {
  return [...source.matchAll(TRANSLATED)].map((m) => m[2]);
}

// Product names and acronyms keep their capitals in sentence case.
const PROPER_NOUNS = new Set(["OmniQuery", "Frappe", "Desk", "Hindi", "English", "IST", "Mon", "Sat", "AM", "PM"]);

// A label is Title Case when a word after the first starts with a capital and is not a name or acronym.
// Prose is skipped (it ends in . or ! or holds more than one sentence), and so is a word that opens
// a bracket: both start fresh, so their capitals are not Title Case.
export function isTitleCase(text) {
  if (/[.!]\s*$/.test(text) || /[.!?]\s+\S/.test(text)) return false;
  return text
    .split(/[\s/]+/)
    .filter((word) => /[A-Za-z]/.test(word))
    .slice(1)
    .filter((word) => !word.startsWith("("))
    .map((word) => word.replace(/^[^A-Za-z]+|[^A-Za-z]+$/g, ""))
    .some((word) => /^[A-Z][a-z]/.test(word) && !PROPER_NOUNS.has(word));
}

describe("Copy and dialog rules (#44)", () => {
  const files = getSourceFiles(path.join(appDir, "src"));
  const read = (file) => fs.readFileSync(file, "utf8");

  it("found source files in src/", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("uses frappe-ui Dialog and toast, never native confirm(), alert() or prompt()", () => {
    const hits = files.flatMap((file) =>
      nativeDialogCalls(read(file)).map(({ line, text }) => `${rel(file)}:${line}: ${text.trim()}`),
    );
    expect(hits, `Native browser dialogs found:\n${hits.join("\n")}`).toEqual([]);
  });

  it("catches window., globalThis. and bare native dialog calls, but not methods or comments", () => {
    for (const call of ["confirm('x')", "window.confirm('x')", "globalThis.alert('x')", "if (prompt('x'))", '@click="alert(1)"'])
      expect(nativeDialogCalls(call), call).toHaveLength(1);
    for (const safe of ["toast.confirm('x')", "frappe.show_alert('x')", "confirmExit()", "// alert('x')", " * confirm(x)"])
      expect(nativeDialogCalls(safe), safe).toEqual([]);
  });

  it("keeps the internal term WAL out of user-facing strings", () => {
    const hits = files.flatMap((file) =>
      translatedStrings(read(file))
        .filter((text) => /\bWAL\b/.test(text))
        .map((text) => `${rel(file)}: ${text}`),
    );
    expect(hits, `Jargon in translated strings:\n${hits.join("\n")}`).toEqual([]);
  });

  it("has no __('x') || 'x' fallbacks: __() already returns the source string", () => {
    const fallback = /__\(\s*(["'`])(?:\\.|(?!\1).)*\1[^)]*\)\s*\|\|\s*["'`]/;
    const hits = files.flatMap((file) =>
      read(file)
        .split("\n")
        .map((text, i) => ({ text, line: i + 1 }))
        .filter(({ text }) => !isComment(text) && fallback.test(text))
        .map(({ line, text }) => `${rel(file)}:${line}: ${text.trim()}`),
    );
    expect(hits, `Redundant fallbacks:\n${hits.join("\n")}`).toEqual([]);
  });

  it("adds no new Title Case labels (sentence case, as #44 set out)", () => {
    const over = files
      .map((file) => [rel(file), translatedStrings(read(file)).filter(isTitleCase)])
      .filter(([file, labels]) => labels.length > (TITLE_CASE_ALLOWLIST[file] || 0))
      .map(([file, labels]) => `${file}: ${labels.length} > ${TITLE_CASE_ALLOWLIST[file] || 0} (${labels.join(" | ")})`);
    expect(over, `Use sentence case for new labels:\n${over.join("\n")}`).toEqual([]);
  });

  it("tells Title Case from sentence case", () => {
    for (const label of ["Discard Saved Draft?", "Text Size", "Sync Now", "Yes / No", "Manage Profile & Credentials"])
      expect(isTitleCase(label), label).toBe(true);
    for (const label of [
      "Discard saved draft?",
      "Text size",
      "Open OmniQuery Desk",
      "Export JSON",
      "-- Select --",
      "Monthly income (Net profit)",
      "Survey synced to server successfully!",
      "Saved offline. Return to the survey list?",
      "{0} pending responses",
    ])
      expect(isTitleCase(label), label).toBe(false);
  });
});
