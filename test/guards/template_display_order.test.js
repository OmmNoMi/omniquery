import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles";

// #169: a compiled schema keeps the template's rows in the order they were saved, so the survey asked
// a question moved by its Order alone out of place. Every survey the app opens is put in Order as it
// becomes the active template, whether it came from the device's cache or the server.

const appDir = path.resolve(__dirname, "../..");
const ASSIGNMENT = /\bactiveTemplate\.value\s*=(?!=)\s*([^;\n]+)/g;

describe("the active template is always in its Order (#169)", () => {
  it("sets activeTemplate only to null or to a schema put through inDisplayOrder", () => {
    const assignments = getSourceFiles(path.join(appDir, "src")).flatMap((file) => {
      const text = fs.readFileSync(file, "utf8");
      return [...text.matchAll(ASSIGNMENT)].map((m) => ({ at: `${path.relative(appDir, file)}: ${m[0]}`, value: m[1].trim() }));
    });
    expect(assignments.some(({ value }) => value.startsWith("inDisplayOrder("))).toBe(true);
    expect(assignments.filter(({ value }) => value !== "null" && !value.startsWith("inDisplayOrder(")).map(({ at }) => at)).toEqual([]);
  });
});
