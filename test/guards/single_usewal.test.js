import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

function scanDir(dir) {
	let files = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "__tests__" && entry.name !== "test") {
				files = files.concat(scanDir(full));
			}
		} else if (entry.isFile() && (entry.name.endsWith(".vue") || entry.name.endsWith(".js"))) {
			files.push(full);
		}
	}
	return files;
}

describe("Static Architectural Guard: Single useWAL Instance (#49)", () => {
	const componentsDir = path.resolve(__dirname, "../../src/components");
	const viewsDir = path.resolve(__dirname, "../../src/views");

	it("forbids calling useWAL() in components or views (must inject omniqueryContext)", () => {
		const componentFiles = [...scanDir(componentsDir), ...scanDir(viewsDir)];
		const violations = [];

		for (const file of componentFiles) {
			const content = fs.readFileSync(file, "utf-8");
			if (/\buseWAL\s*\(/.test(content)) {
				violations.push(path.relative(path.resolve(__dirname, "../.."), file));
			}
		}

		expect(
			violations,
			`useWAL() must only be instantiated once at root (useSurveyApp.js / App.vue) and injected via omniqueryContext. Violations in: ${violations.join(", ")}`
		).toEqual([]);
	});
});
