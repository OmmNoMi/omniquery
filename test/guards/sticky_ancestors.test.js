import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { getSourceFiles, templateTree, componentImports, elementClassNames, ruleDeclarations, utilityDeclarations } from "./sourceFiles";

// A position: sticky element sticks to its nearest scroll container. `overflow-x: hidden` (with
// overflow-y left visible) computes overflow-y to auto, so the element becomes a scroll container
// even though it never scrolls. #app and App.vue's shell div both had it, so the header, the
// grouped and matrix question headers and the project tab strip stuck to a box that moved with the
// page, and scrolled away (#141). `overflow-x: clip` cuts the sideways overflow without making a
// scroll container; #app has it, with hidden kept for browsers that lack clip. body keeps
// overflow-x: hidden, which CSS hands on to the viewport while html sets none
// (test/guards/scroll_lock.test.js).
//
// This walks up from every sticky element in src/**/*.vue, through every file that renders it, to
// App.vue. No element on the way, and no element around the <slot> of a component on the way, may
// be a scroll container. Tailwind says what each class does (built with tailwind.config.cjs), so
// variants, `!` and arbitrary values are read the way the build reads them. A frappe-ui component
// whose child is made sticky through a variant (`[&>[role=tablist]]:sticky` on Tabs) must force its
// own root visible: Tabs' root is overflow-hidden. Every sticky element sits at the header's height,
// top-[var(--app-header-height)], so none drifts from the header (#146).

const appDir = path.resolve(__dirname, "../..");
const rel = (file) => path.relative(appDir, file);

// Files whose sticky elements stick to a scroll area of their own, on purpose
export const OWN_SCROLL_AREA = {
  "src/components/survey/FocusModeModal.vue": "focus mode is a dialog that scrolls its own body, and its question header sticks to that",
};

const OVERFLOW = /^overflow(?:-[xy])?$/;
// Values of overflow that make an element a scroll container
const scrolls = (value) => value.split(/\s+/).some((v) => /^(?:hidden|auto|scroll|overlay)$/.test(v));
// The block that gives browsers without overflow: clip their hidden back
const NO_CLIP = /^@supports not \(overflow(?:-x)?: clip\)$/;
const HEADER_TOP = "var(--app-header-height)";

// The overflow #app is given that makes it a scroll container in a browser with clip:
// ["overflow-x: hidden", "@media (min-width: 640px) overflow: auto"]
export function appScrollOverflow(css) {
  return ruleDeclarations(css, "#app", OVERFLOW)
    .filter(({ value, atRules }) => scrolls(value) && !atRules.some((a) => NO_CLIP.test(a)))
    .map(({ prop, value, atRules }) => [...atRules, `${prop}: ${value}`].join(" "));
}

// Whether #app clips sideways overflow everywhere, so a wide element can't widen the page: the
// shell and everything else under it leave that to #app
export const appClips = (css) =>
  ruleDeclarations(css, "#app", OVERFLOW).some(
    ({ prop, value, atRules }) => !atRules.length && (prop === "overflow-x" ? value === "clip" : prop === "overflow" && value.split(/\s+/)[0] === "clip"),
  );

// Whether #app gets overflow-x: hidden back where clip isn't supported
export const appFallsBackToHidden = (css) =>
  ruleDeclarations(css, "#app", OVERFLOW).some(({ value, atRules }) => value === "hidden" && atRules.some((a) => NO_CLIP.test(a)));

// Questions about one class, answered from Tailwind's build (utilityDeclarations)
export function classEffects(declarations) {
  const of = (name) => declarations.get(name) || [];
  return {
    // makes the element itself a scroll container
    scrolls: (name) => of(name).some((d) => !d.child && OVERFLOW.test(d.prop) && scrolls(d.value)),
    // the sticky declaration, if any; child: true when a variant makes an element inside sticky
    sticky: (name) => of(name).find((d) => d.prop === "position" && d.value === "sticky"),
    // forces the element's overflow visible over a component's own classes
    forcesVisible: (name) => of(name).some((d) => !d.child && d.prop === "overflow" && d.value === "visible" && d.important),
    top: (name) => of(name).find((d) => d.prop === "top")?.value,
    height: (name) => of(name).find((d) => d.prop === "height")?.value,
  };
}

