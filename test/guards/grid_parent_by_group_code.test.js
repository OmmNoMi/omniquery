import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles";

// #140: questions were put under a grid because their labels began "a.", "b.", so the SHG
// survey's sourcing questions took the activity grid's place and the grid was never drawn. A
// question sits under a grid only when its group_code names one: parentGrid in
// src/utils/questionLayout.js decides it, and useSurvey is the one place that sets it.

const appDir = path.resolve(__dirname, "../..");
const SETTER = path.join("src", "composables", "useSurvey.js");
const OLD_FIELDS = /\b(_parentTitle|_parentDescription|_parentCode|parent_title)\b/g;
const SETS_PARENT = /\._parentQuestion\s*=(?!=)/g;
const SET_BY_GROUP_CODE = /\._parentQuestion\s*=\s*parentGrid\(/;

// [{ line, text }] for each match of pattern in source
export function matchesOf(source, pattern) {
  return [...source.matchAll(pattern)].map((m) => ({ line: source.slice(0, m.index).split("\n").length, text: m[0] }));
}

const sources = () =>
  getSourceFiles(path.join(appDir, "src")).map((file) => ({ rel: path.relative(appDir, file), text: fs.readFileSync(file, "utf8") }));

describe("a question sits under a grid by its group_code (#140)", () => {
  it("finds the old label-shaped link and a parent being set", () => {
    expect(matchesOf("q._parentTitle = label;", OLD_FIELDS)).toHaveLength(1);
    expect(matchesOf("v-if=\"q.parent_title\"", OLD_FIELDS)).toHaveLength(1);
    expect(matchesOf("q._parentQuestion = grid;", SETS_PARENT)).toHaveLength(1);
    expect(matchesOf("if (q._parentQuestion === grid) {}", SETS_PARENT)).toEqual([]);
  });

  it("keeps no trace of the label-shaped link", () => {
    const bad = sources().flatMap(({ rel, text }) => matchesOf(text, OLD_FIELDS).map((m) => `${rel}:${m.line} ${m.text}`));
    expect(bad).toEqual([]);
  });

  it("sets a question's grid only in useSurvey, and only through parentGrid", () => {
    const files = sources();
    expect(files.map((f) => f.rel)).toContain(SETTER);
    const elsewhere = files
      .filter((f) => f.rel !== SETTER)
      .flatMap(({ rel, text }) => matchesOf(text, SETS_PARENT).map((m) => `${rel}:${m.line}`));
    expect(elsewhere).toEqual([]);
    const setter = files.find((f) => f.rel === SETTER).text;
    expect(matchesOf(setter, SETS_PARENT)).toHaveLength(1);
    expect(setter).toMatch(SET_BY_GROUP_CODE);
  });
});
