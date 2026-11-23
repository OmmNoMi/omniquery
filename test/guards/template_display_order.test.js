import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles";

// #169: a compiled schema keeps the template's rows in the order they were saved, so the survey asked
// a question moved by its Order alone out of place. Every survey the app opens is put in Order as it
// becomes the active template, whether it came from the device's cache or the server.

const appDir = path.resolve(__dirname, "../..");
const ASSIGNMENT = /\bactiveTemplate\.value\s*=(?!=)\s*([^;\n]+)/g;
// a template's rows changed in place on the active template skip inDisplayOrder
const ROWS_CHANGED = /\bactiveTemplate\.value\??\.(?:sections|questions)\s*=(?!=)|Object\.assign\(\s*activeTemplate\.value\b/g;
// a stored schema's rows, read before inDisplayOrder has put them in Order
const STORED_ROWS = /\bschema\??\.(?:sections|questions)\b/g;
// each read left has a reason that does not depend on the rows' order
const STORED_ROWS_ALLOWED = {
  "src/utils/questionLayout.js": 2, // inDisplayOrder itself
  "src/composables/useSurvey.js": 1, // the number of questions a downloaded survey has
};

const sources = () => getSourceFiles(path.join(appDir, "src")).map((file) => ({ file: path.relative(appDir, file), text: fs.readFileSync(file, "utf8") }));

describe("the active template is always in its Order (#169)", () => {
  it("sets activeTemplate only to null or to a schema put through inDisplayOrder", () => {
    const assignments = sources().flatMap(({ file, text }) =>
      [...text.matchAll(ASSIGNMENT)].map((m) => ({ at: `${file}: ${m[0]}`, value: m[1].trim() })),
    );
    expect(assignments.some(({ value }) => value.startsWith("inDisplayOrder("))).toBe(true);
    expect(assignments.filter(({ value }) => value !== "null" && !value.startsWith("inDisplayOrder(")).map(({ at }) => at)).toEqual([]);
  });

  it("never changes the active template's sections or questions in place", () => {
    expect(sources().flatMap(({ file, text }) => [...text.matchAll(ROWS_CHANGED)].map((m) => `${file}: ${m[0]}`))).toEqual([]);
  });

  it("reads a stored schema's sections and questions only where their order does not matter", () => {
    const reads = Object.fromEntries(
      sources()
        .map(({ file, text }) => [file, [...text.matchAll(STORED_ROWS)].length])
        .filter(([, count]) => count > 0),
    );
    expect(reads).toEqual(STORED_ROWS_ALLOWED);
  });
});
