# Copyright (c) 2026, OmmNoMi Automation LLP and contributors
# For license information, please see license.txt

"""Issue #53: a field surveyor's Desk shows no authoring or admin tools.

Surveyors (OmniQuery User) work in the PWA. The OmniQuery Desk app (workspace, desktop icon,
Apps screen entry) belongs to DESK_APP_ROLES, and the sidebar shows each user only what they can
read, as Frappe resolves it.
"""

import json

import frappe
from frappe.boot import get_module_sidebars
from frappe.desk.doctype.desktop_icon.desktop_icon import get_desktop_icons
from frappe.desk.doctype.sidebar.sidebar import resolve_sidebar
from frappe.tests.utils import FrappeTestCase

from omniquery.permissions import DESK_APP_ROLES, can_open_desk_app
from omniquery.tests.utils import delete_test_docs

SURVEYOR, ANALYST, VIEWER = (f"{name}_issue53@ommnomi.test" for name in ("surveyor", "analyst", "viewer"))
ROLES = {SURVEYOR: "OmniQuery User", ANALYST: "OmniQuery Analyst", VIEWER: "OmniQuery Viewer"}
AUTHORING_AND_ADMIN = {"OmniQuery Question", "OmniQuery Option Set", "OmniQuery Settings", "User", "Role"}
SHIPPED_ROLE_FILES = ("desktop_icon/omniquery.json", "omniquery/workspace/omniquery/omniquery.json")


class TestIssue53SurveyorDeskAccess(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		_cleanup()
		for user, role in ROLES.items():
			frappe.get_doc({
				"doctype": "User", "email": user, "first_name": user.split("@")[0], "send_welcome_email": 0,
				"roles": [{"role": "Desk User"}, {"role": role}],
			}).insert(ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		_cleanup()
		frappe.db.commit()
		super().tearDownClass()

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_surveyor_sidebar_has_no_authoring_or_admin_links(self):
		links = _sidebar_links(SURVEYOR)
		self.assertEqual(links & AUTHORING_AND_ADMIN, set())
		self.assertNotIn(("Workspace", "OmniQuery"), _sidebar_items(SURVEYOR))
		self.assertIn("OmniQuery Response", links)

	def test_analyst_sidebar_keeps_the_question_bank_and_home(self):
		links = _sidebar_links(ANALYST)
		self.assertTrue({"OmniQuery Question", "OmniQuery Option Set", "OmniQuery Response"} <= links)
		self.assertIn(("Workspace", "OmniQuery"), _sidebar_items(ANALYST))

	def test_surveyor_gets_no_desktop_icon_or_apps_entry(self):
		self.assertNotIn("OmniQuery", _desktop_icon_labels(SURVEYOR))
		_as(SURVEYOR)
		self.assertFalse(can_open_desk_app())

	def test_analyst_and_viewer_open_the_desk_app(self):
		for user in (ANALYST, VIEWER):
			self.assertIn("OmniQuery", _desktop_icon_labels(user), user)
			_as(user)
			self.assertTrue(can_open_desk_app(), user)
			self.assertTrue(frappe.has_permission("Workspace", "read", "OmniQuery"), user)

	def test_only_analysts_and_up_read_the_question_bank(self):
		for user, expected in ((SURVEYOR, False), (ANALYST, True), (VIEWER, False)):
			_as(user)
			for doctype in ("OmniQuery Question", "OmniQuery Option Set"):
				self.assertEqual(bool(frappe.has_permission(doctype, "read")), expected, (user, doctype))
		_as(SURVEYOR)
		self.assertTrue(frappe.has_permission("OmniQuery Response", "read"))
		self.assertFalse(frappe.has_permission("OmniQuery Settings", "read"))

	def test_shipped_files_and_site_carry_the_one_role_list(self):
		expected = set(DESK_APP_ROLES)
		for path in SHIPPED_ROLE_FILES:
			with open(frappe.get_app_path("omniquery", path)) as f:
				self.assertEqual({r["role"] for r in json.load(f)["roles"]}, expected, path)
		for doctype in ("Workspace", "Desktop Icon"):
			self.assertEqual({r.role for r in frappe.get_doc(doctype, "OmniQuery").roles}, expected, doctype)
		self.assertNotIn("OmniQuery User", expected)


def _as(user):
	# Frappe request-caches the permitted workspaces, and a test switches users inside one request
	frappe.set_user(user)
	frappe.local.request_cache.clear()


def _resolved_items(user):
	_as(user)
	resolved = resolve_sidebar("OmniQuery", user)
	return resolved.items if resolved else []


def _sidebar_items(user):
	return [(i.get("link_type"), i.get("link_to")) for i in _resolved_items(user)]


def _sidebar_links(user):
	return {link_to for link_type, link_to in _sidebar_items(user) if link_type == "DocType"}


def _desktop_icon_labels(user):
	_as(user)
	frappe.cache.delete_key("desktop_icons")
	icons = get_desktop_icons(user, frappe._dict(module_sidebars=get_module_sidebars()))
	return {icon.label for icon in icons}


def _cleanup():
	delete_test_docs([("User", {"name": ["in", list(ROLES)]})])
