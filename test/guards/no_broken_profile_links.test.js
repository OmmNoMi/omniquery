import { describe, it, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getSourceFiles } from "./sourceFiles.js";

// Frappe 16 has no user-profile page under /app or /desk. A signed-in user's own account page is /me (#52).
const BROKEN_PROFILE_ROUTE = /\/(app|desk)\/user-profile/;
const EXTENSIONS = [".vue", ".js", ".ts", ".py", ".html"];

const appRoot = path.resolve(__dirname, "../..");

function filesWithBrokenProfileRoute(roots) {
  return getSourceFiles(roots, EXTENSIONS)
    .filter((file) => BROKEN_PROFILE_ROUTE.test(fs.readFileSync(file, "utf-8")))
    .map((file) => path.relative(appRoot, file));
}

describe("Static Architectural Guard: no broken profile links (#52)", () => {
  it("links nowhere to the missing /app/user-profile or /desk/user-profile page", () => {
    const offenders = filesWithBrokenProfileRoute([path.join(appRoot, "src"), path.join(appRoot, "omniquery")]);
    expect(offenders, "link to /me instead").toEqual([]);
  });

  it("catches the broken route in a script, a template or a server page", () => {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "profile-link-mutant-"));
    try {
      fs.writeFileSync(path.join(dir, "Header.vue"), `<a href="/app/user-profile">Profile</a>`);
      fs.writeFileSync(path.join(dir, "nav.ts"), `router.push("/desk/user-profile")`);
      fs.writeFileSync(path.join(dir, "page.html"), `<a href="/me">Account</a>`);
      expect(filesWithBrokenProfileRoute([dir]).map((f) => path.basename(f)).sort()).toEqual(["Header.vue", "nav.ts"]);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
});
