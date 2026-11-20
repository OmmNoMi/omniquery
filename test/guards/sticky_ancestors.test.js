import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { appLayerClasses, ruleValue } from "./sourceFiles";

// A position: sticky element sticks to its nearest scroll container. `overflow-x: hidden` (with
// overflow-y left visible) computes overflow-y to auto, so the element becomes a scroll container
// even though it never scrolls. #app and App.vue's shell div both had it, so the header, the
// grouped and matrix question headers and the project tab strip stuck to a box that moved with the
// page, and scrolled away (#141). `overflow-x: clip` cuts the sideways overflow without making a
// scroll container. body keeps overflow-x: hidden, which CSS hands on to the viewport while html
// sets none (test/guards/scroll_lock.test.js).

const read = (file) => fs.readFileSync(path.resolve(__dirname, "../..", file), "utf8");

// Values of overflow that make an element a scroll container
const SCROLLS = /^(?:hidden|auto|scroll|overlay)$/;
// Tailwind classes that set one of them, on either axis
const SCROLL_CLASS = /^overflow(?:-[xy])?-(?:hidden|auto|scroll)$/;

// The overflow values in #app's own rule that make it a scroll container: ["overflow-x: hidden"]
export function appScrollOverflow(css) {
  return ["overflow", "overflow-x", "overflow-y"]
    .map((prop) => [prop, ruleValue(css, "#app", prop)])
    .filter(([, value]) => value && value.split(/\s+/).some((v) => SCROLLS.test(v)))
    .map(([prop, value]) => `${prop}: ${value}`);
}

// The classes on App.vue's shell div that make it a scroll container (any variant: sm:overflow-auto)
export const shellScrollClasses = (source) => appLayerClasses(source).filter((c) => SCROLL_CLASS.test(c.split(":").pop()));

describe("Sticky headers stick to the page", () => {
  it("keeps #app from being a scroll container", () => {
    expect(appScrollOverflow(read("src/styles/main.css")), "main.css #app: use overflow-x: clip").toEqual([]);
  });

  it("keeps App.vue's shell div from being a scroll container", () => {
    expect(shellScrollClasses(read("src/App.vue")), "App.vue shell div: use overflow-x-clip").toEqual([]);
    expect(appLayerClasses(read("src/App.vue")), "App.vue shell div still clips sideways overflow").toContain("overflow-x-clip");
  });

  it("finds every overflow that scrolls, and lets clip and visible through", () => {
    expect(appScrollOverflow(`#app { overflow-x: hidden }`)).toEqual(["overflow-x: hidden"]);
    expect(appScrollOverflow(`#app { overflow: clip auto } #app .x { overflow: hidden }`)).toEqual(["overflow: clip auto"]);
    expect(appScrollOverflow(`#app { overflow-x: clip; overflow-y: visible } body { overflow-x: hidden }`)).toEqual([]);
    const sfc = (cls) => `<template><FrappeUIProvider><div class="${cls}"><main class="overflow-auto"/></div></FrappeUIProvider></template>`;
    expect(shellScrollClasses(sfc("flex overflow-x-hidden"))).toEqual(["overflow-x-hidden"]);
    expect(shellScrollClasses(sfc("flex sm:overflow-y-auto overflow-hidden"))).toEqual(["sm:overflow-y-auto", "overflow-hidden"]);
    expect(shellScrollClasses(sfc("flex overflow-x-clip overflow-visible"))).toEqual([]);
  });
});
