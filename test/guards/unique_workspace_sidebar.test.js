import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const appRoot = path.resolve(__dirname, "../..");

function findFilesByName(dir, targetDirName) {
  let results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === "node_modules" || entry.name === ".git") continue;
      if (entry.name === targetDirName) {
        const jsonFiles = fs.readdirSync(fullPath).filter((f) => f.endsWith(".json"));
        for (const jf of jsonFiles) {
          results.push({
            name: jf,
            path: path.relative(appRoot, path.join(fullPath, jf)),
          });
        }
      } else {
        results = results.concat(findFilesByName(fullPath, targetDirName));
      }
    }
  }
  return results;
}

describe("Static Architectural Guard: Single Source of Truth for Workspace Sidebar (Issue #53)", () => {
  it("enforces that workspace_sidebar JSON definitions have unique names and do not diverge across directories", () => {
    const sidebarFiles = findFilesByName(appRoot, "workspace_sidebar");
    const nameMap = {};

    for (const file of sidebarFiles) {
      if (!nameMap[file.name]) {
        nameMap[file.name] = [];
      }
      nameMap[file.name].push(file.path);
    }

    const duplicates = Object.entries(nameMap).filter(([_, paths]) => paths.length > 1);

    if (duplicates.length > 0) {
      const details = duplicates
        .map(([name, paths]) => `  - ${name} duplicated in:\n    ${paths.join("\n    ")}`)
        .join("\n");
      expect.fail(`Found diverging duplicate workspace_sidebar definitions:\n${details}\nMaintain exactly one single source of truth under omniquery/omniquery/workspace_sidebar/.`);
    }

    expect(duplicates).toHaveLength(0);
  });
});
