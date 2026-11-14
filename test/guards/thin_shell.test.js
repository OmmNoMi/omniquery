import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

// The page is a mount point: Vue renders everything, the shell only boots it (#45, #49).
// Checked by structure, not line count, so a needed <meta> or <link> never turns CI red.
const shell = fs.readFileSync(path.resolve(__dirname, "../../omniquery/www/omniquery.html"), "utf-8");
const scripts = [...shell.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/g)];

describe("Static Architectural Guard: Thin HTML Shell (Issue #45, #49)", () => {
  it("carries no styles of its own", () => {
    expect(shell).not.toMatch(/<style\b/);
    expect(shell).not.toMatch(/\sstyle=/);
  });

  it("loads the bundle and one inline boot script, nothing else", () => {
    const external = scripts.filter(([, attrs]) => /\bsrc=/.test(attrs)).map(([, attrs]) => attrs.match(/src="([^"?]+)/)[1]);
    expect(external).toEqual(["/assets/omniquery/dist/omniquery.bundle.js"]);
    expect(scripts.filter(([, attrs]) => !/\bsrc=/.test(attrs))).toHaveLength(1);
  });

  it("mounts into an #app that holds only the loading status", () => {
    const app = shell.match(/<div id="app">([\s\S]*?)<\/div>/)?.[1].trim();
    expect(app).toMatch(/^<p role="status"[^>]*>[^<]*<\/p>$/);
  });

  it("binds dynamic lang attribute", () => {
    expect(shell).toMatch(/<html[^>]*lang="{{[^}]*lang[^}]*}}"/);
  });

  it("contains no duplicate inline splash markup", () => {
    expect(shell).not.toContain("Initializing offline cache");
    expect(shell).not.toContain("splash-spinner");
    expect(shell).not.toContain("@keyframes spin");
  });
});
