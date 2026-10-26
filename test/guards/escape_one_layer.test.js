import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Static Architectural Guard: Escape One Layer (#49)", () => {
	const baseModalPath = path.resolve(
		__dirname,
		"../../src/components/common/BaseModal.vue"
	);

	it("BaseModal stops event propagation on Escape keydown so only the top modal closes", () => {
		const content = fs.readFileSync(baseModalPath, "utf-8");
		const fnIdx = content.indexOf("function handleKeyDown");
		expect(fnIdx).toBeGreaterThan(-1);
		const fnBlock = content.slice(fnIdx, fnIdx + 200);
		expect(fnBlock).toContain("e.stopPropagation()");
	});
});
