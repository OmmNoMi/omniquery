import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles.js";

// Light-surface text in slate/gray/zinc 200 or 300 is under 2:1 on white, so it fails WCAG 2.2 AA
// (4.5:1). 400 is about 2.6:1 and still fails; the existing uses are capped per file below and
// may only shrink. A class counts unless its variant chain is dark: (dark:text-, dark:hover:text-).
// Lucide icons are decorative (aria-hidden), and FocusModeModal is a dark surface.
const root = path.resolve(__dirname, "../..");
const LIGHT_TEXT = /(?<![\w:-])((?:[\w-]+:)*)text-(?:slate|gray|zinc)-(200|300|400)\b/g;
const DARK_SURFACES = new Set(["src/components/survey/FocusModeModal.vue"]);

export const SHADE_400_ALLOWLIST = {
  "src/components/common/FCombobox.vue": 8,
  "src/components/common/FCurrencyInput.vue": 1,
  "src/components/dashboard/FilledFormsModal.vue": 3,
  "src/components/dashboard/ProjectHeaderCard.vue": 1,
  "src/components/project/ProjectPage.vue": 1,
  "src/components/survey/MatrixQuestionCard.vue": 4,
  "src/components/survey/QuestionCard.vue": 6,
  "src/components/survey/SectionCard.vue": 1,
  "src/views/Catalog.vue": 2,
  "src/views/Success.vue": 1,
};

function lucideIcons(content) {
  const names = new Set();
  for (const m of content.matchAll(/import\s*\{([^}]*)\}\s*from\s*["']lucide-vue-next["']/g)) {
    m[1].split(",").map((n) => n.trim().split(/\s+as\s+/).pop()).filter(Boolean).forEach((n) => names.add(n));
  }
  return names;
}

export function lightTextUses(content) {
  const icons = lucideIcons(content);
  const uses = [];
  for (const m of content.matchAll(LIGHT_TEXT)) {
    if (m[1].split(":").includes("dark")) continue;
    const tag = content.slice(0, m.index).match(/<([A-Za-z][\w-]*)[^<]*$/)?.[1];
    if (tag && icons.has(tag)) continue;
    const line = content.slice(0, m.index).split("\n").length;
    uses.push({ shade: m[2], line, text: m[0] });
  }
  return uses;
}

describe("Static Architectural Guard: Accessible Text Contrast (WCAG 2.2 AA) (#49)", () => {
  const files = getSourceFiles(path.join(root, "src"), [".vue"])
    .map((f) => path.relative(root, f))
    .filter((rel) => !DARK_SURFACES.has(rel));
  const usesByFile = Object.fromEntries(files.map((rel) => [rel, lightTextUses(fs.readFileSync(path.join(root, rel), "utf-8"))]));

  it("forbids 200 and 300 text shades on light surfaces", () => {
    const violations = Object.entries(usesByFile).flatMap(([rel, uses]) =>
      uses.filter((u) => u.shade !== "400").map((u) => `${rel}:${u.line} ${u.text}`)
    );
    expect(violations, `low-contrast text, use 500 or darker:\n${violations.join("\n")}`).toEqual([]);
  });

  it("does not add 400 text shades beyond the shrinking allowlist", () => {
    const over = Object.entries(usesByFile)
      .map(([rel, uses]) => [rel, uses.filter((u) => u.shade === "400")])
      .filter(([rel, uses]) => uses.length > (SHADE_400_ALLOWLIST[rel] || 0))
      .map(([rel, uses]) => `${rel}: ${uses.length} > ${SHADE_400_ALLOWLIST[rel] || 0} (${uses.map((u) => u.line).join(", ")})`);
    expect(over, `text-*-400 is about 2.6:1 on white; use 500 or darker:\n${over.join("\n")}`).toEqual([]);
  });

  it("catches light text through hover and focus variants but not through dark:", () => {
    expect(lightTextUses('<p class="hover:text-slate-200">').map((u) => u.shade)).toEqual(["200"]);
    expect(lightTextUses('<p class="group-hover:text-gray-300">').map((u) => u.shade)).toEqual(["300"]);
    expect(lightTextUses('<p class="dark:text-slate-200 dark:hover:text-slate-300">')).toEqual([]);
    expect(lightTextUses('import { Star } from "lucide-vue-next";\n<Star\n  class="text-slate-300" />')).toEqual([]);
  });
});
