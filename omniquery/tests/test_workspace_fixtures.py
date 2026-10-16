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

	def test_manager_workspace_has_number_cards_and_review_shortcut(self):
		# Issue #60: Workspace must have Number Cards ("Awaiting review", "Flagged", "Collected today")
		# and a "To review" shortcut filtered to workflow_state = Submitted
		ws = frappe.get_doc("Workspace", "OmniQuery")
		card_names = [getattr(c, "number_card_name", None) or (c.get("number_card_name") if isinstance(c, dict) else str(c)) for c in (ws.number_cards or [])]
		self.assertTrue(any("Awaiting" in str(name) for name in card_names), f"Missing Awaiting Review card in {card_names}")
		self.assertTrue(any("Flagged" in str(name) for name in card_names), f"Missing Flagged card in {card_names}")
		self.assertTrue(any("Collected" in str(name) for name in card_names), f"Missing Collected Today card in {card_names}")

		shortcuts = [s.label if hasattr(s, "label") else s.get("label") for s in (ws.shortcuts or [])]
		self.assertTrue(any("Review" in str(sc) for sc in shortcuts), f"Missing To Review shortcut in {shortcuts}")

