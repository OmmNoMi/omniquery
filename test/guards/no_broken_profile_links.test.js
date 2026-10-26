import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const srcRoot = path.resolve(__dirname, "../../src");

function scanDirectory(dir, testFn) {
  let violations = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "__tests__" || entry.name === "test") continue;
      violations = violations.concat(scanDirectory(fullPath, testFn));
    } else if (entry.isFile() && (entry.name.endsWith(".vue") || entry.name.endsWith(".js"))) {
      if (entry.name.endsWith(".spec.js") || entry.name.endsWith(".test.js")) continue;
      const content = fs.readFileSync(fullPath, "utf-8");
      const err = testFn(content, fullPath);
      if (err) {
        violations.push({ file: path.relative(srcRoot, fullPath), message: err });
      }
    }
  }
  return violations;
}

describe("Static Architectural Guard: Zero Broken Profile Links & No ERPNext Dependency (Issue #52)", () => {
  it("enforces that no file in src/ references non-existent /app/user-profile", () => {
    const violations = scanDirectory(srcRoot, (content) => {
      if (content.includes("/app/user-profile") || content.includes("/desk/user-profile")) {
        return "references non-existent user-profile page; use Frappe standard /me";
      }
      return null;
    });

    expect(violations).toHaveLength(0);
  });

  it("enforces zero references to ERPNext in frontend copy (OmniQuery is pure Frappe native)", () => {
    const violations = scanDirectory(srcRoot, (content) => {
      if (/ERPNext/i.test(content)) {
        return "contains ERPNext reference; OmniQuery is Frappe-native and independent of ERPNext";
      }
      return null;
    });

    expect(violations).toHaveLength(0);
  });
});
