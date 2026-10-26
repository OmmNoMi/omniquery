import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Static Architectural Guard: Thin HTML Shell (Issue #45, #49)", () => {
	const htmlPath = path.resolve(__dirname, "../../omniquery/www/omniquery.html");

	it("omniquery.html is thin and strictly <= 40 lines", () => {
		const content = fs.readFileSync(htmlPath, "utf-8");
		const lines = content.split("\n").filter((l) => l.trim().length > 0);
		expect(lines.length).toBeLessThanOrEqual(40);
	});

	it("omniquery.html binds dynamic lang attribute", () => {
		const content = fs.readFileSync(htmlPath, "utf-8");
		expect(content).toMatch(/<html[^>]*lang="{{[^}]*lang[^}]*}}"/);
	});

	it("omniquery.html contains no duplicate inline splash markup", () => {
		const content = fs.readFileSync(htmlPath, "utf-8");
		expect(content).not.toContain("Initializing offline cache");
		expect(content).not.toContain("splash-spinner");
		expect(content).not.toContain("@keyframes spin");
	});
});
