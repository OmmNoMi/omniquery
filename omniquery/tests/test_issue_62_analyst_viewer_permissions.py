import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.permissions import is_super_user


class TestIssue62AnalystViewerPermissions(FrappeTestCase):
	def setUp(self):
		super().setUp()
		self.cleanup_records()
		self.setup_users_and_projects()

	def tearDown(self):
		self.cleanup_records()
		super().tearDown()

	def cleanup_records(self):
		for u in ("analyst_a@ommnomi.test", "viewer_a@ommnomi.test", "outsider@ommnomi.test"):
			if frappe.db.exists("User", u):
				frappe.delete_doc("User", u, force=True, ignore_permissions=True)
		for p in ("PROJ-Issue62-A", "PROJ-Issue62-B"):
			if frappe.db.exists("OmniQuery Project", p):
				frappe.delete_doc("OmniQuery Project", p, force=True, ignore_permissions=True)
		for t in frappe.get_all("OmniQuery Template", filters={"title": ["like", "Issue 62 Template%"]}, pluck="name"):
			doc = frappe.get_doc("OmniQuery Template", t)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("OmniQuery Template", t, force=True, ignore_permissions=True)
		for r in frappe.get_all("OmniQuery Response", filters={"idempotency_key": ["like", "issue62-%"]}, pluck="name"):
			frappe.delete_doc("OmniQuery Response", r, force=True, ignore_permissions=True)
		frappe.db.commit()

	def setup_users_and_projects(self):
		# Create test users
		for email, role in [
			("analyst_a@ommnomi.test", "OmniQuery Analyst"),
			("viewer_a@ommnomi.test", "OmniQuery Viewer"),
			("outsider@ommnomi.test", "Desk User"),
		]:
			if not frappe.db.exists("User", email):
				u = frappe.get_doc({
					"doctype": "User",
					"email": email,
					"first_name": email.split("@")[0],
					"send_welcome_email": 0,
					"roles": [{"role": "Desk User"}],
				})
				if frappe.db.exists("Role", role):
					u.append("roles", {"role": role})
				else:
					u.append("roles", {"role": "OmniQuery User"})
				u.insert(ignore_permissions=True)

		# Create projects
		self.proj_a = frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Issue62 Project A",
			"grantor_organization": "State Mission",
			"status": "Active",
			"members": [
				{"user": "analyst_a@ommnomi.test", "project_role": "Project Analyst"},
				{"user": "viewer_a@ommnomi.test", "project_role": "Project Viewer"},
			],
		}).insert(ignore_permissions=True).name

		self.proj_b = frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Issue62 Project B",
			"grantor_organization": "State Mission",
			"status": "Active",
		}).insert(ignore_permissions=True).name

		# Create templates
		self.tmpl_a = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Issue 62 Template A",
			"project": self.proj_a,
			"version": 1,
			"is_public": 0,
			"status": "Draft",
			"sections": [{"section_code": "SEC_1", "section_title": "Section 1", "display_order": 1}],
			"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Q1", "is_mandatory": 1}],
		}).insert(ignore_permissions=True).name

		self.tmpl_b = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Issue 62 Template B",
			"project": self.proj_b,
			"version": 1,
			"is_public": 0,
			"status": "Draft",
			"sections": [{"section_code": "SEC_1", "section_title": "Section 1", "display_order": 1}],
			"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Q1", "is_mandatory": 1}],
		}).insert(ignore_permissions=True).name

		frappe.db.commit()

	def test_is_super_user_fails_closed(self):
		"""Empty or missing user strings must NEVER be granted super user status."""
		self.assertFalse(is_super_user(None))
		self.assertFalse(is_super_user(""))
		self.assertTrue(is_super_user("Administrator"))

	def test_analyst_can_query_templates_without_sql_syntax_error(self):
		"""SQL conditions must not generate MariaDB 1064 syntax errors (double single-quotes)."""
		frappe.set_user("analyst_a@ommnomi.test")
		try:
			templates = frappe.get_list("OmniQuery Template", fields=["name", "title", "project"])
			template_names = [t.name for t in templates]
			self.assertIn(self.tmpl_a, template_names)
			self.assertNotIn(self.tmpl_b, template_names)
		finally:
			frappe.set_user("Administrator")

	def test_analyst_has_read_export_report_but_not_write_create(self):
		"""Analyst persona needs read, report, and export, and must NOT have write or create on Response."""
		analyst = "analyst_a@ommnomi.test"
		self.assertTrue(frappe.has_permission("OmniQuery Response", "read", user=analyst))
		self.assertTrue(frappe.has_permission("OmniQuery Response", "export", user=analyst))
		self.assertTrue(frappe.has_permission("OmniQuery Response", "report", user=analyst))
		self.assertFalse(frappe.has_permission("OmniQuery Response", "write", user=analyst))
		self.assertFalse(frappe.has_permission("OmniQuery Response", "create", user=analyst))

	def test_viewer_has_read_only_and_cannot_export(self):
		"""Viewer persona needs read only, and must NOT have export, report, write or create on Response."""
		viewer = "viewer_a@ommnomi.test"
		self.assertTrue(frappe.has_permission("OmniQuery Response", "read", user=viewer))
		self.assertFalse(frappe.has_permission("OmniQuery Response", "export", user=viewer))
		self.assertFalse(frappe.has_permission("OmniQuery Response", "write", user=viewer))
		self.assertFalse(frappe.has_permission("OmniQuery Response", "create", user=viewer))
