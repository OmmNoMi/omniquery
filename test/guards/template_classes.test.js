import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwind from "tailwindcss";
import { getSourceFiles, templateElements, elementClassNames } from "./sourceFiles";

// A class in a template that no stylesheet defines does nothing, and nothing says so. `no-scrollbar`
// was written on two scroll strips but defined nowhere, so both showed a scrollbar (#142). And
// frappe-ui's preset (tailwind.config.cjs) replaces Tailwind's shadow, radius and colour scales, so
// Tailwind names such as `shadow-xs`, `rounded-3xl` and `bg-blue-950` build nothing here.
// This builds the app's CSS the way the app does (Tailwind with tailwind.config.cjs over
// src/styles/main.css) and checks every class a template sets against it. Existing dead classes
// per file are counted below. New code adds none, and a file may only go down. The rest are on
// ROADMAP.md.

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);

// Marker classes that build no CSS of their own: Tailwind reads them through group-*/peer-* variants.
const MARKERS = /^(?:group|peer)(?:\/[\w-]+)?$/;

export const DEAD_CLASS_ALLOWLIST = {
  "src/App.vue": 2,
  "src/components/common/FCombobox.vue": 8,
  "src/components/common/FCurrencyInput.vue": 1,
  "src/components/common/FRangeSlider.vue": 2,
  "src/components/dashboard/FilledFormsModal.vue": 18,
  "src/components/dashboard/ProjectHeaderCard.vue": 1,
  "src/components/dashboard/SurveyorDashboard.vue": 13,
  "src/components/header/CompactHeader.vue": 7,
  "src/components/project/ProjectPage.vue": 6,
  "src/components/project/ProjectSurveyList.vue": 5,
  "src/components/survey/GroupedQuestionCard.vue": 7,
  "src/components/survey/MatrixQuestionCard.vue": 10,
  "src/components/survey/QuestionCard.vue": 5,
  "src/components/survey/SectionCard.vue": 3,
  "src/components/survey/SurveyModeMenu.vue": 1,
  "src/views/Catalog.vue": 5,
  "src/views/Success.vue": 3,
};

// Every class name a stylesheet selects, unescaped: `.hover\:bg-x:hover` gives "hover:bg-x", and
// Tailwind's `\2c ` (a comma in an arbitrary value) gives ",".
const ESCAPE = /\\(?:([0-9a-fA-F]{1,6}) ?|(.))/g;
export function selectedClasses(css) {
  const names = new Set();
  postcss.parse(css).walkRules((rule) => {
    for (const m of rule.selector.matchAll(/\.((?:\\[0-9a-fA-F]{1,6} ?|\\.|[\w-])+)/g)) {
      names.add(m[1].replace(ESCAPE, (_, hex, char) => (hex ? String.fromCodePoint(parseInt(hex, 16)) : char)));
    }
  });
  return names;
}

// Class names in a .vue file's template that `known` doesn't have: ["shadow-xs", ...]
export function deadClasses(source, known) {
  return templateElements(source)
    .flatMap(elementClassNames)
    .filter((name) => !known.has(name) && !MARKERS.test(name));
}

describe("Every class a template sets is defined", async () => {
  const mainCss = path.join(appDir, "src/styles/main.css");
  const built = await postcss([tailwind(path.join(appDir, "tailwind.config.cjs"))]).process(fs.readFileSync(mainCss, "utf8"), { from: mainCss });
  const known = selectedClasses(built.css);
  const files = getSourceFiles(path.join(appDir, "src"), [".vue"]);
  const found = Object.fromEntries(files.map((file) => [rel(file), deadClasses(fs.readFileSync(file, "utf8"), known)]));

  it("built the app's CSS, frappe-ui's preset and main.css included", () => {
    expect(known).toContain("bg-surface-blue-1"); // frappe-ui preset
    expect(known).toContain("choice-selected"); // main.css
    expect(known).toContain("dark:bg-slate-950"); // tailwind.config.cjs extends slate
    expect(known).not.toContain("bg-blue-950");
  });

  it("adds no class that builds nothing", () => {
    const over = Object.entries(found)
      .filter(([file, dead]) => dead.length > (DEAD_CLASS_ALLOWLIST[file] || 0))
      .map(([file, dead]) => `${file}: ${dead.length} > ${DEAD_CLASS_ALLOWLIST[file] || 0}: ${dead.join(" ")}`);
    expect(over, `Classes nothing defines (see the note at the top of this file):\n${over.join("\n")}`).toEqual([]);
  });

  it("keeps the allowlist exact, so a fixed file lowers its count", () => {
    const stale = Object.entries(DEAD_CLASS_ALLOWLIST)
      .filter(([file, allowed]) => (found[file] || []).length < allowed)
      .map(([file, allowed]) => `${file}: allowlist says ${allowed}, found ${(found[file] || []).length}`);
    expect(stale, `Lower these counts:\n${stale.join("\n")}`).toEqual([]);
  });

  it("reads static and bound classes, and skips markers and conditions", () => {
    const known = new Set(["a", "b", "c", "d", "hover:e"]);
    const sfc = (attrs) => `<template><div ${attrs}></div></template>`;
    expect(deadClasses(sfc(`class="a group peer/row x"`), known)).toEqual(["x"]);
    expect(deadClasses(sfc(`:class="[tone === 'warn' ? 'a y' : 'b', { 'c z': on, hidden: off }, on && 'w', \`d \${on ? 'v' : ''}\`]"`), known))
      .toEqual(["y", "z", "hidden", "w", "v"]);
    expect(deadClasses(sfc(`:class="\`bg-\${tone}-50 hover:e text-\${on ? 'red' : 'blue'}\`"`), known)).toEqual([]);
  });

  it("unescapes the class names a stylesheet selects", () => {
    const names = selectedClasses(`.hover\\:bg-x:hover, .shadow-\\[0_0_8px_rgba\\(1\\2c 2\\2c 3\\)\\] > .a { color: red }`);
    expect([...names]).toEqual(["hover:bg-x", "shadow-[0_0_8px_rgba(1,2,3)]", "a"]);
  });
});
