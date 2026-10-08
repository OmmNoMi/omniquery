# Copyright (c) 2026, OmmNoMi Automation LLP and contributors
# For license information, please see license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestWorkspaceFixtures(FrappeTestCase):
	def test_workspace_omniquery_exists_and_configured(self):
		self.assertTrue(frappe.db.exists("Workspace", "OmniQuery"))
		ws = frappe.get_doc("Workspace", "OmniQuery")
		self.assertEqual(ws.public, 1)
		self.assertEqual(ws.module, "OmniQuery")

	def test_workspace_sidebar_structure_and_grouping(self):
		self.assertTrue(frappe.db.exists("Workspace Sidebar", "OmniQuery"))
		sidebar = frappe.get_doc("Workspace Sidebar", "OmniQuery")
		labels = [item.label for item in sidebar.items]

		expected_sections = [
			"Overview",
			"Surveys & Forms",
			"Field Operations",
			"Organization",
			"Telemetry & Logs",
			"Settings",
		]
		for sec in expected_sections:
			self.assertIn(sec, labels)

		# Verify no repetitive module names in functional items
		for item in sidebar.items:
			if item.type == "Link" and item.label != "OmniQuery Settings":
				self.assertFalse(
					item.label.startswith("OmniQuery "),
					f"Repetitive prefix found in sidebar label: {item.label}",
				)
			# Ensure every link has an icon
			if item.type == "Link":
				self.assertTrue(bool(item.icon), f"Missing icon for sidebar link: {item.label}")

	def test_desktop_icon_links_to_workspace_sidebar(self):
		self.assertTrue(frappe.db.exists("Desktop Icon", "OmniQuery"))
		icon = frappe.get_doc("Desktop Icon", "OmniQuery")
		self.assertEqual(icon.link_type, "Workspace Sidebar")
		self.assertEqual(icon.link_to, "OmniQuery")

	def test_after_migrate_recreates_navigation_when_sidebar_is_missing(self):
		# Production on 2026-10-08: the sidebar and icon were gone, and after_migrate inserted
		# the icon before the sidebar it links to, so every migrate of the site failed.
		from omniquery import install

		frappe.delete_doc("Desktop Icon", "OmniQuery", force=True, ignore_missing=True)
		frappe.delete_doc("Workspace Sidebar", "OmniQuery", force=True, ignore_missing=True)
		previous = frappe.flags.in_migrate
		frappe.flags.in_migrate = True  # the sidebar archive only accepts rows during a migrate
		try:
			install.after_migrate()
		finally:
			frappe.flags.in_migrate = previous

		self.assertTrue(frappe.db.exists("Workspace Sidebar", "OmniQuery"))
		self.assertTrue(frappe.db.exists("Desktop Icon", "OmniQuery"))
