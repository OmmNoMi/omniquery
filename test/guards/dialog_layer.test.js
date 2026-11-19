import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { classTokens, elementClasses, templateElements } from "./sourceFiles";

// An open frappe-ui Dialog dims and covers the whole page. frappe-ui teleports the Dialog (and
// Dropdown, Popover) to <body>, after #app, as a fixed layer with no z-index of its own, so any
// element in the app with a z-index (header z-40, carousel arrows z-20, section footer z-50)
// painted above the overlay: undimmed, and clickable behind an aria-modal dialog (found reviewing
// PR #92). App.vue's root div is its own stacking context (`isolate`), so every app z-index stays
// inside it. It must be that div and not #app: FrappeUIProvider renders the toast list inside
// #app, next to that div, and a toast fired from an open dialog has to show above it.

const read = (file) => fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8");

// The value of `prop` in the rule whose selector is exactly `selector`
export function ruleValue(css, selector, prop) {
  let value = null;
  postcss.parse(css).walkRules((rule) => {
    if (!rule.selectors.map((s) => s.trim()).includes(selector)) return;
    rule.walkDecls(prop, (decl) => (value = decl.value.trim()));
  });
  return value;
}

// The class tokens of the first element inside App.vue's <FrappeUIProvider>
export function appLayerClasses(source) {
  const provider = templateElements(source).find((el) => el.tag === "FrappeUIProvider");
  const layer = provider?.children.find((child) => child.type === 1);
  return layer ? classTokens(elementClasses(layer)) : [];
}

describe("Dialogs cover every part of the app", () => {
  it("makes App.vue's root div its own stacking context, so frappe-ui's teleported layers sit above all of it", () => {
    expect(appLayerClasses(read("src/App.vue")), "App.vue: <FrappeUIProvider><div class=\"isolate …\">").toContain("isolate");
  });

  it("leaves #app itself open, so the toast list stays above an open dialog", () => {
    const css = read("src/styles/main.css");
    expect(ruleValue(css, "#app", "isolation"), "main.css: no isolation on #app").toBeNull();
    expect(ruleValue(css, "#app", "z-index"), "main.css: no z-index on #app").toBeNull();
  });

  it("reads the layer from the provider's first element only", () => {
    const sfc = (inner) => `<template><FrappeUIProvider>${inner}</FrappeUIProvider></template>`;
    expect(appLayerClasses(sfc(`<div class="isolate flex"><span class="x"/></div>`))).toContain("isolate");
    expect(appLayerClasses(sfc(`<div class="flex"><span class="isolate"/></div>`))).not.toContain("isolate");
    expect(appLayerClasses(`<template><div class="isolate"/></template>`)).toEqual([]);
    expect(ruleValue(`#app .x { isolation: isolate } #app { width: 100% }`, "#app", "isolation")).toBeNull();
  });
});
