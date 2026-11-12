import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../..");
const srcDir = path.resolve(appRoot, "src");

const FORBIDDEN_CUSTOMER_PATTERNS = [
  "RGAVP",
  "Rajasthan",
  "18001026664",
  "OQW-0",
];

function scanDirectory(dir) {
  const violations = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "dist" && entry.name !== ".git") {
        violations.push(...scanDirectory(fullPath));
      }
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name);
      if ([".vue", ".js", ".ts", ".html"].includes(ext)) {
        const content = fs.readFileSync(fullPath, "utf-8");
        const lines = content.split("\n");
        lines.forEach((line, idx) => {
          for (const pattern of FORBIDDEN_CUSTOMER_PATTERNS) {
            if (line.includes(pattern)) {
              violations.push({
                file: path.relative(appRoot, fullPath),
                line: idx + 1,
                pattern,
                text: line.trim(),
              });
            }
          }
        });
      }
    }
  }
  return violations;
}

describe("Static Architectural Guard: Zero Customer-Specific Content (Issue #14)", () => {
  it("enforces zero occurrences of customer-specific content (RGAVP, Rajasthan, 18001026664, OQW-0) in src/", () => {
    const violations = scanDirectory(srcDir);
    if (violations.length > 0) {
      console.error(
        `Found ${violations.length} forbidden customer content violations:\n` +
          violations
            .map((v) => `  ${v.file}:${v.line} [${v.pattern}] -> ${v.text}`)
            .join("\n")
      );
    }
    expect(
      violations,
      `Forbidden customer-specific content found in src/:\n` +
        violations.map((v) => `${v.file}:${v.line} (${v.pattern})`).join("\n")
    ).toEqual([]);
  });
});
