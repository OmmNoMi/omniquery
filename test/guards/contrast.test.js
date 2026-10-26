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
		} else if (entry.isFile() && entry.name.endsWith(".vue")) {
			files.push(full);
		}
	}
	return files;
}

describe("Static Architectural Guard: Accessible Text Contrast (WCAG 2.2 AA) (#49)", () => {
	const srcDir = path.resolve(__dirname, "../../src");

	it("forbids ultra-light text classes (text-slate-200, text-gray-200) without dark qualifier on light surfaces", () => {
		const vueFiles = scanDir(srcDir);
		const violations = [];

		for (const file of vueFiles) {
			const rel = path.relative(path.resolve(__dirname, "../.."), file);
			// FocusModeModal is a dark-themed modal container, so bare text-slate-200 is high-contrast
			if (rel.includes("FocusModeModal.vue")) continue;

			const content = fs.readFileSync(file, "utf-8");
			const lines = content.split("\n");

			lines.forEach((line, idx) => {
				// Match bare text-slate-200 or text-gray-200 that is NOT preceded by 'dark:' or 'hover:dark:'
				const match = line.match(/(?<!dark:)(?<!hover:)\btext-(?:slate|gray|zinc)-200\b/);
				if (match) {
					violations.push(`${rel}:${idx + 1} -> ${line.trim()}`);
				}
			});
		}

		expect(
			violations,
			`Found low-contrast text classes without dark: qualifier on light surfaces:\n${violations.join("\n")}`
		).toEqual([]);
	});
});
