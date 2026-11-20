import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { elementProp, getSourceFiles, hasProp } from "./sourceFiles";
import { buttonElements, buttonWrappers } from "./frappeButtons";

// Every frappe-ui Button has an accessible name. frappe-ui 0.1.278's Button renders
// `<button v-bind="$attrs" :aria-label="label">`, so its own aria-label comes after the
// attributes it was given: `aria-label="Close"` without a `label` prop is replaced by nothing,
// and an icon-only Button is announced as just "button" (13 Buttons were, found fixing PR #94).
// Name a Button with `:label`. When the default slot holds the content, label is only the
// aria-label and is not shown. Visible text in the slot (`{{ __('Save') }}`) names it too, and so
// does `aria-labelledby`, which the Button does not override.

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);

const NODE = { ELEMENT: 1, TEXT: 2, INTERPOLATION: 5 };
const isHidden = (node) => elementProp(node, "aria-hidden") === "true";

// Whether a template node renders text a screen reader reads out: a text node, an interpolation,
// or an element with v-text/v-html, outside any aria-hidden subtree
function rendersText(node) {
  if (node.type === NODE.TEXT) return node.content.trim() !== "";
  if (node.type === NODE.INTERPOLATION) return true;
  if (node.type !== NODE.ELEMENT || isHidden(node)) return false;
  if (node.props.some((p) => p.type === 7 && (p.name === "text" || p.name === "html"))) return true;
  return (node.children || []).some(rendersText);
}

const setsAriaLabel = (node) => hasProp(node, "aria-label") || hasProp(node, "ariaLabel");
const isNamed = (node) => hasProp(node, "label") || hasProp(node, "aria-labelledby") || node.children.some(rendersText);

// frappe-ui Buttons with no accessible name, and components that forward their attributes to a
// Button but are given an aria-label it drops: [{ line, reason }]. A wrapper (SurveyModeMenu)
// names its own Button, which this guard checks in the wrapper's file.
export function namelessButtons(source, wrapperTags = []) {
  const buttons = new Set(buttonElements(source));
  return buttonElements(source, wrapperTags)
    .filter((node) => (buttons.has(node) ? !isNamed(node) : setsAriaLabel(node) && !hasProp(node, "label")))
    .map((node) => ({ line: node.loc.start.line, reason: setsAriaLabel(node) ? "aria-label is dropped, use :label" : "no label" }));
}

describe("Every frappe-ui Button has an accessible name", () => {
  const files = getSourceFiles(path.join(appDir, "src"), [".vue"]);

  it("found source files in src/", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("names every Button with label, visible text or aria-labelledby, never aria-label alone", () => {
    const wrappers = buttonWrappers(files);
    const nameless = files.flatMap((file) =>
      namelessButtons(fs.readFileSync(file, "utf8"), wrappers).map((hit) => `${rel(file)}:${hit.line} ${hit.reason}`),
    );
    expect(nameless, `Buttons with no accessible name (see the note at the top of this file):\n${nameless.join("\n")}`).toEqual([]);
  });

  it("finds a Button named only by aria-label, static or bound, under any local name or branch", () => {
    const sfc = (template, script = `import { Button } from "frappe-ui";`) => `<template>${template}</template><script setup>${script}</script>`;
    expect(namelessButtons(sfc(`<Button aria-label="Close"><svg/></Button>`))).toEqual([{ line: 1, reason: "aria-label is dropped, use :label" }]);
    expect(namelessButtons(sfc(`<B :aria-label="__('Close')"><X/></B>`, `import { Button as B } from "frappe-ui";`))).toHaveLength(1);
    expect(namelessButtons(sfc(`<div v-if="a"/><Button v-else :ariaLabel="x"><X/></Button>`))).toHaveLength(1);
    // an icon with no name at all, and text a screen reader skips, are nameless too
    expect(namelessButtons(sfc(`<Button :icon="X"/><Button><X/></Button>`))).toEqual([
      { line: 1, reason: "no label" },
      { line: 1, reason: "no label" },
    ]);
    expect(namelessButtons(sfc(`<Button><span aria-hidden="true">+</span></Button>`))).toHaveLength(1);
    // a component that hands its attributes to a Button drops an aria-label too, but names its
    // own Button, so it needs no label of its own
    expect(namelessButtons(sfc(`<ModeMenu aria-label="Mode"/><ModeMenu/>`), ["ModeMenu"])).toEqual([
      { line: 1, reason: "aria-label is dropped, use :label" },
    ]);
  });

  it("accepts a label, visible text or aria-labelledby, and skips Buttons that are not frappe-ui's", () => {
    const sfc = (template, script = `import { Button } from "frappe-ui";`) => `<template>${template}</template><script setup>${script}</script>`;
    expect(namelessButtons(sfc(`<Button :label="__('Close')" :icon="X"/><Button label="Save"/><Button :label="x"><X/></Button>`))).toEqual([]);
    expect(namelessButtons(sfc(`<Button>{{ __('Save') }}</Button><Button><X/><span>Save</span></Button><Button><span v-text="x"/></Button>`))).toEqual([]);
    expect(namelessButtons(sfc(`<Button aria-labelledby="title"><X/></Button><Button>-</Button>`))).toEqual([]);
    expect(namelessButtons(sfc(`<Button aria-label="Close"/>`, `import Button from "./MyButton.vue";`))).toEqual([]);
  });
});
