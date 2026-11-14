import { describe, it, expect, beforeEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { applyTheme } from "../../src/utils/theme.js";

// The page's <head> applies the saved theme before first paint, src/utils/theme.js at runtime (#45).
// Both must leave <html> in the same state, or a reload shows a different theme from the toggle.
const shell = fs.readFileSync(path.resolve(__dirname, "../../omniquery/www/omniquery.html"), "utf-8");
const bootScript = shell.match(/try \{[\s\S]*?\} catch \(e\) \{\}/)?.[0];

function htmlState() {
  const root = document.documentElement;
  return { dark: root.classList.contains("dark"), theme: root.dataset.theme };
}

function reset() {
  const root = document.documentElement;
  root.className = "";
  delete root.dataset.theme;
}

describe("Static Architectural Guard: the shell's pre-paint theme matches the app's (#45)", () => {
  beforeEach(() => {
    localStorage.clear();
    reset();
  });

  it("finds the pre-paint script in the shell", () => {
    expect(bootScript, "omniquery.html must apply the saved theme in <head>").toBeTruthy();
  });

  for (const saved of ["dark", "light", null, "solarized"]) {
    it(`leaves <html> as applyTheme does for a saved theme of ${saved}`, () => {
      if (saved) localStorage.setItem("omniquery_theme", saved);
      new Function(bootScript)();
      const fromShell = htmlState();
      reset();
      applyTheme(saved);
      expect(fromShell).toEqual(htmlState());
    });
  }

  it("applies the saved text size, defaulting to md", () => {
    new Function(bootScript)();
    expect(document.documentElement.classList.contains("text-scale-md")).toBe(true);
    reset();
    localStorage.setItem("omniquery_text_size", "xl");
    new Function(bootScript)();
    expect(document.documentElement.classList.contains("text-scale-xl")).toBe(true);
  });
});
