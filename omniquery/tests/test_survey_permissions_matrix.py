import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.permissions import (
	has_template_permission,
	is_super_user,
)


class TestSurveyPermissionsMatrix(FrappeTestCase):
	def setUp(self):
		existing = frappe.db.get_value("OmniQuery Project", {"project_name": "Perm Matrix Test"}, "name")
		if existing:
			self.project_name = existing
		else:
			doc = frappe.get_doc({
				"doctype": "OmniQuery Project",
				"project_name": "Perm Matrix Test",
				"grantor_organization": "State Mission",
				"status": "Active",
			})
			doc.insert(ignore_permissions=True)
			self.project_name = doc.name

	def tearDown(self):
		if hasattr(self, "project_name") and frappe.db.exists("OmniQuery Project", self.project_name):
			frappe.delete_doc("OmniQuery Project", self.project_name, force=True)

	def test_super_user_detection(self):
		self.assertTrue(is_super_user("Administrator"))
		self.assertFalse(is_super_user(None))
		self.assertFalse(is_super_user(""))

	def test_public_citizen_link_template_is_readable_by_anyone(self):
		template_doc = frappe._dict({
			"doctype": "OmniQuery Template",
			"project": self.project_name,
			"is_public_citizen_link": 1,
			"is_public": 0,
		})
		self.assertTrue(has_template_permission(template_doc, "read", "citizen_guest@example.com"))
