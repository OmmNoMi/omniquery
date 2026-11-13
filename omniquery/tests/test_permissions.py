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
		for u in ("admin_alpha@ommnomi.test", "analyst_beta@ommnomi.test", "outsider@ommnomi.test", "surveyor_perm@ommnomi.test"):
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

		if not frappe.db.exists("User", "surveyor_perm@ommnomi.test"):
			frappe.get_doc({
				"doctype": "User",
				"email": "surveyor_perm@ommnomi.test",
				"first_name": "surveyor_perm",
				"roles": [{"role": "OmniQuery User"}],
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

	def test_project_data_has_no_unscoped_bulk_rights(self):
		# Invariant (PR #63 review): a role that is not a site-wide admin must not get
		# export/share/email/delete on project data unless the DocType has a
		# has_permission hook that scopes it to the user's projects. Covers any role
		# added later (e.g. Analyst/Viewer from PR #112).
		site_wide_roles = {"System Manager", "OmniQuery Admin", "Administrator"}
		bulk_ptypes = ("export", "share", "email", "delete")
		hooked = set(frappe.get_hooks("has_permission") or {})
		for doctype in ("OmniQuery Response", "OmniQuery Surveyor", "OmniQuery Project", "OmniQuery Option Set"):
			if doctype in hooked:
				continue
			for perm in frappe.get_meta(doctype).permissions:
				if perm.role in site_wide_roles:
					continue
				granted = [p for p in bulk_ptypes if perm.get(p)]
				self.assertFalse(
					granted,
					f"{doctype}: role {perm.role!r} gets {granted} site-wide with no has_permission hook",
				)

	def test_public_roles_cannot_finalise_documents(self):
		# All and Guest cover every user, website users included: none may submit, cancel or amend
		for doctype in frappe.get_all("DocType", {"module": "OmniQuery", "is_submittable": 1}, pluck="name"):
			for perm in frappe.get_meta(doctype).permissions:
				granted = [p for p in ("submit", "cancel", "amend") if perm.get(p)]
				if perm.role in ("All", "Guest"):
					self.assertFalse(granted, f"{doctype}: role {perm.role!r} gets {granted}")

	def test_submittable_doctypes_can_be_amended(self):
		# migrate syncs a DocType JSON without make_amendable(), so the JSON itself must carry amended_from
		for doctype in frappe.get_all("DocType", {"module": "OmniQuery", "is_submittable": 1}, pluck="name"):
			field = frappe.get_meta(doctype).get_field("amended_from")
			self.assertTrue(field and field.options == doctype, f"{doctype} has no amended_from link to itself")

	def test_surveyor_negative_docperms(self):
		# Field Surveyor (OmniQuery User) must NOT be able to create Surveyors or export Responses
		self.assertFalse(frappe.has_permission("OmniQuery Surveyor", "create", user="surveyor_perm@ommnomi.test"))
		self.assertFalse(frappe.has_permission("OmniQuery Response", "export", user="surveyor_perm@ommnomi.test"))
