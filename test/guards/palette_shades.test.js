import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles";

// Colour classes must name a shade that exists, or Tailwind drops them without a word. frappe-ui's
// palette (tailwind.config.cjs takes it as its preset) stops at 900, so `dark:bg-blue-950/40` gave
// the matrix hint in QuestionCard no dark background at all (found reviewing PR #92). Only the
// colours tailwind.config.cjs takes from Tailwind's own palette (slate, emerald, amber, rose) have a
// 950. For blue, use frappe-ui's tokens (bg-surface-blue-1, border-outline-blue-1, text-ink-blue-3),
// which switch with the theme, or a shade up to 900.
// Existing uses per file are counted below. New code adds none, and a file may only go down. The
// rest are on ROADMAP.md.

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);

export const MISSING_SHADE_ALLOWLIST = {
  "src/components/common/FCombobox.vue": 3,
  "src/components/dashboard/FilledFormsModal.vue": 1,
  "src/components/dashboard/SurveyorDashboard.vue": 2,
  "src/components/project/ProjectPage.vue": 1,
};

// The colours tailwind.config.cjs takes whole from Tailwind's palette (`slate: colors.slate`)
const config = fs.readFileSync(path.join(appDir, "tailwind.config.cjs"), "utf8");
export const FULL_PALETTES = [...config.matchAll(/\b(\w+):\s*colors\.\1\b/g)].map((m) => m[1]);

// Colour utilities on a 950 shade of a colour that has none: ["dark:bg-blue-950/40", ...]
export function missingShades(source, fullPalettes = FULL_PALETTES) {
  return [...source.matchAll(/(?<![\w-])(?:[\w-]+:)*!?(?:bg|text|border(?:-[trblxy])?|ring|divide|from|via|to|fill|stroke|outline|decoration|placeholder|shadow)-([a-z]+)-950\b(?:\/\d+)?/g)]
    .filter((m) => !fullPalettes.includes(m[1]))
    .map((m) => m[0]);
}

describe("Colour classes name a shade the palette has", () => {
  const files = getSourceFiles(path.join(appDir, "src"), [".vue", ".js"]);

  it("reads the full palettes from tailwind.config.cjs", () => {
    expect(FULL_PALETTES).toEqual(expect.arrayContaining(["slate", "emerald", "amber", "rose"]));
    expect(FULL_PALETTES).not.toContain("blue");
  });

  it("adds no 950 shade of a colour that stops at 900", () => {
    const over = files
      .map((file) => [rel(file), missingShades(fs.readFileSync(file, "utf8"))])
      .filter(([file, hits]) => hits.length > (MISSING_SHADE_ALLOWLIST[file] || 0))
      .map(([file, hits]) => `${file}: ${hits.length} > ${MISSING_SHADE_ALLOWLIST[file] || 0}: ${hits.join(" ")}`);
    expect(over, `Classes Tailwind never builds (see the note at the top of this file):\n${over.join("\n")}`).toEqual([]);
  });

  it("keeps the allowlist exact, so a fixed file lowers its count", () => {
    const stale = Object.entries(MISSING_SHADE_ALLOWLIST)
      .map(([file, allowed]) => [file, allowed, fs.existsSync(path.join(appDir, file)) ? missingShades(fs.readFileSync(path.join(appDir, file), "utf8")).length : 0])
      .filter(([, allowed, found]) => found < allowed)
      .map(([file, allowed, found]) => `${file}: allowlist says ${allowed}, found ${found}`);
    expect(stale, `Lower these counts:\n${stale.join("\n")}`).toEqual([]);
  });

  it("finds a missing shade under any prefix or opacity, and skips full palettes", () => {
    expect(missingShades(`class="dark:bg-blue-950/40 text-blue-950 hover:!border-purple-950"`, ["slate"])).toEqual([
      "dark:bg-blue-950/40",
      "text-blue-950",
      "hover:!border-purple-950",
    ]);
    expect(missingShades(`class="dark:bg-slate-950 bg-blue-900 text-blue-9500 bg-surface-blue-1"`, ["slate"])).toEqual([]);
  });
});
