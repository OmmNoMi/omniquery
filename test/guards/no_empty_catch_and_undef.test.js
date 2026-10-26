import { describe, it, expect } from "vitest";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../..");
const appVuePath = path.resolve(appRoot, "src/App.vue");

describe("Static Architectural Guard: Zero Empty Catch and No Undefined DB (Issue #31)", () => {
  it("enforces that App.vue explicitly imports db from ./services/db", () => {
    const content = fs.readFileSync(appVuePath, "utf-8");
    const hasDbImport = /import\s+.*\{[^}]*\bdb\b[^}]*\}\s+from\s+["']\.\/services\/db["']/.test(content);
    expect(hasDbImport, "App.vue must import { db } from './services/db'").toBe(true);
  });

  it("enforces zero empty catch blocks across App.vue", () => {
    const content = fs.readFileSync(appVuePath, "utf-8");
    const emptyCatchRegex = /catch\s*\([^)]*\)\s*\{\s*\}/g;
    const matches = content.match(emptyCatchRegex) || [];
    expect(matches.length, `Found ${matches.length} empty catch blocks in App.vue: fail-silent prohibited`).toBe(0);
  });

  it("fails when a mutant file containing an empty catch block or missing db import is introduced", () => {
    const mutantCode = `
      <script setup>
      try {
        db.responses.put({ id: 1 });
      } catch (e) {}
      </script>
    `;
    const hasDbImport = /import\s+.*\{[^}]*\bdb\b[^}]*\}\s+from\s+["']\.\/services\/db["']/.test(mutantCode);
    const emptyCatchRegex = /catch\s*\([^)]*\)\s*\{\s*\}/g;
    const matches = mutantCode.match(emptyCatchRegex) || [];

    expect(hasDbImport).toBe(false);
    expect(matches.length).toBe(1);
  });
});
