import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

/**
 * Static Architectural Guard: Copy Standards & Native Dialog Prohibition (Issue #44)
 *
 * Enforces:
 * 1. Zero native browser `confirm(` or `alert(` calls in production code (use Frappe-UI dialogs/toasts).
 * 2. Zero internal technical acronyms like "WAL" exposed to end-users inside `__()` translations.
 * 3. Zero redundant fallback patterns such as `__('x') || 'x'`.
 */

function getSourceFiles(dir) {
  let files = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "test" || entry.name === "node_modules") continue;
      files = files.concat(getSourceFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".vue") || entry.name.endsWith(".js"))) {
      if (entry.name.endsWith(".spec.js") || entry.name.endsWith(".test.js")) continue;
      files.push(fullPath);
    }
  }
  return files;
}

describe("Architectural Guard: Copy & Dialog Invariants (Issue #44)", () => {
  const srcDir = path.resolve(__dirname, "../../src");
  const sourceFiles = getSourceFiles(srcDir);

  it("found source files in src/", () => {
    expect(sourceFiles.length).toBeGreaterThan(0);
  });

  it("enforces zero native confirm() or alert() calls in production source files", () => {
    const violations = [];
    const nativeDialogRegex = /(?:^|[^.\w$])(confirm|alert)\s*\(/;

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        // Ignore comments
        if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;
        // Ignore window.frappe.show_alert
        if (line.includes("show_alert")) continue;

        if (nativeDialogRegex.test(line)) {
          violations.push({
            file: path.relative(srcDir, filePath),
            line: i + 1,
            snippet: line.trim(),
          });
        }
      }
    }

    expect(
      violations,
      `Native confirm()/alert() calls detected in production source files: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });

  it("enforces zero user-facing __() translation strings containing 'WAL' acronym", () => {
    const violations = [];
    const walTranslationRegex = /__\(\s*["'][^"']*\bWAL\b[^"']*["']\s*\)/g;

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

        if (walTranslationRegex.test(line)) {
          violations.push({
            file: path.relative(srcDir, filePath),
            line: i + 1,
            snippet: line.trim(),
          });
        }
      }
    }

    expect(
      violations,
      `User-facing translation strings containing 'WAL' jargon detected: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });

  it("enforces zero redundant translation fallbacks (__('x') || 'x')", () => {
    const violations = [];
    const redundantFallbackRegex = /__\(\s*["'][^"']+["']\s*\)\s*\|\|\s*["'][^"']+["']/g;

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      const lines = content.split("\n");
      for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (line.trim().startsWith("//") || line.trim().startsWith("*")) continue;

        if (redundantFallbackRegex.test(line)) {
          violations.push({
            file: path.relative(srcDir, filePath),
            line: i + 1,
            snippet: line.trim(),
          });
        }
      }
    }

    expect(
      violations,
      `Redundant translation fallbacks (__('x') || 'x') detected: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });

  it("enforces sentence-case copy for standardized action strings (Issue #44)", () => {
    const forbiddenPhrases = [
      "Force Sync All Now",
      "Open Recovery & Verification Suite",
      "Download All for Offline",
      "Survey Response Code",
      "Thank You!",
      "Pending server database sync",
    ];

    const violations = [];

    for (const filePath of sourceFiles) {
      const content = fs.readFileSync(filePath, "utf-8");
      for (const phrase of forbiddenPhrases) {
        if (content.includes(phrase)) {
          violations.push({
            file: path.relative(srcDir, filePath),
            phrase,
          });
        }
      }
    }

    expect(
      violations,
      `Forbidden Title Case phrases detected: ${JSON.stringify(violations, null, 2)}`
    ).toEqual([]);
  });
});
