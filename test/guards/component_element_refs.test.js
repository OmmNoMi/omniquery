import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles.js";

// A ref on a frappe-ui component holds the component, not its element (#117). Button renders a
// fragment, so its $el is a text node with no focus(); its <button> is rootRef, which Button sets
// only after the parent's ref callback has run. So keep the component and read rootRef where the
// element is focused or compared: `refs[i] = el` and later `refs[i]?.rootRef?.focus()`.
const BROKEN = [
  { pattern: /\$el\b/, why: "$el of a frappe-ui component is not its element" },
  { pattern: /\bel\??\.rootRef\b/, why: "rootRef is not set yet inside a ref callback" },
];

const appRoot = path.resolve(__dirname, "../..");

function brokenElementRefs(roots, base) {
  return getSourceFiles(roots).flatMap((file) =>
    fs
      .readFileSync(file, "utf-8")
      .split("\n")
      .flatMap((line, i) =>
        BROKEN.filter(({ pattern }) => pattern.test(line)).map(
          ({ why }) => `${path.relative(base, file)}:${i + 1}: ${why}`,
        ),
      ),
  );
}

describe("Static Architectural Guard: a component ref is read for its element at use (#117)", () => {
  it("has no $el and no rootRef read in a ref callback in the PWA", () => {
    expect(brokenElementRefs([path.join(appRoot, "src")], appRoot)).toEqual([]);
  });

  it("catches both broken forms, but not the component kept and dereferenced later", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "element-ref-mutant-"));
    try {
      fs.writeFileSync(
        path.join(dir, "Card.vue"),
        [
          `<Button :ref="(el) => { if (el) refs[i] = el.$el || el; }" />`,
          `<Button :ref="(el) => { if (el) refs[i] = el?.rootRef; }" />`,
          `<Button :ref="(el) => { if (el) refs[i] = el; }" />`,
          `const focusIt = (i) => refs.value[i]?.rootRef?.focus();`,
        ].join("\n"),
      );
      fs.writeFileSync(path.join(dir, "Card.spec.js"), `wrapper.vm.$el.focus();`);
      expect(brokenElementRefs([dir], dir)).toEqual([
        "Card.vue:1: $el of a frappe-ui component is not its element",
        "Card.vue:2: rootRef is not set yet inside a ref callback",
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
