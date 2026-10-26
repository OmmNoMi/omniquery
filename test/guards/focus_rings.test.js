import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Static Architectural Guard: Focus Ring Visibility (Issue #43)
 *
 * Enforces that any element suppressing the default browser outline via `focus:outline-none`
 * MUST provide an explicit `focus-visible:` focus indicator (such as `focus-visible:ring-2`)
 * so keyboard and switch users retain full focus visibility.
 */

function getSourceVueFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "test" || entry.name === "node_modules") continue;
      files = files.concat(getSourceVueFiles(fullPath));
    } else if (entry.isFile() && entry.name.endsWith(".vue")) {
      files.push(fullPath);
    }
  }
  return files;
}

function findFocusOutlineViolations(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations = [];

  // Match class strings containing focus:outline-none
  // e.g., class="..." or :class="[...]"
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (line.includes("focus:outline-none")) {
      // Check if line or multi-line class expression contains focus-visible:
      // Search a window of lines around it if class is multi-line
      let classBlock = line;
      for (let j = Math.max(0, i - 3); j <= Math.min(lines.length - 1, i + 3); j++) {
        classBlock += " " + lines[j];
      }

      if (!classBlock.includes("focus-visible:")) {
        violations.push({
          line: i + 1,
          snippet: line.trim(),
        });
      }
    }
  }

  return violations;
}

describe("Architectural Guard: Focus Ring Invariants (Issue #43)", () => {
  const srcDir = path.resolve(__dirname, "../../src");
  const vueFiles = getSourceVueFiles(srcDir);

  it("found Vue files in src/", () => {
    expect(vueFiles.length).toBeGreaterThan(0);
  });

  for (const filePath of vueFiles) {
    const relPath = path.relative(srcDir, filePath);
    it(`${relPath} has no focus:outline-none without focus-visible: partner`, () => {
      const violations = findFocusOutlineViolations(filePath);
      expect(
        violations,
        `File ${relPath} contains focus:outline-none without focus-visible: indicator at lines: ${JSON.stringify(violations)}`
      ).toEqual([]);
    });
  }
});
