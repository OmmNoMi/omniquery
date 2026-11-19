import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const pkgRoot = path.resolve(__dirname, "../../omniquery");
const SIDEBAR = "omniquery/sidebar/omniquery/omniquery.json";

function sidebarFiles(dir, found = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name !== "node_modules" && entry.name !== "__pycache__") sidebarFiles(full, found);
    } else if (entry.name.endsWith(".json") && /(^|\/)(workspace_sidebar|sidebar)\//.test(path.relative(pkgRoot, full))) {
      found.push(path.relative(pkgRoot, full));
    }
  }
  return found;
}

// Issue #53: Frappe 16.51 imports only module-level Sidebar docs; a flat workspace_sidebar/*.json
// is never read, so a second copy silently diverges from what Desk shows.
describe("Static Architectural Guard: one module Sidebar (Issue #53)", () => {
  it("ships exactly the module Sidebar file and no ignored workspace_sidebar copies", () => {
    expect(sidebarFiles(pkgRoot)).toEqual([SIDEBAR]);
    const doc = JSON.parse(fs.readFileSync(path.join(pkgRoot, SIDEBAR), "utf-8"));
    expect([doc.doctype, doc.module, doc.standard]).toEqual(["Sidebar", "OmniQuery", 1]);
  });
});
