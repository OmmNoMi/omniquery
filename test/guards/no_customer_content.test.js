import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getSourceFiles } from "./sourceFiles";

// No customer's name, number, survey or question codes in the app's code (#14). That content
// belongs in each site's own records: the project's help fields, the template's questions.
const appRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const files = getSourceFiles(
  [path.join(appRoot, "src"), path.join(appRoot, "omniquery")],
  [".vue", ".js", ".py", ".html"],
).filter((file) => !file.includes(`${path.sep}node_modules${path.sep}`));

const CUSTOMER_TEXT = [
  "RGAVP",
  "Rajasthan",
  "Rajivika",
  "18001026664",
  "1800-102-OMNI",
  "Field Operations Lead",
  "Household & Member Demographics",
  "OQW-0",
];
// layout picked by one client's question codes, as in code.includes("turnover")
const CODE_KEYWORD = /\bcode\b[^;\n]*\.(?:includes|startsWith)\(\s*["'](?:turnover|season|involvement|activity|capital|loan|usage|metric)/;

// Known and tracked, each with its issue. Once a file is clean the test fails until it is taken
// off this list, so the list only shrinks.
const ALLOWED = {
  "omniquery/hooks.py": "#139 the client's workspace, project and survey ship as fixtures",
  "omniquery/seed_shg_survey.py": "#139 the client's project and survey are seeded from code",
  "src/components/survey/MatrixQuestionCard.vue": "#119 matrix rows and columns come from question codes",
};

function findings(file) {
  const found = [];
  fs.readFileSync(file, "utf-8")
    .split("\n")
    .forEach((line, i) => {
      const hit = CUSTOMER_TEXT.find((text) => line.includes(text)) || (CODE_KEYWORD.test(line) && "code keyword");
      if (hit) found.push(`${path.relative(appRoot, file)}:${i + 1} [${hit}] ${line.trim()}`);
    });
  return found;
}

describe("no customer-specific content in the code (#14)", () => {
  const byFile = new Map(files.map((file) => [path.relative(appRoot, file).split(path.sep).join("/"), findings(file)]));

  it("scans the PWA, the API and the server code", () => {
    for (const file of ["src/components/project/ProjectPage.vue", "src/utils/questionLayout.js", "omniquery/api/survey.py"]) {
      expect(byFile.has(file), file).toBe(true);
    }
  });

  it("finds no customer name, number, survey or question-code layout outside the tracked files", () => {
    const offending = [...byFile].filter(([file]) => !ALLOWED[file]).flatMap(([, found]) => found);
    expect(offending).toEqual([]);
  });

  it("keeps the allowlist to files that still need their issue fixed", () => {
    const stale = Object.keys(ALLOWED).filter((file) => !byFile.get(file)?.length);
    expect(stale, "these are clean now: take them off ALLOWED").toEqual([]);
  });
});
