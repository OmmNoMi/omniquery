import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles";

// #159: a comparison rule once read q.validation_rule, a key the compiled schema never has, so no
// template's rule ever ran. src/utils/answerComparison.js is the one place that reads a rule's
// compare_to, in step with omniquery/services/answer_comparisons.py, which checks it at submit.

const appDir = path.resolve(__dirname, "../..");
const OWNER = path.join("src", "utils", "answerComparison.js");
const RULE_READ = /\bvalidation_rule\b|\bcompare_to\b/g;

// rule reads in a source file: [{ line, text }]
export function ruleReads(source) {
  return [...source.matchAll(RULE_READ)].map((m) => ({ line: source.slice(0, m.index).split("\n").length, text: m[0] }));
}

describe("answer comparisons are read in one place (#159)", () => {
  it("finds a rule read", () => {
    expect(ruleReads("if (q.validation_rule) {}")).toHaveLength(1);
    expect(ruleReads("const other = rule.compare_to;")).toHaveLength(1);
    expect(ruleReads("const { min, max } = q.validation_rules || {};")).toEqual([]);
  });

  it("only answerComparison.js reads compare_to", () => {
    const files = getSourceFiles(path.join(appDir, "src"));
    expect(files.map((f) => path.relative(appDir, f))).toContain(OWNER);
    const bad = files
      .filter((file) => path.relative(appDir, file) !== OWNER)
      .flatMap((file) => ruleReads(fs.readFileSync(file, "utf8")).map((r) => `${path.relative(appDir, file)}:${r.line} ${r.text}`));
    expect(bad).toEqual([]);
  });
});
