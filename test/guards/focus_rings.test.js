import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import colors from "tailwindcss/colors";
import { classTokens as tokens, elementClasses, getSourceFiles, namedImports, templateElements } from "./sourceFiles";

// Focus rings (#43). Keyboard users must always see where focus is.
// - frappe-ui components (Button, TextInput, ...) draw their own focus ring, so their class prop
//   carries no ring or outline classes. On TextInput the class lands on the wrapper <div>, so no
//   focus: class does anything there.
// - Any other element that removes the outline (outline-none) brings a 2px focus-visible ring in
//   frappe-ui's ring colour, ring-outline-gray-3, so every ring in the app is one colour.
// - src/styles/main.css re-points that frappe-ui token on :focus-visible to a colour with 3:1
//   contrast on the app's light and dark surfaces: frappe-ui's own value is about 1.7:1.
// Elements are read with Vue's own template compiler, so each element's classes are checked together.

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);

const REMOVES_OUTLINE = (t) => /(^|:)outline-none$/.test(t);
const RING_OR_OUTLINE = (t) => /^(dark:)?(focus|focus-visible):(ring|outline)/.test(t) || REMOVES_OUTLINE(t);
const ANY_FOCUS = (t) => /^(dark:)?(focus|focus-visible):/.test(t) || REMOVES_OUTLINE(t);
const RING_WIDTH = (t) => /^focus-visible:ring(-[2-8])?$/.test(t);
const RING_TOKEN = "focus-visible:ring-outline-gray-3";
const FAINT_RING = (t) => /^(dark:)?(focus|focus-visible):ring-(1|0|.+\/\d+)$/.test(t);

// problems with one element's class tokens; `component` is the frappe-ui export name, if it is one
export function focusProblems(classTokens, { component = null } = {}) {
  if (component) {
    const own = classTokens.filter(component === "TextInput" ? ANY_FOCUS : RING_OR_OUTLINE);
    return own.length ? [`frappe-ui ${component} draws its own focus ring; drop ${own.join(" ")}`] : [];
  }
  const problems = [];
  const faint = classTokens.filter(FAINT_RING);
  if (faint.length) problems.push(`faint ring ${faint.join(" ")}`);
  if (classTokens.some(REMOVES_OUTLINE) && !(classTokens.some(RING_WIDTH) && classTokens.includes(RING_TOKEN)))
    problems.push(`removes the outline without focus-visible:ring-2 ${RING_TOKEN}`);
  return problems;
}

export function vueFocusViolations(source) {
  const frappeUi = namedImports(source, "frappe-ui");
  return templateElements(source).flatMap((node) =>
    focusProblems(tokens(elementClasses(node)), { component: frappeUi.get(node.tag) }).map(
      (problem) => `line ${node.loc.start.line} <${node.tag}>: ${problem}`,
    ),
  );
}

