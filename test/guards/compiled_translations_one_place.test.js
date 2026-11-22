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
});