const isComponentTag = (tag) => /^[A-Z]/.test(tag) || tag.includes("-");
const at = (file, node) => `${rel(file)}:${node.loc.start.line} <${node.tag}>`;

// The sticky elements of each file: Map of file -> [{ node, ancestors, child }]
function stickyElements(sources, effects, exempt) {
  const found = new Map();
  for (const [file, source] of sources) {
    if (exempt[rel(file)]) continue;
    const stickies = templateTree(source).flatMap(({ node, ancestors }) => {
      const sticky = elementClassNames(node).map(effects.sticky).find(Boolean);
      return sticky ? [{ node, ancestors, child: sticky.child }] : [];
    });
    if (stickies.length) found.set(file, stickies);
  }
  return found;
}

// Where a sticky element would stick to something other than the page:
// ["src/App.vue:9 <div> overflow-x-hidden holds src/components/header/CompactHeader.vue:2 <header>"].
// sources is a Map of absolute file -> source.
export function stickyTraps(sources, effects, exempt = OWN_SCROLL_AREA) {
  const stickies = stickyElements(sources, effects, exempt);
  const imports = new Map([...sources].map(([file, source]) => [file, componentImports(source, file)]));
  const trees = new Map([...sources].map(([file, source]) => [file, templateTree(source)]));

  // the files that render a sticky element, themselves or through a component they render
  const holders = new Map([...stickies].map(([file, list]) => [file, at(file, list[0].node)]));
  for (let grew = true; grew; ) {
    grew = false;
    for (const [file, tree] of trees) {
      if (holders.has(file) || exempt[rel(file)]) continue;
      const use = tree.find(({ node }) => holders.has(imports.get(file).get(node.tag)));
      if (use) holders.set(file, holders.get(imports.get(file).get(use.node.tag))), (grew = true);
    }
  }

  const traps = new Set();
  const check = (file, node, what) => {
    const hits = elementClassNames(node).filter(effects.scrolls);
    if (hits.length) traps.add(`${at(file, node)} ${hits.join(" ")} holds ${what}`);
  };
  for (const [file, tree] of trees) {
    if (exempt[rel(file)]) continue;
    const own = imports.get(file);
    const targets = [
      ...(stickies.get(file) || []).map((s) => ({ ...s, what: at(file, s.node) })),
      ...tree.filter(({ node }) => holders.has(own.get(node.tag))).map((t) => ({ ...t, what: holders.get(own.get(t.node.tag)) })),
    ];
    for (const { node, ancestors, child, what } of targets) {
      for (const outer of child ? [...ancestors, node] : ancestors) {
        check(file, outer, what);
        // content passed to one of our components lands in its <slot>, inside that component's elements
        const component = own.get(outer.tag);
        for (const { node: slot, ancestors: around } of trees.get(component)?.filter(({ node: n }) => n.tag === "slot") || []) {
          [...around, slot].forEach((el) => check(component, el, what));
        }
      }
      if (child && isComponentTag(node.tag) && !own.has(node.tag) && !elementClassNames(node).some(effects.forcesVisible)) {
        traps.add(`${at(file, node)} makes a child sticky, but its own root may scroll: add !overflow-visible`);
      }
    }
  }
  return [...traps];
}

// Sticky elements whose top isn't the header's height (the header itself sits at 0), and a sticky
// <header> whose height doesn't come from --app-header-height: ["src/x.vue:3 <div> sm:top-[56px]"]
export function stickyOffsets(sources, effects, exempt = OWN_SCROLL_AREA) {
  const wrong = [];
  for (const [file, list] of stickyElements(sources, effects, exempt)) {
    for (const { node } of list) {
      const names = elementClassNames(node);
      const allowed = node.tag === "header" ? "0px" : HEADER_TOP;
      const tops = names.filter((name) => effects.top(name) !== undefined);
      const off = tops.length ? tops.filter((name) => effects.top(name) !== allowed) : ["no top"];
      if (off.length) wrong.push(`${at(file, node)} ${off.join(" ")}`);
      if (node.tag === "header" && !names.some((name) => effects.height(name) === HEADER_TOP)) wrong.push(`${at(file, node)} height isn't h-[${HEADER_TOP}]`);
    }
  }
  return wrong;
}

