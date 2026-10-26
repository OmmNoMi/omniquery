# Copyright (c) 2026, OmmNoMi Automation LLP and contributors
# For license information, please see license.txt

import frappe
from frappe.tests.utils import FrappeTestCase


class TestSurveyorDeskAccess(FrappeTestCase):
	def setUp(self):
		self.surveyor_user = "test_surveyor_desk_access@example.com"
		if not frappe.db.exists("User", self.surveyor_user):
			u = frappe.new_doc("User")
			u.email = self.surveyor_user
			u.first_name = "Test"
			u.last_name = "Surveyor"
			u.send_welcome_email = 0
			u.insert(ignore_permissions=True)

		user_doc = frappe.get_doc("User", self.surveyor_user)
		user_doc.roles = []
		user_doc.append("roles", {"role": "OmniQuery User"})
		user_doc.save(ignore_permissions=True)

	def tearDown(self):
		frappe.set_user("Administrator")
		if frappe.db.exists("User", self.surveyor_user):
			contacts = frappe.get_all("Dynamic Link", filters={"link_doctype": "User", "link_name": self.surveyor_user}, fields=["parent"])
			for c in contacts:
				frappe.delete_doc("Contact", c.parent, ignore_permissions=True, force=True)
			frappe.delete_doc("User", self.surveyor_user, ignore_permissions=True, force=True)

	def test_surveyor_cannot_access_authoring_tools_in_desk(self):
		frappe.set_user(self.surveyor_user)

		# Surveyors should not have permission to browse or author Questions, Option Sets, or Settings in Desk
		self.assertFalse(frappe.has_permission("OmniQuery Question", "read"))
		self.assertFalse(frappe.has_permission("OmniQuery Option Set", "read"))
		self.assertFalse(frappe.has_permission("OmniQuery Settings", "read"))

		# Surveyors can read/create responses
		self.assertTrue(frappe.has_permission("OmniQuery Response", "read"))

	def test_surveyor_cannot_see_authoring_workspace(self):
		frappe.set_user(self.surveyor_user)

		# The full authoring workspace 'OmniQuery' must require Manager or Admin
		ws = frappe.get_doc("Workspace", "OmniQuery")
		allowed_roles = {r.role for r in ws.roles}
		self.assertNotIn("OmniQuery User", allowed_roles)
		self.assertIn("OmniQuery Manager", allowed_roles)
		self.assertIn("OmniQuery Admin", allowed_roles)
