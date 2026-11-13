# Copyright (c) 2026, OmmNoMi Automation LLP and contributors
# For license information, please see license.txt

from unittest.mock import patch

import frappe
from frappe.tests.utils import FrappeTestCase


class TestWorkspaceFixtures(FrappeTestCase):
	def test_workspace_omniquery_exists_and_configured(self):
		self.assertTrue(frappe.db.exists("Workspace", "OmniQuery"))
		ws = frappe.get_doc("Workspace", "OmniQuery")
		self.assertEqual(ws.public, 1)
		self.assertEqual(ws.module, "OmniQuery")

	def test_workspace_sidebar_structure_and_grouping(self):
		# a module Sidebar shipped as omniquery/sidebar/omniquery; Workspace Sidebar is Frappe's inert archive
		sidebar = frappe.get_doc("Sidebar", "OmniQuery")
		self.assertEqual(sidebar.standard, 1)
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

	def test_after_migrate_recreates_the_icon_without_the_sidebar_archive(self):
		# Production on 2026-10-08: the icon was gone and after_migrate failed every migrate. The
		# icon's link_to points at the retired Workspace Sidebar archive, which a fresh site lacks.
		from omniquery import install

		real_exists = frappe.db.exists

		def exists_without_archive(doctype, *args, **kwargs):
			return None if doctype == "Workspace Sidebar" else real_exists(doctype, *args, **kwargs)

		# db.delete, not delete_doc: in developer mode delete_doc on a standard icon deletes its shipped JSON file
		frappe.db.delete("Desktop Icon", {"name": "OmniQuery"})
		frappe.db.delete("Has Role", {"parenttype": "Desktop Icon", "parent": "OmniQuery"})
		with patch.object(frappe.db, "exists", exists_without_archive):
			install.after_migrate()

		self.assertTrue(frappe.db.exists("Desktop Icon", "OmniQuery"))

	def test_manager_workspace_has_number_cards_and_review_shortcut(self):
		# Issue #60: Workspace must have Number Cards ("Awaiting review", "Flagged", "Collected today")
		# and a "To review" shortcut filtered to workflow_state = Submitted
		ws = frappe.get_doc("Workspace", "OmniQuery")
		card_names = [getattr(c, "number_card_name", None) or (c.get("number_card_name") if isinstance(c, dict) else str(c)) for c in (ws.number_cards or [])]
		self.assertTrue(any("Awaiting" in str(name) for name in card_names), f"Missing Awaiting Review card in {card_names}")
		self.assertTrue(any("Flagged" in str(name) for name in card_names), f"Missing Flagged card in {card_names}")
		self.assertTrue(any("Collected" in str(name) for name in card_names), f"Missing Collected Today card in {card_names}")

		to_review_shortcuts = [
			s for s in (ws.shortcuts or [])
			if (getattr(s, "label", None) or (s.get("label") if isinstance(s, dict) else "")) == "To Review"
		]
		self.assertTrue(len(to_review_shortcuts) > 0, "Missing 'To Review' shortcut in Workspace")
		sc = to_review_shortcuts[0]
		link_to = getattr(sc, "link_to", None) or (sc.get("link_to") if isinstance(sc, dict) else None)
		doc_view = getattr(sc, "doc_view", None) or (sc.get("doc_view") if isinstance(sc, dict) else None)
		stats_filter = getattr(sc, "stats_filter", None) or (sc.get("stats_filter") if isinstance(sc, dict) else None)

		self.assertEqual(link_to, "OmniQuery Response")
		self.assertEqual(doc_view, "List")
		self.assertIn("Submitted", str(stats_filter))