// Test fixtures: small SFCs under src/, so their relative imports resolve
const fixture = (name, template, imports = "") => [path.join(appDir, "src", name), `<template>${template}</template>\n<script setup>\n${imports}\n</script>`];
const FIXTURE_CLASSES = ["overflow-x-hidden", "sm:overflow-y-auto", "[overflow-x:hidden]", "overflow-x-clip", "overflow-visible", "!overflow-visible", "[&>[role=tablist]]:sticky", "sticky", "top-0", "top-[52px]", "sm:top-[56px]", `top-[${HEADER_TOP}]`, `h-[${HEADER_TOP}]`, "h-13"];

describe("Sticky headers stick to the page", async () => {
  const files = getSourceFiles(path.join(appDir, "src"), [".vue"]);
  const sources = new Map(files.map((file) => [file, fs.readFileSync(file, "utf8")]));
  const appClasses = [...sources.values()].flatMap((source) => templateTree(source).flatMap(({ node }) => elementClassNames(node)));
  const effects = classEffects(await utilityDeclarations([...appClasses, ...FIXTURE_CLASSES]));
  const mainCss = fs.readFileSync(path.join(appDir, "src/styles/main.css"), "utf8");

  it("keeps #app from being a scroll container where clip works, and falls back to hidden where it doesn't", () => {
    expect(appScrollOverflow(mainCss), "main.css #app: use overflow-x: clip").toEqual([]);
    expect(appClips(mainCss), "main.css #app { overflow-x: clip }").toBe(true);
    expect(appFallsBackToHidden(mainCss), "main.css: @supports not (overflow-x: clip) { #app { overflow-x: hidden } }").toBe(true);
  });

  it("keeps every element above a sticky one, up to App.vue, from being a scroll container", () => {
    expect(stickyTraps(sources, effects), "use overflow-x-clip, or move the overflow off the way up").toEqual([]);
  });

  it("finds the sticky elements it walks up from", () => {
    const found = [...stickyElements(sources, effects, OWN_SCROLL_AREA)].flatMap(([file, list]) => list.map(({ node }) => `${rel(file)} <${node.tag}>`));
    expect(found).toEqual(expect.arrayContaining([
      "src/components/header/CompactHeader.vue <header>",
      "src/components/project/ProjectPage.vue <Tabs>",
      "src/components/survey/GroupedQuestionCard.vue <div>",
      "src/components/survey/MatrixQuestionCard.vue <div>",
    ]));
    expect(found.some((f) => f.startsWith("src/components/survey/FocusModeModal.vue"))).toBe(false);
  });

  it("puts every sticky element at the header's height, which the header takes its height from", () => {
    expect(stickyOffsets(sources, effects), `use top-[${HEADER_TOP}]`).toEqual([]);
    expect(mainCss).toMatch(/--app-header-height:\s*\d+px/);
  });

  it("reads #app's overflow in every block, and lets clip, visible and the fallback through", () => {
    expect(appScrollOverflow(`#app { overflow-x: hidden }`)).toEqual(["overflow-x: hidden"]);
    expect(appScrollOverflow(`#app { overflow: clip auto } #app .x { overflow: hidden }`)).toEqual(["overflow: clip auto"]);
    // a later clip doesn't hide an earlier hidden in a media query
    expect(appScrollOverflow(`@media (min-width: 640px) { #app { overflow-x: hidden } } #app { overflow-x: clip }`)).toEqual(["@media (min-width: 640px) overflow-x: hidden"]);
    expect(appScrollOverflow(`#app { overflow-x: clip; overflow-y: visible } body { overflow-x: hidden }`)).toEqual([]);
    const fallback = `#app { overflow-x: clip } @supports not (overflow-x: clip) { #app { overflow-x: hidden } }`;
    expect(appScrollOverflow(fallback)).toEqual([]);
    expect(appFallsBackToHidden(fallback)).toBe(true);
    expect(appFallsBackToHidden(`#app { overflow-x: clip }`)).toBe(false);
    expect(appClips(fallback)).toBe(true);
    expect(appClips(`#app { overflow: clip visible }`)).toBe(true);
    expect(appClips(`#app { overflow-x: visible }`)).toBe(false);
    expect(appClips(`@media (min-width: 640px) { #app { overflow-x: clip } }`)).toBe(false);
  });

  it("walks up through the files that render a sticky element, and the slots it lands in", () => {
    const app = (cls) => fixture("App.vue", `<FrappeUIProvider><div class="${cls}"><Page /></div></FrappeUIProvider>`, `import Page from "./Page.vue";`);
    const page = fixture("Page.vue", `<Frame><template v-if="on"><Card /></template></Frame>`, `import Frame from "./Frame.vue";\nimport Card from "./Card.vue";`);
    const frame = (cls) => fixture("Frame.vue", `<div class="${cls}"><slot /></div>`);
    const card = (cls) => fixture("Card.vue", `<div class="${cls}"><h2 class="sticky top-[${HEADER_TOP}]" /></div>`);
    const traps = (...sfcs) => stickyTraps(new Map(sfcs), effects, {});

    expect(traps(app("overflow-x-clip"), page, frame("overflow-visible"), card("p-4"))).toEqual([]);
    expect(traps(app("flex overflow-x-hidden"), page, frame(""), card(""))).toEqual(["src/App.vue:1 <div> overflow-x-hidden holds src/Card.vue:1 <h2>"]);
    expect(traps(app("[overflow-x:hidden]"), page, frame(""), card(""))).toEqual(["src/App.vue:1 <div> [overflow-x:hidden] holds src/Card.vue:1 <h2>"]);
    expect(traps(app(""), page, frame("sm:overflow-y-auto"), card(""))).toEqual(["src/Frame.vue:1 <div> sm:overflow-y-auto holds src/Card.vue:1 <h2>"]);
    expect(traps(app(""), page, frame(""), card("overflow-x-hidden"))).toEqual(["src/Card.vue:1 <div> overflow-x-hidden holds src/Card.vue:1 <h2>"]);
    // a file left to its own scroll area is skipped, and so is what it renders
    expect(stickyTraps(new Map([app("overflow-x-hidden"), page, frame(""), card("overflow-x-hidden")]), effects, { "src/Card.vue": "own" })).toEqual([]);
  });

  it("asks a frappe-ui component with a sticky child to force its root visible", () => {
    const tabs = (cls) => fixture("Tabs.vue", `<div><Tabs class="${cls} [&>[role=tablist]]:sticky [&>[role=tablist]]:top-[${HEADER_TOP}]" /></div>`, `import { Tabs } from "frappe-ui";`);
    expect(stickyTraps(new Map([tabs("!overflow-visible")]), effects, {})).toEqual([]);
    expect(stickyTraps(new Map([tabs("overflow-visible")]), effects, {})).toEqual(["src/Tabs.vue:1 <Tabs> makes a child sticky, but its own root may scroll: add !overflow-visible"]);
    expect(stickyTraps(new Map([tabs("!overflow-visible overflow-x-hidden")]), effects, {})).toEqual(["src/Tabs.vue:1 <Tabs> overflow-x-hidden holds src/Tabs.vue:1 <Tabs>"]);
    // frappe-ui's Tabs root clips, which is why: if this changes, the rule can go
    expect(fs.readFileSync(path.join(appDir, "node_modules/frappe-ui/src/components/Tabs/Tabs.vue"), "utf8")).toMatch(/<TabsRoot[^>]*class="[^"]*\boverflow-hidden\b/);
  });

  it("finds sticky tops that aren't the header's height", () => {
    const sfc = (tag, cls) => new Map([fixture("X.vue", `<${tag} class="${cls}" />`)]);
    expect(stickyOffsets(sfc("div", `sticky top-[${HEADER_TOP}]`), effects, {})).toEqual([]);
    expect(stickyOffsets(sfc("div", "sticky top-[52px] sm:top-[56px]"), effects, {})).toEqual(["src/X.vue:1 <div> top-[52px] sm:top-[56px]"]);
    expect(stickyOffsets(sfc("div", `sticky top-[${HEADER_TOP}] sm:top-[56px]`), effects, {})).toEqual(["src/X.vue:1 <div> sm:top-[56px]"]);
    expect(stickyOffsets(sfc("div", "sticky"), effects, {})).toEqual(["src/X.vue:1 <div> no top"]);
    expect(stickyOffsets(sfc("header", `sticky top-0 h-[${HEADER_TOP}]`), effects, {})).toEqual([]);
    expect(stickyOffsets(sfc("header", "sticky top-0 h-13"), effects, {})).toEqual([`src/X.vue:1 <header> height isn't h-[${HEADER_TOP}]`]);
  });
});
