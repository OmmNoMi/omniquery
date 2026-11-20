import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { getSourceFiles, templateElements, elementClassNames, selectedClasses, buildAppCss } from "./sourceFiles";

// A class in a template that no stylesheet defines does nothing, and nothing says so. `no-scrollbar`
// was written on two scroll strips but defined nowhere, so both showed a scrollbar (#142). And
// frappe-ui's preset (tailwind.config.cjs) replaces Tailwind's shadow, radius and colour scales, so
// Tailwind names such as `shadow-xs`, `rounded-3xl` and `bg-blue-950` build nothing here. Its palette
// stops at 900: only slate, emerald, amber and rose, which tailwind.config.cjs takes whole from
// Tailwind, have a 950. For blue, use frappe-ui's tokens (bg-surface-blue-1, border-outline-blue-1,
// text-ink-blue-3), which switch with the theme, or a shade up to 900.
//
// This builds the app's CSS the way the app does (Tailwind with tailwind.config.cjs over
// src/styles/main.css) and checks against it every class a template sets: the class attribute, a
// bound :class, and props that hand a class on (`panel-class`, `:inputClass`). It also checks the
// `*_CLASS` constants in src/**/*.js, which reach templates through v-bind spreads such as
// choiceButtonProps(). Class strings built anywhere else in a script aren't read.
// The build takes about a second and runs on every vitest run; a cached copy could go stale against
// the config or main.css, so it isn't kept.

const appDir = path.resolve(__dirname, "../..");
const require = createRequire(import.meta.url);
const rel = (file) => path.relative(appDir, file);

// Marker classes that build no CSS of their own: Tailwind reads them through group-*/peer-* variants.
const MARKERS = /^(?:group|peer)(?:\/[\w-]+)?$/;

// The dead classes each file has today, by name and count: #145 tracks fixing them (and ROADMAP.md).
// New code adds none, a class can't be swapped for another one, and a fixed class comes off the list.
export const DEAD_CLASS_ALLOWLIST = {
  "src/App.vue": { "shadow-xs": 2 },
  "src/components/common/FCombobox.vue": { "dark:bg-blue-950/60": 1, "dark:bg-blue-950/90": 1, "shadow-2xs": 1, "shadow-xs": 4, "text-blue-950": 1 },
  "src/components/common/FCurrencyInput.vue": { "shadow-xs": 1 },
  "src/components/common/FRangeSlider.vue": { "shadow-inner": 1, "shadow-xs": 1 },
  "src/components/dashboard/FilledFormsModal.vue": { "animate-fade-in": 2, "dark:bg-blue-950": 1, "rounded-3xl": 1, "shadow-2xs": 4, "shadow-xs": 10 },
  "src/components/dashboard/ProjectHeaderCard.vue": { "shadow-xs": 1 },
  "src/components/dashboard/SurveyorDashboard.vue": { "dark:bg-blue-950/30": 1, "dark:bg-blue-950/40": 1, "shadow-2xs": 7, "shadow-xs": 4 },
  "src/components/header/CompactHeader.vue": { "shadow-2xs": 3, "shadow-xs": 4 },
  "src/components/project/ProjectPage.vue": { "animate-fade-in": 1, "rounded-3xl": 2, "shadow-xs": 3 },
  "src/components/project/ProjectSurveyList.vue": { "rounded-3xl": 2, "shadow-2xs": 2, "shadow-xs": 1 },
  "src/components/survey/GroupedQuestionCard.vue": { "shadow-2xs": 5, "shadow-xs": 2 },
  "src/components/survey/MatrixQuestionCard.vue": { "shadow-2xs": 7, "shadow-xs": 3 },
  "src/components/survey/QuestionCard.vue": { "shadow-2xs": 4, "shadow-xs": 1 },
  "src/components/survey/SectionCard.vue": { "pb-safe": 1, "shadow-2xs": 1, "shadow-xs": 1 },
  "src/components/survey/SurveyModeMenu.vue": { "dropdown-content": 1 },
  "src/views/Catalog.vue": { "shadow-2xs": 2, "shadow-xs": 3 },
  "src/views/Success.vue": { "shadow-2xs": 1, "shadow-xs": 2 },
};

// Class names in a .vue file's template that `known` doesn't have: ["shadow-xs", ...]
export function deadClasses(source, known) {
  return templateElements(source)
    .flatMap(elementClassNames)
    .filter((name) => !known.has(name) && !MARKERS.test(name));
}

// How many times each name comes up: ["x", "x", "y"] gives { x: 2, y: 1 }
const countNames = (names) => names.reduce((counts, name) => ({ ...counts, [name]: (counts[name] || 0) + 1 }), {});

