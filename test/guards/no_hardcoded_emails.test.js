import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, "../../src");

const EMAIL_REGEX = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;

export function findHardcodedEmails(dir) {
  let violations = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "test") continue;
      violations = violations.concat(findHardcodedEmails(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".vue") || entry.name.endsWith(".js"))) {
      if (entry.name.endsWith(".spec.js") || entry.name.endsWith(".test.js")) continue;
      const content = fs.readFileSync(fullPath, "utf-8");
      const matches = content.match(EMAIL_REGEX);
      if (matches) {
        for (const match of matches) {
          violations.push({
            file: path.relative(srcRoot, fullPath),
            email: match,
          });
        }
      }
    }
  }
  return violations;
}

describe("Static Architectural Guard: Zero Hardcoded Email Addresses (Issue #51)", () => {
  it("enforces zero hard-coded email addresses across src/", () => {
    const violations = findHardcodedEmails(srcRoot);
    if (violations.length > 0) {
      const details = violations.map((v) => `  - ${v.file}: ${v.email}`).join("\n");
      expect.fail(`Found hard-coded email address(es) in src/:\n${details}\nUse dynamic session or project context instead of invented identities.`);
    }
    expect(violations).toHaveLength(0);
  });

  it("fails when a mutant file containing a hard-coded email is introduced", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "email-mutant-"));
    const mutantFile = path.join(tempDir, "MutantHeader.vue");
    fs.writeFileSync(mutantFile, `<template><div>fallback: user@example.com</div></template>`, "utf-8");

    try {
      const violations = findHardcodedEmails(tempDir);
      expect(violations.length).toBeGreaterThan(0);
      expect(violations[0].email).toBe("user@example.com");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
