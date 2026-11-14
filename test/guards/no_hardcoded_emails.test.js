import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles.js";

// A hard-coded address is an invented identity or support contact: use the session or the project instead (#51).
const EMAIL = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
const EXTENSIONS = [".vue", ".js", ".ts", ".py", ".html"];
// The app's own publisher address, which Frappe reads from hooks.py.
const ALLOWED = new Set(["omniquery/hooks.py: omniquery@ommnomi.com"]);

const appRoot = path.resolve(__dirname, "../..");

function hardcodedEmails(roots, base) {
  return getSourceFiles(roots, EXTENSIONS)
    .flatMap((file) => {
      const relative = path.relative(base, file);
      return (fs.readFileSync(file, "utf-8").match(EMAIL) || []).map((email) => `${relative}: ${email}`);
    })
    .filter((hit) => !ALLOWED.has(hit));
}

describe("Static Architectural Guard: no hard-coded email addresses (#51)", () => {
  it("has no email address in the PWA or the server code", () => {
    const offenders = hardcodedEmails([path.join(appRoot, "src"), path.join(appRoot, "omniquery")], appRoot);
    expect(offenders, "read it from the session or the project").toEqual([]);
  });

  it("catches an address in a component, a server file or a page, but not in a test", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "email-mutant-"));
    try {
      fs.writeFileSync(path.join(dir, "Header.vue"), `<p>{{ user || "surveyor@example.com" }}</p>`);
      fs.writeFileSync(path.join(dir, "api.py"), `recipient = "admin@example.local"`);
      fs.writeFileSync(path.join(dir, "page.html"), `<a href="mailto:help@example.org">Help</a>`);
      fs.writeFileSync(path.join(dir, "Header.spec.js"), `const user = "fixture@example.com";`);
      expect(hardcodedEmails([dir], dir).sort()).toEqual([
        "Header.vue: surveyor@example.com",
        "api.py: admin@example.local",
        "page.html: help@example.org",
      ]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
