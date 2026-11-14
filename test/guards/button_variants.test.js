import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { classTokens, elementClasses, elementProp, getSourceFiles, namedImports, templateElements } from "./sourceFiles";
import { choiceButtonProps } from "../../src/utils/choiceButton";

// Button colours come from variant and theme. frappe-ui Button puts its own colour classes
// (subtle/gray by default) on the same element as a class prop, and in the built CSS its
// bg-surface-* and text-ink-* tokens come later and win: a Button styled "bg-emerald-600
// text-white" renders white text on near-white, about 1.1:1 (focus mode, the section footer and
// selected answers all did). Pick the look with variant (solid, subtle, outline, ghost) and theme
// (gray, blue, green, red); for an answer choice use choiceButtonProps in src/utils/choiceButton.js.
// Keep theme gray. frappe-ui builds only gray from its light/dark tokens in every variant: green's
// subtle, outline and ghost text is a fixed text-green-800, which is 1.5:1 on its own dark-mode
// background, solid green is 3.1:1 in light mode, and blue and red hover with fixed colours too.
// Solid red (bg-surface-red-5, text-ink-white) is tokens, so it stays for destructive actions.
// Existing uses per file are counted below. New code adds none, and a file may only go down:
// lower its count when you move a Button to variant and theme. The rest are on ROADMAP.md.

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);

export const BUTTON_COLOR_ALLOWLIST = {
  "src/App.vue": 4,
  "src/components/common/FCombobox.vue": 5,
  "src/components/common/FCurrencyInput.vue": 2,
  "src/components/common/FRating.vue": 1,
  "src/components/common/FSwitch.vue": 1,
  "src/components/dashboard/FilledFormsModal.vue": 22,
  "src/components/dashboard/ProjectHeaderCard.vue": 6,
  "src/components/dashboard/SurveyorDashboard.vue": 4,
  "src/components/header/CompactHeader.vue": 15,
  "src/components/project/ProjectPage.vue": 9,
  "src/components/survey/GroupedQuestionCard.vue": 3,
  "src/components/survey/MatrixQuestionCard.vue": 6,
  "src/views/Catalog.vue": 3,
  "src/views/Success.vue": 4,
};

const PALETTE =
  "white|black|transparent|current|slate|gray|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose|surface|ink|outline";
// a colour utility, under any variant prefix (hover:, dark:, sm:) and with or without `!`
const COLOR_CLASS = new RegExp(`^(?:[\\w-]+:)*!?(?:bg|text|border(?:-[trblxy])?|ring|divide)-(?:\\[#|(?:${PALETTE})(?:-|$|/))`);

export const colorClasses = (classText) => classTokens(classText).filter((t) => COLOR_CLASS.test(t));

// the frappe-ui Button elements in a .vue file, under whatever name it was imported as, plus any
// `extraTags` (components that pass their attributes on to a Button)
function buttonElements(source, extraTags = []) {
  const buttonNames = [...namedImports(source, "frappe-ui")].filter(([, exported]) => exported === "Button").map(([local]) => local);
  const tags = [...buttonNames, ...extraTags];
  if (!tags.length) return [];
  return templateElements(source).filter((node) => tags.includes(node.tag));
}

// A component whose template puts v-bind="$attrs" on a frappe-ui Button (SurveyModeMenu): a theme
// on it lands on that Button. Named by file, which is how the app names its component tags.
export const forwardsAttrsToButton = (source) =>
  buttonElements(source).some((node) => node.props.some((p) => p.type === 7 && p.name === "bind" && !p.arg && p.exp?.content === "$attrs"));

// frappe-ui Buttons in a .vue file that carry colour classes: [{ line, classes }]
export function coloredButtons(source) {
  return buttonElements(source)
    .map((node) => ({ line: node.loc.start.line, classes: colorClasses(elementClasses(node)) }))
    .filter((hit) => hit.classes.length);
}

// frappe-ui Buttons whose theme can be anything but gray, or red on a solid Button: [{ line, theme }]
export function nonGrayThemes(source, buttonWrappers = []) {
  return buttonElements(source, buttonWrappers)
    .map((node) => ({ line: node.loc.start.line, theme: elementProp(node, "theme"), variant: elementProp(node, "variant") }))
    .filter(({ theme, variant }) => /\b(green|blue)\b/.test(theme) || (/\bred\b/.test(theme) && variant !== "solid"))
    .map(({ line, theme }) => ({ line, theme }));
}

