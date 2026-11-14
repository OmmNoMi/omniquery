import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Architectural Guard: App.vue Thin Shell & Views Decomposition (Issue #46)
 *
 * Enforces:
 * 1. src/App.vue is under 200 lines.
 * 2. Dedicated view components exist in src/views:
 *    - src/views/Catalog.vue
 *    - src/views/Survey.vue
 *    - src/views/Success.vue
 * 3. CompactHeader takes at most 2 props.
 * 4. App.vue provides the session and the views read it, with no props or emits.
 */

describe("Architectural Guard: App.vue Split & Views Decomposition (Issue #46)", () => {
  const rootDir = path.resolve(__dirname, "../../src");
  const appVuePath = path.join(rootDir, "App.vue");
  const compactHeaderPath = path.join(rootDir, "components/header/CompactHeader.vue");
  const viewsDir = path.join(rootDir, "views");

  it("enforces App.vue is under 200 lines", () => {
    expect(fs.existsSync(appVuePath)).toBe(true);
    const content = fs.readFileSync(appVuePath, "utf-8");
    const lines = content.split("\n");
    expect(
      lines.length,
      `App.vue has ${lines.length} lines, but must be under 200 lines`
    ).toBeLessThan(200);
  });

  it("enforces that src/views/{Catalog,Survey,Success}.vue all exist", () => {
    const requiredViews = ["Catalog.vue", "Survey.vue", "Success.vue"];
    for (const viewName of requiredViews) {
      const viewPath = path.join(viewsDir, viewName);
      expect(
        fs.existsSync(viewPath),
        `Required view component src/views/${viewName} does not exist`
      ).toBe(true);
    }
  });

  it("enforces that CompactHeader takes at most 2 props", () => {
    expect(fs.existsSync(compactHeaderPath)).toBe(true);
    const content = fs.readFileSync(compactHeaderPath, "utf-8");

    const definePropsIndex = content.indexOf("defineProps(");
    expect(definePropsIndex).toBeGreaterThan(-1);

    const startBrace = content.indexOf("{", definePropsIndex);
    let depth = 0;
    let endBrace = -1;
    for (let i = startBrace; i < content.length; i++) {
      if (content[i] === "{") depth++;
      else if (content[i] === "}") {
        depth--;
        if (depth === 0) {
          endBrace = i;
          break;
        }
      }
    }
    const propBlock = content.slice(startBrace + 1, endBrace);
    const topLevelProps = [];
    let innerDepth = 0;
    const lines = propBlock.split("\n");
    for (const line of lines) {
      if (innerDepth === 0) {
        const keyMatch = line.match(/^\s*(\w+)\s*:/);
        if (keyMatch) topLevelProps.push(keyMatch[1]);
      }
      for (const char of line) {
        if (char === "{" || char === "[") innerDepth++;
        else if (char === "}" || char === "]") innerDepth--;
      }
    }

    expect(
      topLevelProps.length,
      `CompactHeader takes ${topLevelProps.length} props (${topLevelProps.join(", ")}), but must take at most 2 props`
    ).toBeLessThanOrEqual(2);
  });

  // file shape only: src/__tests__/App.spec.js mounts the shell to prove it actually renders
  it("App.vue provides the session and the views read it instead of taking props", () => {
    const appContent = fs.readFileSync(appVuePath, "utf-8");
    expect(appContent, "App.vue must call provideSurveyApp()").toMatch(/provideSurveyApp\(\)/);
    for (const viewName of ["Catalog.vue", "Survey.vue", "Success.vue"]) {
      const view = fs.readFileSync(path.join(viewsDir, viewName), "utf-8");
      expect(view, `${viewName} must read useSurveySession()`).toMatch(/useSurveySession\(\)/);
      expect(view.includes("defineProps("), `${viewName} must not take props from App.vue`).toBe(false);
      expect(view.includes("$emit("), `${viewName} must call the session, not emit up to App.vue`).toBe(false);
    }
  });
});
