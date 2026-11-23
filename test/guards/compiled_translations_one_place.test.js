import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles, namedImports } from "./sourceFiles";

// #165: a template's compiled *_translated fields are frappe._() run once at template submit, in
// the language of whoever submitted it, not the surveyor's. Read straight off a question they showed
// an English surveyor Hindi, and hid from a Hindi surveyor any translation added after the submit.
// Only useTranslation picks between them and __(), and cascadingOptions hands it a choice's
// compiled label, so every place that shows a choice gets its label from getOptionLabel.

const appDir = path.resolve(__dirname, "../..");
const READERS = new Set([path.join("src", "composables", "useTranslation.js"), path.join("src", "utils", "cascadingOptions.js")]);
const COMPILED = /\b\w+_translated\b/g;

const sources = () =>
  getSourceFiles(path.join(appDir, "src")).map((file) => ({ rel: path.relative(appDir, file), text: fs.readFileSync(file, "utf8") }));

const lineOf = (text, index) => text.slice(0, index).split("\n").length;

describe("compiled translations are read in one place (#165)", () => {
  it("only useTranslation and cascadingOptions read a *_translated field", () => {
    const all = sources();
    expect(all.filter(({ rel }) => READERS.has(rel)).length).toBe(READERS.size);
    const reads = all
      .filter(({ rel }) => !READERS.has(rel))
      .flatMap(({ rel, text }) => [...text.matchAll(COMPILED)].map((m) => `${rel}:${lineOf(text, m.index)} ${m[0]}`));
    expect(reads).toEqual([]);
  });

  it("every place that shows choiceOptions labels them with getOptionLabel", () => {
    const users = sources().filter(({ text }) => namedImports(text, "../../utils/cascadingOptions").has("choiceOptions"));
    expect(users.length).toBeGreaterThan(0);
    expect(users.filter(({ text }) => !/\bgetOptionLabel\(/.test(text)).map(({ rel }) => rel)).toEqual([]);
  });

  // A label, a section title or a group title read straight off the template is the author's text,
  // so a card that shows it shows English to a Hindi surveyor. It is shown through getQuestionLabel,
  // getSectionTitle or __(). The reads left are counted, each for a reason that never reaches the
  // screen as it is, so a new one fails here until it is shown the right way or added with its reason.
  it("no card shows a template's label, section title or group title as authored", () => {
    const AUTHORED = /\.(label_en|section_title|group_title)\b/g;
    const ALLOWED = {
      // the picker itself
      [path.join("src", "composables", "useTranslation.js")]: Infinity,
      // the answer keeps the label as authored, for the record, not the screen
      [path.join("src", "utils", "responsePayload.js")]: 1,
      // runs are found by the authored label's shape; group_title goes through __(), and the default
      // getQuestionLabel is for callers with no language, the tests
      [path.join("src", "utils", "questionLayout.js")]: 6,
      // a sub-question's letter, taken from the authored label
      [path.join("src", "components", "survey", "GroupedQuestionCard.vue")]: 1,
      // the unit, money or a multi-select told from the authored wording
      [path.join("src", "components", "survey", "QuestionCard.vue")]: 3,
    };
    const over = sources()
      .map(({ rel, text }) => ({ rel, reads: [...text.matchAll(AUTHORED)].map((m) => `${rel}:${lineOf(text, m.index)} ${m[0]}`) }))
      .filter(({ rel, reads }) => reads.length > (ALLOWED[rel] ?? 0))
      .flatMap(({ reads }) => reads);
    expect(over).toEqual([]);
  });
});
