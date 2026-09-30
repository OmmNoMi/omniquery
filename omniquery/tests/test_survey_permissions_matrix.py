import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.permissions import (
	has_response_permission,
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
		self.assertTrue(is_super_user(None))

	def test_public_citizen_link_template_is_readable_by_anyone(self):
		template_doc = frappe._dict({
			"doctype": "OmniQuery Template",
			"project": self.project_name,
			"is_public_citizen_link": 1,
			"is_public": 0,
		})
		self.assertTrue(has_template_permission(template_doc, "read", "citizen_guest@example.com"))

	def test_response_owner_can_write_response(self):
		surveyor_user = "field_surveyor_1@example.com"
		response_doc = frappe._dict({
			"doctype": "OmniQuery Response",
			"project": self.project_name,
			"surveyor": surveyor_user,
			"owner": surveyor_user,
		})

		self.assertTrue(has_response_permission(response_doc, "write", surveyor_user))
		self.assertFalse(has_response_permission(response_doc, "write", "outsider@example.com"))
