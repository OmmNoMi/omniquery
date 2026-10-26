import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Template and Response Permission Hooks Guards (#48)", () => {
	const permissionsPyPath = path.resolve(
		__dirname,
		"../../omniquery/permissions.py"
	);

	it("permissions.py does not wrap already-escaped project list in redundant quotes", () => {
		const content = fs.readFileSync(permissionsPyPath, "utf-8");
		expect(content).not.toContain("IN ('{proj_list}')");
		expect(content).not.toContain("', '".join);
		expect(content).toContain("IN ({proj_list})");
	});

	it("get_template_query_conditions includes is_public_citizen_link when projects exist", () => {
		const content = fs.readFileSync(permissionsPyPath, "utf-8");
		// Ensure is_public_citizen_link is present in the final return condition
		const match = content.match(/return f"\(.*is_public_citizen_link.*\)"/);
		expect(match).not.toBeNull();
	});

	it("has_template_permission and has_response_permission return None for unhandled ptypes", () => {
		const content = fs.readFileSync(permissionsPyPath, "utf-8");
		// has_template_permission must end with return None
		const tmplFn = content.slice(content.indexOf("def has_template_permission"), content.indexOf("def _can_read_template"));
		expect(tmplFn).toContain("return None");
		expect(tmplFn).not.toMatch(/return False\s*$/);

		// has_response_permission must end with return None
		const respFn = content.slice(content.indexOf("def has_response_permission"), content.indexOf("def _can_read_response"));
		expect(respFn).toContain("return None");
		expect(respFn).not.toMatch(/return False\s*$/);
	});
});
