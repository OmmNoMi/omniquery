import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { elementProp, getSourceFiles, hasProp, templateElements } from "./sourceFiles";

// Every radiogroup and group has an accessible name (#19). Without one a screen reader says only
// "radio group" and never the question; FRangeSlider's tap pills shipped that way. Name it once:
// aria-labelledby pointing at the visible label (the question's own text), or aria-label when
// there is no visible label. Never both: aria-labelledby wins, so an aria-label beside it is
// dead and drifts from the label. src/utils/choiceGroup.js gives the group its required and
// invalid state.

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);
const GROUP_ROLE = /(^|[^-\w])(radiogroup|group)([^-\w]|$)/;

// Elements with role radiogroup or group, static or bound, that are unnamed or named twice:
// [{ line, reason }]
export function choiceGroupProblems(source) {
  return templateElements(source)
    .filter((node) => GROUP_ROLE.test(elementProp(node, "role")))
    .flatMap((node) => {
      const labelledBy = hasProp(node, "aria-labelledby");
      const label = hasProp(node, "aria-label");
      if (!labelledBy && !label) return [{ line: node.loc.start.line, reason: "no aria-labelledby or aria-label" }];
      if (labelledBy && label) return [{ line: node.loc.start.line, reason: "aria-label beside aria-labelledby is dead" }];
      return [];
    });
}

describe("Every radiogroup and group is named once", () => {
  const files = getSourceFiles(path.join(appDir, "src"), [".vue"]);

  it("found source files in src/", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("names every radiogroup and group with aria-labelledby or aria-label, not both", () => {
    const problems = files.flatMap((file) =>
      choiceGroupProblems(fs.readFileSync(file, "utf8")).map((hit) => `${rel(file)}:${hit.line} ${hit.reason}`),
    );
    expect(problems, `Radio groups and groups named wrongly (see the note at the top of this file):\n${problems.join("\n")}`).toEqual([]);
  });

  it("finds an unnamed group, static or bound, in any branch", () => {
    const sfc = (template) => `<template>${template}</template>`;
    expect(choiceGroupProblems(sfc(`<div role="radiogroup"><button role="radio"/></div>`))).toEqual([
      { line: 1, reason: "no aria-labelledby or aria-label" },
    ]);
    expect(choiceGroupProblems(sfc(`<div v-if="a"/><div v-else :role="multi ? 'group' : 'radiogroup'"/>`))).toHaveLength(1);
    expect(choiceGroupProblems(sfc(`<div role="radiogroup" aria-labelledby="q" :aria-label="x"/>`))).toEqual([
      { line: 1, reason: "aria-label beside aria-labelledby is dead" },
    ]);
  });

  it("accepts a group named once, and skips other roles", () => {
    const sfc = (template) => `<template>${template}</template>`;
    expect(choiceGroupProblems(sfc(`<div role="radiogroup" :aria-labelledby="'q_' + code"/><div role="group" aria-label="Days"/>`))).toEqual([]);
    expect(choiceGroupProblems(sfc(`<div role="region"/><div role="radio"/><div role="tablist"/><div role="button-group"/>`))).toEqual([]);
  });
});