// .js files build class strings in code: check each string literal on its own
const STRING_LITERAL = /(["'`])((?:\\.|(?!\1)[^\\])*)\1/g;

export function jsFocusViolations(source) {
  return [...source.matchAll(STRING_LITERAL)].flatMap((m) =>
    focusProblems(tokens(m[2])).map((problem) => `"${m[2].slice(0, 60)}": ${problem}`),
  );
}

// WCAG 2.2 contrast ratio of two #rrggbb colours
export function contrastRatio(a, b) {
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// the colour main.css gives the frappe-ui ring token on :focus-visible, or null
export function focusRingColour(css) {
  const m = css.match(/(?:^|\n)\s*:focus-visible\s*\{[^}]*--outline-gray-3:\s*theme\(\s*["']colors\.([a-z]+)\.(\d+)["']\s*\)/);
  return m ? colors[m[1]]?.[m[2]] || null : null;
}

// surfaces a focused element sits on: white and slate cards, the light page, the dark page and cards
const SURFACES = { white: "#ffffff", "light page": "#f1f5f9", "slate-50": "#f8fafc", "dark page": "#0b1120", "dark card": "#1e293b", "slate-900": "#0f172a" };

describe("Focus rings (#43)", () => {
  const files = getSourceFiles(path.join(appDir, "src"));

  it("found source files in src/", () => {
    expect(files.length).toBeGreaterThan(0);
  });

  it("keeps focus classes off frappe-ui components and gives other outline-less elements the shared ring", () => {
    const hits = files.flatMap((file) => {
      const source = fs.readFileSync(file, "utf8");
      const found = file.endsWith(".vue") ? vueFocusViolations(source) : jsFocusViolations(source);
      return found.map((hit) => `${rel(file)}: ${hit}`);
    });
    expect(hits, `Focus ring problems:\n${hits.join("\n")}`).toEqual([]);
  });

  it("re-points frappe-ui's ring token to a colour with 3:1 contrast on every surface", () => {
    const colour = focusRingColour(fs.readFileSync(path.join(appDir, "src/styles/main.css"), "utf8"));
    expect(colour, "src/styles/main.css sets --outline-gray-3 on :focus-visible").toMatch(/^#[0-9a-f]{6}$/i);
    const weak = Object.entries(SURFACES)
      .map(([name, bg]) => [name, contrastRatio(colour, bg)])
      .filter(([, ratio]) => ratio < 3)
      .map(([name, ratio]) => `${name}: ${ratio.toFixed(2)}:1`);
    expect(weak, `focus ring ${colour} is under 3:1 on:\n${weak.join("\n")}`).toEqual([]);
  });

  it("measures contrast the WCAG way and reads the token from CSS", () => {
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 5);
    expect(contrastRatio("#c7c7c7", "#ffffff")).toBeLessThan(3); // frappe-ui's own ring colour
    expect(focusRingColour(`:focus-visible {\n  --outline-gray-3: theme("colors.emerald.600");\n}`)).toBe(colors.emerald[600]);
    expect(focusRingColour(`.x:focus-visible { --outline-gray-3: theme("colors.emerald.600"); }`)).toBeNull();
  });

  it("checks each element on its own, whatever its line layout", () => {
    const sfc = (template, script = "") => `<template>${template}</template><script setup>${script}</script>`;
    const ring = `focus-visible:ring-2 ${RING_TOKEN}`;
    // the ring of a neighbouring element does not count
    expect(vueFocusViolations(sfc(`<div><span class="outline-none"></span><span class="${ring}"></span></div>`))).toHaveLength(1);
    // a ring split over lines and across :class still counts
    expect(vueFocusViolations(sfc(`<div\n class="outline-none"\n\n\n\n :class="['focus-visible:ring-2',\n\n\n '${RING_TOKEN}']"></div>`))).toEqual([]);
    // another ring colour, a 1px ring or a translucent colour fail
    expect(vueFocusViolations(sfc(`<div class="focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"></div>`))).toHaveLength(1);
    expect(vueFocusViolations(sfc(`<div class="focus:outline-none focus-visible:ring-1 ${RING_TOKEN}"></div>`))).toHaveLength(2);
    expect(vueFocusViolations(sfc(`<div class="${ring} focus-visible:ring-emerald-500/30"></div>`))).toHaveLength(1);
    // frappe-ui components keep ring and outline classes off their class prop, under any local name
    const ui = `import { Button, TextInput as Field } from "frappe-ui";`;
    expect(vueFocusViolations(sfc(`<Button class="focus-visible:ring-2"></Button><Button class="outline-none"></Button>`, ui))).toHaveLength(2);
    expect(vueFocusViolations(sfc(`<Button class="bg-emerald-600 focus:bg-emerald-700"></Button>`, ui))).toEqual([]);
    // on TextInput every focus: class is dead, because the class lands on the wrapper
    expect(vueFocusViolations(sfc(`<Field class="focus:border-emerald-500"/>`, ui))).toHaveLength(1);
    // inside v-if branches too
    expect(vueFocusViolations(sfc(`<div v-if="a" class="outline-none"></div><div v-else></div>`))).toHaveLength(1);
    // .js class strings
    expect(jsFocusViolations(`const c = "p-2 focus:outline-none";`)).toHaveLength(1);
    expect(jsFocusViolations(`const c = "p-2 outline-none ${ring}";`)).toEqual([]);
  });
});
