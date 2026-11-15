import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import postcss from "postcss";
import { getSourceFiles } from "./sourceFiles";

// An open frappe-ui Dialog keeps the page behind it still: reka-ui puts overflow: hidden on <body>,
// which CSS hands on to the page's scroll only while <html> sets no overflow of its own. With
// `html { overflow-x: hidden }` in main.css, html became the scroll container and the page
// scrolled behind every open (aria-modal) dialog, losing the person's place on the page (found
// reviewing PR #92). Keep overflow off html; put it on body, which reaches the page the same way.

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);

// Declarations of overflow, overflow-x or overflow-y in rules that select <html> itself: ["file: html { overflow-x }"]
export function htmlOverflow(css, file = "") {
  const hits = [];
  postcss.parse(css).walkRules((rule) => {
    const selectsHtml = rule.selectors.some((sel) => /^(?:html|:root)(?:[.:[][^\s>+~]*)?$/.test(sel.trim()));
    if (!selectsHtml) return;
    rule.walkDecls(/^overflow(?:-[xy])?$/, (decl) => hits.push(`${file}: ${rule.selector} { ${decl.prop} }`));
  });
  return hits;
}

describe("Dialogs keep the page behind them still", () => {
  const files = getSourceFiles(path.join(appDir, "src"), [".css"]);

  it("found the app's stylesheets", () => {
    expect(files.map(rel)).toContain("src/styles/main.css");
  });

  it("sets no overflow on <html>, so the Dialog's scroll lock on body reaches the page", () => {
    const hits = files.flatMap((file) => htmlOverflow(fs.readFileSync(file, "utf8"), rel(file)));
    expect(hits, `Move these to body (see the note at the top of this file):\n${hits.join("\n")}`).toEqual([]);
  });

  it("finds overflow on html in any form, and leaves other elements alone", () => {
    expect(htmlOverflow(`html { font-size: 16px; overflow-x: hidden }`)).toHaveLength(1);
    expect(htmlOverflow(`html.dark, body { overflow: auto } :root { overflow-y: scroll }`)).toHaveLength(2);
    expect(htmlOverflow(`body { overflow-x: hidden } html .card { overflow: hidden } html { width: 100% }`)).toEqual([]);
  });
});
