import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles";

// Readable text (#43). The smallest text is Tailwind's text-xs (12px). Arbitrary sizes under 12px,
// such as text-[10px] and text-[11px], are hard to read on a phone in the field.
// Existing uses per file are counted below. New code adds none, and a file may only go down:
// lower a count when you move a label to text-xs. The sweep of the rest is on ROADMAP.md.

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);

export const SMALL_TEXT_ALLOWLIST = {
  "src/App.vue": 2,
  "src/components/common/FCombobox.vue": 1,
  "src/components/dashboard/FilledFormsModal.vue": 6,
  "src/components/dashboard/ProjectHeaderCard.vue": 4,
  "src/components/dashboard/SurveyorDashboard.vue": 13,
  "src/components/header/CompactHeader.vue": 4,
  "src/components/project/ProjectPage.vue": 7,
  "src/components/survey/FocusModeModal.vue": 1,
  "src/components/survey/GroupedQuestionCard.vue": 5,
  "src/components/survey/MatrixQuestionCard.vue": 10,
  "src/components/survey/QuestionCard.vue": 12,
  "src/views/Catalog.vue": 2,
  "src/views/Success.vue": 2,
};

const ARBITRARY_SIZE = /(?<![\w-])text-\[(\d+(?:\.\d+)?)(px|rem)\]/g;

// every arbitrary text size under 12px in a source file
export function smallTextUses(source) {
  return [...source.matchAll(ARBITRARY_SIZE)]
    .filter((m) => (m[2] === "px" ? Number(m[1]) : Number(m[1]) * 16) < 12)
    .map((m) => m[0]);
}

describe("Readable text sizes (#43)", () => {
  const files = getSourceFiles(path.join(appDir, "src"));

  it("found source files in src/", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("adds no text under 12px (use text-xs)", () => {
    const over = files
      .map((file) => [rel(file), smallTextUses(fs.readFileSync(file, "utf8"))])
      .filter(([file, uses]) => uses.length > (SMALL_TEXT_ALLOWLIST[file] || 0))
      .map(([file, uses]) => `${file}: ${uses.length} > ${SMALL_TEXT_ALLOWLIST[file] || 0} (${uses.join(" ")})`);
    expect(over, `Text under 12px:\n${over.join("\n")}`).toEqual([]);
  });

  it("finds px and rem sizes under 12px, with any variant prefix", () => {
    expect(smallTextUses(`<p class="text-[10px] sm:text-[11px] md:text-[0.625rem]">`)).toHaveLength(3);
    expect(smallTextUses(`<p class="text-[12px] text-[0.75rem] text-xs text-[14px] context-[10px]">`)).toEqual([]);
  });
});
