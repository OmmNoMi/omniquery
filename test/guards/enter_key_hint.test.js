import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles, hasProp, namedImports, templateElements } from "./sourceFiles";

// Field surveyors fill the survey on a phone, where Enter in an answer moves to the next question
// (QuestionCard's onInputEnter) or the next cell (MatrixQuestionCard's onCellKeydown). A phone keyboard
// labels that key "return" unless the field says otherwise, so every text field that acts on a key
// sets enterkeyhint, and the key reads "Next" (or "Search", "Done") as it does on a native form.

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);

const KEY_EVENTS = new Set(["keydown", "keyup", "keypress"]);
const NOT_TEXT = new Set(["checkbox", "radio", "hidden", "range", "file", "color", "button", "submit"]);

const staticType = (node) => node.props.find((p) => p.type === 6 && p.name === "type")?.value?.content;

// Text fields in a .vue source that act on a key but give the phone keyboard no label for Enter
// frappe-ui's TextInput counts under any name it is imported as (`TextInput as Field`)
export function fieldsWithoutEnterHint(source) {
  const textFields = new Set(["input", "TextInput"]);
  for (const [local, imported] of namedImports(source, "frappe-ui")) if (imported === "TextInput") textFields.add(local);
  return templateElements(source)
    .filter((node) => textFields.has(node.tag) && !NOT_TEXT.has(staticType(node)))
    .filter((node) => node.props.some((p) => p.type === 7 && p.name === "on" && KEY_EVENTS.has(p.arg?.content)))
    .filter((node) => !hasProp(node, "enterkeyhint"))
    .map((node) => node.loc.start.line);
}

describe("Enter on a phone keyboard says what it does", () => {
  it("sets enterkeyhint on every text field that acts on a key", () => {
    const hits = getSourceFiles(path.join(appDir, "src"), [".vue"]).flatMap((file) =>
      fieldsWithoutEnterHint(fs.readFileSync(file, "utf8")).map((line) => `${rel(file)}:${line}`),
    );
    expect(hits, "add enterkeyhint (next, search, done) to these fields").toEqual([]);
  });

  it("finds a key handler with or without modifiers, and lets other fields through", () => {
    const sfc = (template) => `<template>${template}</template>`;
    expect(fieldsWithoutEnterHint(sfc(`<TextInput @keydown.enter="go"/>`))).toEqual([1]);
    expect(fieldsWithoutEnterHint(sfc(`<input\n  @keydown="onCellKeydown($event)"/>`))).toEqual([1]);
    expect(fieldsWithoutEnterHint(sfc(`<TextInput v-on:keyup.enter="go"/>`))).toEqual([1]);
    expect(fieldsWithoutEnterHint(sfc(`<TextInput @keydown.enter="go" enterkeyhint="next"/>`))).toEqual([]);
    expect(fieldsWithoutEnterHint(sfc(`<TextInput @keydown.enter="go" :enterkeyhint="hint"/>`))).toEqual([]);
    expect(fieldsWithoutEnterHint(sfc(`<TextInput @input="go"/><input type="checkbox" @keydown.space="go"/>`))).toEqual([]);
    expect(fieldsWithoutEnterHint(sfc(`<textarea @keydown.enter="go"/>`))).toEqual([]);
    const aliased = `<script setup>import { TextInput as Field } from "frappe-ui";</script>\n<template><Field @keydown.enter="go"/></template>`;
    expect(fieldsWithoutEnterHint(aliased), "TextInput imported under another name").toEqual([2]);
  });
});
