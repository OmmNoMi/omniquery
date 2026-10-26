import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("No Legacy PWA Guard (Issue #36)", () => {
  const pwaDir = path.resolve(__dirname, "../../omniquery/public/pwa");
  const swPath = path.resolve(pwaDir, "sw.js");

  it("does not ship legacy duplicate PWA files (app.js, index.html, style.css, vendor)", () => {
    const forbiddenFiles = [
      "app.js",
      "index.html",
      "style.css",
      "vendor",
      "vendor/tailwindcss.js",
      "vendor/dexie.min.js",
      "vendor/vue.global.prod.js",
    ];

    for (const relFile of forbiddenFiles) {
      const fullPath = path.join(pwaDir, relFile);
      expect(
        fs.existsSync(fullPath),
        `Legacy PWA file should be removed: ${relFile}`
      ).toBe(false);
    }
  });

  it("service worker does not reference legacy pwa/index.html or pwa/app.js in fallback", () => {
    const swContent = fs.readFileSync(swPath, "utf-8");
    expect(swContent).not.toContain("/assets/omniquery/pwa/index.html");
    expect(swContent).not.toContain("/assets/omniquery/pwa/app.js");
    expect(swContent).toContain("caches.match('/omniquery')");
  });
});