// Where the counts in `more` go past those in `less`: ["shadow-xs: 3 > 2"]
export function overAllowlist(more, less = {}) {
  return Object.entries(more)
    .filter(([name, n]) => n > (less[name] || 0))
    .map(([name, n]) => `${name}: ${n} > ${less[name] || 0}`);
}

// The class names in the `export const X_CLASS = "..."` constants of a .js file
export const classConstants = (source) => [...source.matchAll(/export const \w+_CLASS = "([^"]*)"/g)].flatMap((m) => m[1].split(/\s+/).filter(Boolean));

describe("Every class a template sets is defined", async () => {
  const known = selectedClasses(await buildAppCss());
  const files = getSourceFiles(path.join(appDir, "src"), [".vue"]);
  const found = Object.fromEntries(files.map((file) => [rel(file), deadClasses(fs.readFileSync(file, "utf8"), known)]));

  it("built the app's CSS, frappe-ui's preset and main.css included", () => {
    expect(known).toContain("bg-surface-blue-1"); // frappe-ui preset
    expect(known).toContain("choice-selected"); // main.css
    expect(known).toContain("dark:bg-slate-950"); // tailwind.config.cjs extends slate
    expect(known).not.toContain("bg-blue-950");
    // the globs are read from tailwind.config.cjs's folder, so a build from any cwd finds the templates
    expect(require(path.join(appDir, "tailwind.config.cjs")).content.relative).toBe(true);
  });

  it("adds no class that builds nothing", () => {
    const over = Object.entries(found)
      .map(([file, dead]) => [file, overAllowlist(countNames(dead), DEAD_CLASS_ALLOWLIST[file])])
      .filter(([, extra]) => extra.length)
      .map(([file, extra]) => `${file}: ${extra.join(", ")}`);
    expect(over, `Classes nothing defines (see the note at the top of this file):\n${over.join("\n")}`).toEqual([]);
  });

  it("keeps the allowlist exact, so a fixed class comes off it", () => {
    const stale = Object.entries(DEAD_CLASS_ALLOWLIST)
      .map(([file, allowed]) => [file, overAllowlist(allowed, countNames(found[file] || []))])
      .filter(([, extra]) => extra.length)
      .map(([file, extra]) => `${file}: allowlist > found for ${extra.join(", ")}`);
    expect(stale, `Lower these counts:\n${stale.join("\n")}`).toEqual([]);
  });

  it("defines the class constants that templates get through v-bind spreads", () => {
    const dead = getSourceFiles(path.join(appDir, "src"), [".js"])
      .flatMap((file) => classConstants(fs.readFileSync(file, "utf8")).filter((name) => !known.has(name)).map((name) => `${rel(file)}: ${name}`));
    expect(classConstants(fs.readFileSync(path.join(appDir, "src/utils/choiceButton.js"), "utf8"))).toContain("choice-selected");
    expect(dead).toEqual([]);
  });

  it("reads static and bound classes, and skips markers and conditions", () => {
    const known = new Set(["a", "b", "c", "d", "hover:e"]);
    const sfc = (attrs) => `<template><div ${attrs}></div></template>`;
    expect(deadClasses(sfc(`class="a group peer/row x"`), known)).toEqual(["x"]);
    expect(deadClasses(sfc(`:class="[tone === 'warn' ? 'a y' : 'b', { 'c z': on, hidden: off }, on && 'w', \`d \${on ? 'v' : ''}\`]"`), known))
      .toEqual(["y", "z", "hidden", "w", "v"]);
    expect(deadClasses(sfc(`:class="\`bg-\${tone}-50 hover:e text-\${on ? 'red' : 'blue'}\`"`), known)).toEqual([]);
    expect(deadClasses(sfc(`panel-class="a u" :inputClass="on ? 'b' : 't'" title="s"`), known)).toEqual(["u", "t"]);
  });

  it("counts each dead class by name against the allowlist", () => {
    expect(countNames(["x", "x", "y"])).toEqual({ x: 2, y: 1 });
    expect(overAllowlist({ x: 2, y: 1 }, { x: 2, y: 1 })).toEqual([]);
    expect(overAllowlist({ x: 2, z: 1 }, { x: 2, y: 1 })).toEqual(["z: 1 > 0"]); // y swapped for z
    expect(overAllowlist({ x: 3 }, { x: 2 })).toEqual(["x: 3 > 2"]);
    expect(classConstants(`export const A_CLASS = "p q";\nexport const b = "r";`)).toEqual(["p", "q"]);
  });

  it("unescapes the class names a stylesheet selects", () => {
    const names = selectedClasses(`.hover\\:bg-x:hover, .shadow-\\[0_0_8px_rgba\\(1\\2c 2\\2c 3\\)\\] > .a { color: red }`);
    expect([...names]).toEqual(["hover:bg-x", "shadow-[0_0_8px_rgba(1,2,3)]", "a"]);
  });
});
