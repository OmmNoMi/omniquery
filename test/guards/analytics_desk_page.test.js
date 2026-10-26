import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";

describe("Analytics Desk Page and Workspace Navigation Guards (#47)", () => {
	const analyticsJsPath = path.resolve(
		__dirname,
		"../../omniquery/omniquery/page/omniquery_analytics/omniquery_analytics.js"
	);
	const sidebarJsonPath = path.resolve(
		__dirname,
		"../../omniquery/workspace_sidebar/omniquery.json"
	);
	const installPyPath = path.resolve(
		__dirname,
		"../../omniquery/install.py"
	);

	it("omniquery_analytics.js does not call nonexistent page.add_secondary_action", () => {
		const content = fs.readFileSync(analyticsJsPath, "utf-8");
		expect(content).not.toContain("page.add_secondary_action");
		expect(content).toContain("page.set_secondary_action");
	});

	it("workspace_sidebar/omniquery.json includes link to omniquery-analytics page", () => {
		const sidebar = JSON.parse(fs.readFileSync(sidebarJsonPath, "utf-8"));
		const pageItem = sidebar.items.find(
			(item) => item.link_to === "omniquery-analytics" && item.link_type === "Page"
		);
		expect(pageItem).toBeDefined();
		expect(pageItem.label).toBe("Analytics & Telemetry");
	});

	it("install.py sidebar items include omniquery-analytics", () => {
		const content = fs.readFileSync(installPyPath, "utf-8");
		expect(content).toContain("omniquery-analytics");
	});
});
