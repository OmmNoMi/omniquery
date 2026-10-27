import { describe, it, expect } from "vitest";
import { spawnSync } from "node:child_process";
import path from "node:path";
import fs from "node:fs";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../..");
const scriptPath = path.resolve(appRoot, "scripts/check_no_glyphs.py");

describe("Static Architectural Guard: Zero Glyphs and Emojis (Issue #13)", () => {
  it("enforces zero emojis or glyph icons across src/, omniquery/api/, omniquery/locale/, and desk JS", () => {
    const result = spawnSync("python3", [scriptPath], {
      cwd: appRoot,
      encoding: "utf-8",
    });

    if (result.status !== 0) {
      console.error(result.stdout);
    }
    expect(result.status, `check_no_glyphs.py failed:\n${result.stdout}`).toBe(0);
  });

  it("fails and reports violations when a mutant file containing emojis or glyphs is introduced", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "glyph-mutant-"));
    const mutantFile = path.join(tempDir, "MutantComponent.vue");
    fs.writeFileSync(mutantFile, `<template><button>⚡ Sync</button></template>`, "utf-8");

    try {
      const result = spawnSync("python3", [scriptPath, mutantFile], {
        cwd: appRoot,
        encoding: "utf-8",
      });

      expect(result.status).toBe(1);
      expect(result.stdout).toContain("HIGH VOLTAGE SIGN");
      expect(result.stdout).toContain("MutantComponent.vue");
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});

