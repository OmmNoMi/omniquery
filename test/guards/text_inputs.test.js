import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { classTokens, elementClasses, getSourceFiles, namedImports, templateElements } from "./sourceFiles";

// frappe-ui TextInput puts its class prop on the wrapper <div>, not on the <input>. So border,
// background, padding, height, rounding and text classes there draw a second box around frappe-ui's
// own input: the survey's text answers were a white bordered card holding a gray input with its own
// ring. Pick the look with TextInput's `variant` (subtle, outline, ghost) and `size` (sm, md, lg,
// xl), and keep the class prop to layout: width, margin, flex and grid placement, display.
// Existing uses per file are counted below. New code adds none, and a file may only go down.

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);

export const TEXT_INPUT_STYLE_ALLOWLIST = {
  "src/components/common/FCombobox.vue": 1,
  "src/components/common/FCurrencyInput.vue": 1,
  "src/components/common/FRangeSlider.vue": 1,
  "src/components/survey/GroupedQuestionCard.vue": 2,
  "src/components/survey/MatrixQuestionCard.vue": 6,
  "src/components/survey/QuestionCard.vue": 1,
};

// layout classes, under any responsive prefix (sm:, md:)
const LAYOUT = /^(?:(?:sm|md|lg|xl|2xl):)*(?:(?:min-|max-)?w-.+|-?m[trblxyse]?-.+|flex-.+|grow(?:-0)?|shrink(?:-0)?|basis-.+|order-.+|col-.+|row-.+|self-.+|justify-self-.+|block|inline-block|hidden|flex|contents)$/;

export const styleClasses = (classText) => classTokens(classText).filter((t) => !LAYOUT.test(t));

// frappe-ui TextInputs in a .vue file whose class carries more than layout: [{ line, classes }]
export function styledTextInputs(source) {
  const tags = [...namedImports(source, "frappe-ui")].filter(([, exported]) => exported === "TextInput").map(([local]) => local);
  if (!tags.length) return [];
  return templateElements(source)
    .filter((node) => tags.includes(node.tag))
    .map((node) => ({ line: node.loc.start.line, classes: styleClasses(elementClasses(node)) }))
    .filter((hit) => hit.classes.length);
}

describe("TextInput looks come from variant and size", () => {
  const files = getSourceFiles(path.join(appDir, "src"), [".vue"]);

  it("adds only layout classes to a frappe-ui TextInput", () => {
    const over = files
      .map((file) => [rel(file), styledTextInputs(fs.readFileSync(file, "utf8"))])
      .filter(([file, hits]) => hits.length > (TEXT_INPUT_STYLE_ALLOWLIST[file] || 0))
      .map(([file, hits]) => `${file}: ${hits.length} > ${TEXT_INPUT_STYLE_ALLOWLIST[file] || 0}\n${hits.map((h) => `  line ${h.line}: ${h.classes.join(" ")}`).join("\n")}`);
    expect(over, `TextInputs styled through class (use variant and size):\n${over.join("\n")}`).toEqual([]);
  });

  it("keeps the allowlist exact, so a fixed file lowers its count", () => {
    const stale = Object.entries(TEXT_INPUT_STYLE_ALLOWLIST)
      .map(([file, allowed]) => [file, allowed, fs.existsSync(path.join(appDir, file)) ? styledTextInputs(fs.readFileSync(path.join(appDir, file), "utf8")).length : 0])
      .filter(([, allowed, found]) => found < allowed)
      .map(([file, allowed, found]) => `${file}: allowlist says ${allowed}, found ${found}`);
    expect(stale, `Lower these counts:\n${stale.join("\n")}`).toEqual([]);
  });

  it("finds box classes on TextInput under any local name, and lets layout through", () => {
    const sfc = (template, script = `import { TextInput } from "frappe-ui";`) => `<template>${template}</template><script setup>${script}</script>`;
    expect(styledTextInputs(sfc(`<TextInput class="w-full min-h-[50px] border rounded-xl bg-white"/>`))).toEqual([
      { line: 1, classes: ["min-h-[50px]", "border", "rounded-xl", "bg-white"] },
    ]);
    expect(styledTextInputs(sfc(`<TI :class="on ? 'px-4' : ''"/>`, `import { TextInput as TI } from "frappe-ui";`))).toHaveLength(1);
    expect(styledTextInputs(sfc(`<TextInput size="lg" variant="outline" class="w-full sm:w-44 flex-1 mt-2 shrink-0"/>`))).toEqual([]);
    // other elements, and a TextInput that is not frappe-ui's, are not checked
    expect(styledTextInputs(sfc(`<div class="border bg-white"><TextInput class="w-full"/></div>`))).toEqual([]);
    expect(styledTextInputs(sfc(`<TextInput class="border"/>`, `import TextInput from "./Mine.vue";`))).toEqual([]);
  });
});
