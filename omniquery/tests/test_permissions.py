import unittest

import frappe

from omniquery.permissions import (
	get_template_query_conditions,
	has_response_permission,
	has_template_permission,
)


class TestPermissions(unittest.TestCase):
	def setUp(self):
		self._cleanup_test_records()
		self._create_test_users()
		self._create_test_projects()

	def tearDown(self):
		self._cleanup_test_records()

	def _cleanup_test_records(self):
		for t in frappe.get_all("OmniQuery Template", filters={"title": ["like", "Perm Test Template%"]}, pluck="name"):
			doc = frappe.get_doc("OmniQuery Template", t)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("OmniQuery Template", t, force=True, ignore_permissions=True)
		for p in ("PROJ-Alpha Study", "PROJ-Beta Study"):
			if frappe.db.exists("OmniQuery Project", p):
				frappe.delete_doc("OmniQuery Project", p, force=True, ignore_permissions=True)
		for u in ("admin_alpha@ommnomi.test", "analyst_beta@ommnomi.test", "outsider@ommnomi.test"):
			if frappe.db.exists("User", u):
				frappe.delete_doc("User", u, force=True, ignore_permissions=True)
		frappe.db.commit()

	def _create_test_users(self):
		for email in ("admin_alpha@ommnomi.test", "analyst_beta@ommnomi.test", "outsider@ommnomi.test"):
			if not frappe.db.exists("User", email):
				frappe.get_doc({
					"doctype": "User",
					"email": email,
					"first_name": email.split("@")[0],
					"roles": [{"role": "OmniQuery Manager"}],
				}).insert(ignore_permissions=True)

	def _create_test_projects(self):
		frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Alpha Study",
			"grantor_organization": "Alpha Grantor",
			"status": "Active",
			"members": [{"user": "admin_alpha@ommnomi.test", "project_role": "Project Admin"}],
		}).insert(ignore_permissions=True)

		frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Beta Study",
			"grantor_organization": "Beta Grantor",
			"status": "Active",
			"members": [{"user": "analyst_beta@ommnomi.test", "project_role": "Project Analyst"}],
		}).insert(ignore_permissions=True)

	def _make_template(self, title: str, project: str, is_public: int = 0):
		return frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": title,
			"project": project,
			"version": 1,
			"is_public": is_public,
			"status": "Draft",
			"sections": [{"section_code": "SEC_1", "section_title": "Section 1", "display_order": 1}],
			"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Q1", "is_mandatory": 1}],
		}).insert(ignore_permissions=True)

	def test_super_user_bypass(self):
		tmpl = self._make_template("Perm Test Template Alpha", "PROJ-Alpha Study")
		self.assertTrue(has_template_permission(tmpl, "read", "Administrator"))
		self.assertTrue(has_template_permission(tmpl, "write", "Administrator"))

	def test_project_admin_can_read_and_write(self):
		tmpl = self._make_template("Perm Test Template Alpha", "PROJ-Alpha Study")
		self.assertTrue(has_template_permission(tmpl, "read", "admin_alpha@ommnomi.test"))
		self.assertTrue(has_template_permission(tmpl, "write", "admin_alpha@ommnomi.test"))

	def test_project_analyst_can_read_but_not_write(self):
		tmpl = self._make_template("Perm Test Template Beta", "PROJ-Beta Study")
		self.assertTrue(has_template_permission(tmpl, "read", "analyst_beta@ommnomi.test"))
		self.assertFalse(has_template_permission(tmpl, "write", "analyst_beta@ommnomi.test"))

	def test_outsider_cannot_access_private_template(self):
		tmpl = self._make_template("Perm Test Template Alpha", "PROJ-Alpha Study", is_public=0)
		self.assertFalse(has_template_permission(tmpl, "read", "outsider@ommnomi.test"))
		self.assertFalse(has_template_permission(tmpl, "write", "outsider@ommnomi.test"))

	def test_outsider_can_read_public_template(self):
		tmpl = self._make_template("Perm Test Template Public", "PROJ-Alpha Study", is_public=1)
		self.assertTrue(has_template_permission(tmpl, "read", "outsider@ommnomi.test"))
		self.assertFalse(has_template_permission(tmpl, "write", "outsider@ommnomi.test"))

	def test_query_conditions_filtering(self):
		cond = get_template_query_conditions("admin_alpha@ommnomi.test")
		self.assertIn("PROJ-Alpha Study", cond)
		super_cond = get_template_query_conditions("Administrator")
		self.assertEqual(super_cond, "")
