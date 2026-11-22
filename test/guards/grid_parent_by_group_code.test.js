import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles";

// #140: questions were put under a grid because their labels began "a.", "b.", so the SHG
// survey's sourcing questions took the activity grid's place and the grid was never drawn. A
// question sits under a grid only when its group_code names one: parentGrid in
// src/utils/questionLayout.js decides it from the section's grids, and ParentGridCard is handed what it
// returns, through QuestionCard's parentQuestion on the page and directly in focus mode. Nothing
// writes the grid onto the template's questions, where it went stale and leaked into every other
// holder of them.

const appDir = path.resolve(__dirname, "../..");
const OLD_FIELDS = /\b(_parentTitle|_parentDescription|_parentCode|_parentQuestion|parent_title)\b/g;
const PARENT_BINDING = /:(?:parent-?[qQ]uestion|grid)="([^"]*)"/g;
// a <FocusModeModal ...> tag, whose attribute values may hold ">" (an arrow function)
const FOCUS_MODE_TAG = /<FocusModeModal\b(?:"[^"]*"|[^>"])*>/g;
// QuestionCard hands ParentGridCard the parentQuestion it was given
const PASSED_ON = { file: path.join("src", "components", "survey", "QuestionCard.vue"), value: "parentQuestion" };

// [{ line, text, value }] for each match of pattern in source
export function matchesOf(source, pattern) {
  return [...source.matchAll(pattern)].map((m) => ({ line: source.slice(0, m.index).split("\n").length, text: m[0], value: m[1] }));
}

const sources = () =>
  getSourceFiles(path.join(appDir, "src")).map((file) => ({ rel: path.relative(appDir, file), text: fs.readFileSync(file, "utf8") }));

describe("a question sits under a grid by its group_code (#140)", () => {
  it("finds the old fields and a card's parentQuestion binding", () => {
    expect(matchesOf("q._parentTitle = label;", OLD_FIELDS)).toHaveLength(1);
    expect(matchesOf("q._parentQuestion = grid;", OLD_FIELDS)).toHaveLength(1);
    expect(matchesOf('v-if="q.parent_title"', OLD_FIELDS)).toHaveLength(1);
    expect(matchesOf('<QuestionCard :parentQuestion="grid" />', PARENT_BINDING)[0].value).toBe("grid");
    expect(matchesOf('<QuestionCard :parent-question="x" />', PARENT_BINDING)[0].value).toBe("x");
    expect(matchesOf('<ParentGridCard :grid="g" />', PARENT_BINDING)[0].value).toBe("g");
  });

  it("keeps no grid on the template's questions", () => {
    const bad = sources().flatMap(({ rel, text }) => matchesOf(text, OLD_FIELDS).map((m) => `${rel}:${m.line} ${m.text}`));
    expect(bad).toEqual([]);
  });

  it("hands a card its grid only through parentGrid", () => {
    const bindings = sources().flatMap(({ rel, text }) =>
      matchesOf(text, PARENT_BINDING).map((m) => ({ rel, at: `${rel}:${m.line}`, value: m.value })),
    );
    const passedOn = (b) => b.rel === PASSED_ON.file && b.value === PASSED_ON.value;
    expect(bindings.filter(passedOn)).toHaveLength(1);
    expect(bindings.filter((b) => /^parentGrid\(/.test(b.value)).length).toBeGreaterThanOrEqual(2);
    expect(bindings.filter((b) => !passedOn(b) && !/^parentGrid\(/.test(b.value)).map((b) => b.at)).toEqual([]);
  });

  // focus mode finds the grid in the sectionGrids it is given, and without them shows no card
  it("hands focus mode the section's grids", () => {
    expect(matchesOf('<FocusModeModal :a="x => y" :sectionGrids="g" />', FOCUS_MODE_TAG)).toHaveLength(1);
    const tags = sources().flatMap(({ rel, text }) => matchesOf(text, FOCUS_MODE_TAG).map((m) => ({ at: `${rel}:${m.line}`, text: m.text })));
    expect(tags.length).toBeGreaterThan(0);
    expect(tags.filter((t) => !/\s:section-?[gG]rids="/.test(t.text)).map((t) => t.at)).toEqual([]);
  });
});
