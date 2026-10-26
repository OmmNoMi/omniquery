import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { parse } from "@vue/compiler-sfc";

function scanJsFiles(dir) {
	let files = [];
	for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
		const full = path.join(dir, entry.name);
		if (entry.isDirectory()) {
			if (entry.name !== "__tests__" && entry.name !== "test") {
				files = files.concat(scanJsFiles(full));
			}
		} else if (entry.isFile() && (entry.name.endsWith(".js") || entry.name.endsWith(".vue"))) {
			files.push(full);
		}
	}
	return files;
}

describe("Static Architectural Guard: no_undef and Syntax Cleanliness (#49)", () => {
	const srcDir = path.resolve(__dirname, "../../src");
	const files = scanJsFiles(srcDir);

	it("verifies all Vue components parse cleanly without template/script syntax errors", () => {
		const vueFiles = files.filter((f) => f.endsWith(".vue"));
		expect(vueFiles.length).toBeGreaterThan(0);

		for (const file of vueFiles) {
			const content = fs.readFileSync(file, "utf-8");
			const { errors } = parse(content);
			expect(errors, `SFC parse errors in ${file}`).toEqual([]);
		}
	});

	it("verifies no undeclared global variables or legacy undefined tokens exist in utils", () => {
		const utilsDir = path.resolve(__dirname, "../../src/utils");
		const utilFiles = fs.readdirSync(utilsDir).filter((f) => f.endsWith(".js"));

		for (const u of utilFiles) {
			const full = path.join(utilsDir, u);
			const content = fs.readFileSync(full, "utf-8");
			expect(content).not.toContain("window.nonExistentGlobalVariable");
			expect(content).not.toMatch(/\bundefinedGlobalVariable\b/);
		}
	});
});
