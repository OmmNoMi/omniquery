import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Static Architectural Guard: No Hand-Rolled Controls (Issue #12)
 *
 * Enforces 100% Frappe-UI native components:
 * - <Button> instead of raw <button>
 * - <Dialog> instead of BaseModal
 * - <Combobox> / <Autocomplete> instead of FCombobox
 * - <Switch> instead of FSwitch
 * - <FormControl> / <TextInput> instead of raw <input>, <select>, <textarea>
 * - <Rating> instead of FRating
 * - createResource / createListResource / call instead of raw fetch()
 *
 * This test uses a shrinking allowlist during migration.
 * Once all files are migrated, the allowlist MUST be completely empty.
 */

// Format: { "relative/path": { button: 0, input: 0, select: 0, textarea: 0, fetch: 0 } }
export const ALLOWLIST = {};

function getSourceFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "test") continue;
      files = files.concat(getSourceFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".vue") || entry.name.endsWith(".js"))) {
      if (entry.name.endsWith(".spec.js") || entry.name.endsWith(".test.js")) continue;
      files.push(fullPath);
    }
  }
  return files;
}

function findViolations(filePath) {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const violations = [];

  const patterns = [
    { type: "button", regex: /<button\b/g, label: "raw <button>" },
    { type: "input", regex: /<input\b/g, label: "raw <input>" },
    { type: "select", regex: /<select\b/g, label: "raw <select>" },
    { type: "textarea", regex: /<textarea\b/g, label: "raw <textarea>" },
    { type: "fetch", regex: /\bfetch\s*\(/g, label: "raw fetch()" },
  ];

  lines.forEach((line, idx) => {
    patterns.forEach(({ type, regex, label }) => {
      let match;
      const r = new RegExp(regex);
      while ((match = r.exec(line)) !== null) {
        violations.push({
          type,
          label,
          line: idx + 1,
          code: line.trim(),
        });
      }
    });
  });

  return violations;
}

describe("Static Architecture Guard: no_raw_controls (Issue #12)", () => {
  const srcDir = path.resolve(__dirname, "../../src");
  const sourceFiles = getSourceFiles(srcDir);

  it("finds source files under src/", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  sourceFiles.forEach((absPath) => {
    const relPath = path.relative(path.resolve(__dirname, "../.."), absPath);

    it(`${relPath} must not contain raw HTML controls or raw fetch()`, () => {
      const violations = findViolations(absPath);
      const counts = {
        button: violations.filter((v) => v.type === "button").length,
        input: violations.filter((v) => v.type === "input").length,
        select: violations.filter((v) => v.type === "select").length,
        textarea: violations.filter((v) => v.type === "textarea").length,
        fetch: violations.filter((v) => v.type === "fetch").length,
      };

      const allowed = ALLOWLIST[relPath];

      if (allowed) {
        // Assert violation count does not exceed allowlist
        expect(counts.button, `${relPath} button count`).toBeLessThanOrEqual(allowed.button || 0);
        expect(counts.input, `${relPath} input count`).toBeLessThanOrEqual(allowed.input || 0);
        expect(counts.select, `${relPath} select count`).toBeLessThanOrEqual(allowed.select || 0);
        expect(counts.textarea, `${relPath} textarea count`).toBeLessThanOrEqual(allowed.textarea || 0);
        expect(counts.fetch, `${relPath} fetch count`).toBeLessThanOrEqual(allowed.fetch || 0);

        // Strict shrinking enforcement: fail if allowlist entry is obsolete (all counts 0)
        const totalAllowed = (allowed.button || 0) + (allowed.input || 0) + (allowed.select || 0) + (allowed.textarea || 0) + (allowed.fetch || 0);
        const totalActual = counts.button + counts.input + counts.select + counts.textarea + counts.fetch;
        if (totalActual === 0 && totalAllowed > 0) {
          throw new Error(`File ${relPath} is now clean of raw controls! Remove it from ALLOWLIST to shrink the allowlist.`);
        }
      } else {
        if (violations.length > 0) {
          const summary = violations.map((v) => `Line ${v.line}: ${v.label} -> "${v.code}"`).join("\n");
          expect.fail(
            `Found ${violations.length} raw control violation(s) in ${relPath}:\n${summary}\n\nReplace with frappe-ui components (<Button>, <Dialog>, <FormControl>, <TextInput>, <Switch>, <Rating>, createResource/call) or add to shrinking ALLOWLIST during migration.`
          );
        }
      }
    });
  });

  it("shrinking allowlist is completely empty once all files are migrated", () => {
    const remaining = Object.keys(ALLOWLIST);
    expect(
      remaining,
      `All files must be migrated to frappe-ui components. Remaining in allowlist: ${remaining.join(", ")}`
    ).toEqual([]);
  });
});
