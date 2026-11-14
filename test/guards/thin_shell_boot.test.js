import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { applyTheme } from "../../src/utils/theme.js";

// The page's <head> applies the saved theme before first paint, src/utils/theme.js at runtime (#45).
// Both must leave <html> in the same state, or a reload shows a different theme from the toggle.
const shell = fs.readFileSync(path.resolve(__dirname, "../../omniquery/www/omniquery.html"), "utf-8");
const bootScript = shell.match(/try \{[\s\S]*?\} catch \(e\) \{\}/)?.[0];

function htmlState() {
  const root = document.documentElement;
  const themeColor = document.querySelector('meta[name="theme-color"]').getAttribute("content");
  return { dark: root.classList.contains("dark"), theme: root.dataset.theme, themeColor };
}

function reset() {
  const root = document.documentElement;
  root.className = "";
  delete root.dataset.theme;
  document.head.innerHTML = '<meta name="theme-color" content="#000000">';
}

// The device's light or dark setting, as "System" (saved as "auto") reads it
const prefersDark = (dark) => vi.stubGlobal("matchMedia", vi.fn(() => ({ matches: dark })));

describe("Static Architectural Guard: the shell's pre-paint theme matches the app's (#45)", () => {
  beforeEach(() => {
    localStorage.clear();
    reset();
  });

  afterEach(() => vi.unstubAllGlobals());

  it("finds the pre-paint script in the shell", () => {
    expect(bootScript, "omniquery.html must apply the saved theme in <head>").toBeTruthy();
  });

  it("puts the theme-color meta before the script that sets it", () => {
    const meta = shell.indexOf('<meta name="theme-color"');
    expect(meta, "omniquery.html needs a theme-color meta").toBeGreaterThan(-1);
    expect(meta).toBeLessThan(shell.indexOf(bootScript));
  });

  for (const saved of ["dark", "light", null, "solarized"]) {
    it(`leaves <html> as applyTheme does for a saved theme of ${saved}`, () => {
      prefersDark(true); // a saved choice, or none, never follows the device
      if (saved) localStorage.setItem("omniquery_theme", saved);
      new Function(bootScript)();
      const fromShell = htmlState();
      reset();
      applyTheme(saved);
      expect(fromShell).toEqual(htmlState());
    });
  }

  for (const [device, resolved] of [[true, "dark"], [false, "light"]]) {
    it(`follows a ${resolved} device on System, as useColorMode does`, () => {
      prefersDark(device);
      localStorage.setItem("omniquery_theme", "auto");
      new Function(bootScript)();
      const fromShell = htmlState();
      reset();
      applyTheme(resolved);
      expect(fromShell).toEqual(htmlState());
    });
  }

  it("reads System as light where the browser has no matchMedia", () => {
    vi.stubGlobal("matchMedia", undefined);
    localStorage.setItem("omniquery_theme", "auto");
    new Function(bootScript)();
    expect(htmlState().theme).toBe("light");
  });

  it("applies the saved text size, defaulting to md", () => {
    new Function(bootScript)();
    expect(document.documentElement.classList.contains("text-scale-md")).toBe(true);
    reset();
    localStorage.setItem("omniquery_text_size", "xl");
    new Function(bootScript)();
    expect(document.documentElement.classList.contains("text-scale-xl")).toBe(true);
  });
});
