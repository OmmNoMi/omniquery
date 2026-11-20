import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles";

// A surveyor can answer 0 (no years in the SHG, no livestock), and a range question showed a 0
// as never answered (#21). Whether a question has an answer is decided once, by isAnswered() in
// src/utils/responsePayload.js: 0 and false count, an empty or blank string does not. A copy of
// that check drifts, and a bare `!responses[code]` takes a 0 for no answer.

const appDir = path.resolve(__dirname, "../..");
const HOME = path.join(appDir, "src/utils/responsePayload.js");
const RULES = [
  { name: "a copy of isAnswered()", pattern: /!==\s*null\s*&&\s*String\([^)]*\)\.trim\(\)\s*!==\s*""/g },
  { name: "a 0 read as no answer", pattern: /!\s*(?:props\.)?responses(?:\.value)?\[/g },
];

export function answeredCheckCopies(source) {
  const hits = [];
  for (const { name, pattern } of RULES) {
    for (const m of source.matchAll(pattern)) hits.push({ line: source.slice(0, m.index).split("\n").length, name });
  }
  return hits;
}

describe("whether a question is answered has one definition (#21)", () => {
  it("finds both shapes it bans", () => {
    expect(answeredCheckCopies('if (v !== undefined && v !== null && String(v).trim() !== "") n++;')).toHaveLength(1);
    expect(answeredCheckCopies("(q) => !responses.value[q.question_code]")).toHaveLength(1);
    expect(answeredCheckCopies("isAnswered(props.responses[q.question_code])")).toEqual([]);
  });

  it("asks isAnswered() everywhere in src", () => {
    const hits = getSourceFiles(path.join(appDir, "src"))
      .filter((file) => file !== HOME)
      .flatMap((file) => answeredCheckCopies(fs.readFileSync(file, "utf8")).map((h) => `${path.relative(appDir, file)}:${h.line} ${h.name}`));
    expect(hits, `Use isAnswered() from src/utils/responsePayload.js:\n${hits.join("\n")}`).toEqual([]);
  });
});
