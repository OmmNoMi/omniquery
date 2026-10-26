import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../..");

function scanForHardcodedDailyTarget(files) {
  const violations = [];
  const bannedPatterns = [
    /["']daily_target["']\s*:\s*10\b/,
    /dailyTarget\s*=\s*ref\(10\)/,
  ];

  for (const file of files) {
    if (!fs.existsSync(file)) continue;
    const content = fs.readFileSync(file, "utf-8");
    for (const pattern of bannedPatterns) {
      if (pattern.test(content)) {
        violations.push({ file, pattern: pattern.toString() });
      }
    }
  }
  return violations;
}

describe("Static Architectural Guard: Configurable Daily Target (Issue #55)", () => {
  it("enforces zero hardcoded daily targets in api and dashboard components", () => {
    const targetFiles = [
      path.resolve(appRoot, "omniquery/api/survey.py"),
      path.resolve(appRoot, "src/components/dashboard/SurveyorDashboard.vue"),
    ];

    const violations = scanForHardcodedDailyTarget(targetFiles);
    expect(violations, `Hardcoded daily target found in: ${JSON.stringify(violations)}`).toEqual([]);
  });

  it("fails when a mutant introduces a hardcoded daily target", () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "daily-target-mutant-"));
    const mutantFile = path.join(tempDir, "MutantDashboard.vue");
    fs.writeFileSync(mutantFile, "const dailyTarget = ref(10);", "utf-8");

    try {
      const violations = scanForHardcodedDailyTarget([mutantFile]);
      expect(violations.length).toBe(1);
      expect(violations[0].file).toBe(mutantFile);
    } finally {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
  });
});