describe("Button colours come from variant and theme", () => {
  const files = getSourceFiles(path.join(appDir, "src"), [".vue"]);

  it("found source files in src/", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("adds no colour classes to a frappe-ui Button (use variant and theme)", () => {
    const over = files
      .map((file) => [rel(file), coloredButtons(fs.readFileSync(file, "utf8"))])
      .filter(([file, hits]) => hits.length > (BUTTON_COLOR_ALLOWLIST[file] || 0))
      .map(([file, hits]) => `${file}: ${hits.length} > ${BUTTON_COLOR_ALLOWLIST[file] || 0}\n${hits.map((h) => `  line ${h.line}: ${h.classes.join(" ")}`).join("\n")}`);
    expect(over, `Buttons with colour classes:\n${over.join("\n")}`).toEqual([]);
  });

  it("keeps the allowlist exact, so a fixed file lowers its count", () => {
    const stale = Object.entries(BUTTON_COLOR_ALLOWLIST)
      .map(([file, allowed]) => [file, allowed, fs.existsSync(path.join(appDir, file)) ? coloredButtons(fs.readFileSync(path.join(appDir, file), "utf8")).length : 0])
      .filter(([, allowed, found]) => found < allowed)
      .map(([file, allowed, found]) => `${file}: allowlist says ${allowed}, found ${found}`);
    expect(stale, `Lower these counts:\n${stale.join("\n")}`).toEqual([]);
  });

  it("keeps every Button on theme gray, or solid red for a destructive action", () => {
    const wrappers = files.filter((file) => forwardsAttrsToButton(fs.readFileSync(file, "utf8"))).map((file) => path.basename(file, ".vue"));
    expect(wrappers, "SurveyModeMenu passes its attributes to a Button").toContain("SurveyModeMenu");
    const off = files
      .flatMap((file) => nonGrayThemes(fs.readFileSync(file, "utf8"), wrappers).map((hit) => `${rel(file)}:${hit.line} theme ${hit.theme}`));
    expect(off, `Use theme gray (see the note at the top of this file):\n${off.join("\n")}`).toEqual([]);
    for (const selected of [true, false]) expect(choiceButtonProps(selected).theme).toBe("gray");
  });

  it("finds a non-gray theme, static or bound, and allows solid red", () => {
    const sfc = (template) => `<template>${template}</template><script setup>import { Button as B } from "frappe-ui";</script>`;
    expect(nonGrayThemes(sfc(`<B variant="subtle" theme="green"/>`))).toEqual([{ line: 1, theme: "green" }]);
    expect(nonGrayThemes(sfc(`<B :theme="on ? 'blue' : 'gray'"/>`))).toHaveLength(1);
    expect(nonGrayThemes(sfc(`<B variant="outline" theme="red"/>`))).toHaveLength(1);
    expect(nonGrayThemes(sfc(`<B variant="solid" theme="red"/><B theme="gray"/><B/>`))).toEqual([]);
    // a component that hands its attributes to a Button counts; a frappe-ui Badge (tokens) does not
    expect(nonGrayThemes(sfc(`<ModeMenu theme="green"/><Badge theme="green"/>`), ["ModeMenu"])).toEqual([{ line: 1, theme: "green" }]);
    expect(forwardsAttrsToButton(sfc(`<B v-bind="$attrs" :label="x"/>`))).toBe(true);
    expect(forwardsAttrsToButton(sfc(`<B v-bind="props"/><div v-bind="$attrs"/>`))).toBe(false);
  });

  it("finds colour classes on Button under any local name, prefix or branch, and nothing else", () => {
    const sfc = (template, script = `import { Button } from "frappe-ui";`) => `<template>${template}</template><script setup>${script}</script>`;
    expect(coloredButtons(sfc(`<Button class="bg-emerald-600 text-white"/>`))).toEqual([{ line: 1, classes: ["bg-emerald-600", "text-white"] }]);
    expect(coloredButtons(sfc(`<Btn :class="[on ? 'dark:hover:bg-[#1c2c22]' : '!text-slate-700']"/>`, `import { Button as Btn } from "frappe-ui";`))).toHaveLength(1);
    expect(coloredButtons(sfc(`<div v-if="a"></div><Button v-else class="border-emerald-500/60"/>`))).toHaveLength(1);
    expect(coloredButtons(sfc(`<Button class="bg-surface-gray-2"/>`))).toHaveLength(1);
    // layout, size and alignment classes are fine, and so are colours on other elements
    expect(coloredButtons(sfc(`<Button variant="solid" class="w-full !h-auto text-left text-xs rounded-xl border-2 shadow-md"/>`))).toEqual([]);
    expect(coloredButtons(sfc(`<div class="bg-emerald-600 text-white"><Button variant="solid"/></div>`))).toEqual([]);
    // a Button component that is not frappe-ui's is not checked
    expect(coloredButtons(sfc(`<Button class="bg-red-500"/>`, `import Button from "./MyButton.vue";`))).toEqual([]);
  });
});
