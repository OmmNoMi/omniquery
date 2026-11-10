import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.permissions import (
	is_super_user,
	has_response_permission,
	has_template_permission,
	get_response_query_conditions,
	sync_user_project_roles,
)
from omniquery.api.export import export_flattened_responses


class TestIssue62AnalystViewerPermissions(FrappeTestCase):
	def setUp(self):
		super().setUp()
		self.created_users = []
		self.created_projects = []
		self.created_templates = []
		self.created_responses = []
		self.created_surveyors = []
		self.cleanup_records()
		self.setup_users_and_projects()

	def tearDown(self):
		self.cleanup_records()
		super().tearDown()

	def cleanup_records(self):
		frappe.set_user("Administrator")

		# 1. Clean responses
		for r in getattr(self, "created_responses", []):
			if frappe.db.exists("OmniQuery Response", r):
				frappe.delete_doc("OmniQuery Response", r, force=True, ignore_permissions=True)
		for r in frappe.get_all("OmniQuery Response", filters={"idempotency_key": ["like", "issue62-%"]}, pluck="name"):
			frappe.delete_doc("OmniQuery Response", r, force=True, ignore_permissions=True)

		# 2. Clean templates
		for t in getattr(self, "created_templates", []):
			if frappe.db.exists("OmniQuery Template", t):
				doc = frappe.get_doc("OmniQuery Template", t)
				if doc.docstatus == 1:
					doc.cancel()
				frappe.delete_doc("OmniQuery Template", t, force=True, ignore_permissions=True)
		for t in frappe.get_all("OmniQuery Template", filters={"title": ["like", "%Issue 62%"]}, pluck="name"):
			doc = frappe.get_doc("OmniQuery Template", t)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("OmniQuery Template", t, force=True, ignore_permissions=True)

		# 3. Clean surveyors
		for s in getattr(self, "created_surveyors", []):
			if frappe.db.exists("OmniQuery Surveyor", s):
				frappe.delete_doc("OmniQuery Surveyor", s, force=True, ignore_permissions=True)
		for s in frappe.get_all("OmniQuery Surveyor", filters={"surveyor_name": ["like", "%Issue62%"]}, pluck="name"):
			frappe.delete_doc("OmniQuery Surveyor", s, force=True, ignore_permissions=True)

		# 4. Clean projects and child members
		for p in getattr(self, "created_projects", []):
			if frappe.db.exists("OmniQuery Project", p):
				frappe.delete_doc("OmniQuery Project", p, force=True, ignore_permissions=True)
		for p in frappe.get_all("OmniQuery Project", filters={"project_name": ["like", "%Issue62%"]}, pluck="name"):
			frappe.delete_doc("OmniQuery Project", p, force=True, ignore_permissions=True)
		for m in frappe.get_all("OmniQuery Project Member", filters={"user": ["like", "%@ommnomi.test"]}, pluck="name"):
			frappe.db.delete("OmniQuery Project Member", {"name": m})

		# 5. Clean users
		for u in (
			"analyst_a@ommnomi.test",
			"viewer_a@ommnomi.test",
			"surveyor_a@ommnomi.test",
			"dual_user@ommnomi.test",
			"outsider@ommnomi.test",
		):
			if frappe.db.exists("User", u):
				frappe.delete_doc("User", u, force=True, ignore_permissions=True)

		frappe.db.commit()

	def setup_users_and_projects(self):
		# Create test users
		for email, role in [
			("analyst_a@ommnomi.test", "OmniQuery Analyst"),
			("viewer_a@ommnomi.test", "OmniQuery Viewer"),
			("surveyor_a@ommnomi.test", "OmniQuery User"),
			("dual_user@ommnomi.test", "Desk User"),
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
				u.insert(ignore_permissions=True)
				self.created_users.append(email)

		# Create test surveyor record
		surv = frappe.get_doc({
			"doctype": "OmniQuery Surveyor",
			"surveyor_name": "Issue62 Surveyor A",
			"user": "surveyor_a@ommnomi.test",
			"status": "Active",
		}).insert(ignore_permissions=True)
		self.created_surveyors.append(surv.name)
		self.surv_a = surv.name

		# Create projects:
		# Project A: analyst_a is Analyst, viewer_a is Viewer, dual_user is Viewer
		proj_a_doc = frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Test Issue62 Project A",
			"grantor_organization": "State Mission",
			"status": "Active",
			"members": [
				{"user": "analyst_a@ommnomi.test", "project_role": "Project Analyst"},
				{"user": "viewer_a@ommnomi.test", "project_role": "Project Viewer"},
				{"user": "surveyor_a@ommnomi.test", "project_role": "Project User"},
				{"user": "dual_user@ommnomi.test", "project_role": "Project Viewer"},
			],
		}).insert(ignore_permissions=True)
		self.proj_a = proj_a_doc.name
		self.created_projects.append(self.proj_a)

		# Project B: dual_user is Project Admin
		proj_b_doc = frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Test Issue62 Project B",
			"grantor_organization": "State Mission",
			"status": "Active",
			"members": [
				{"user": "dual_user@ommnomi.test", "project_role": "Project Admin"},
			],
		}).insert(ignore_permissions=True)
		self.proj_b = proj_b_doc.name
		self.created_projects.append(self.proj_b)

		# Sync roles for members
		sync_user_project_roles("analyst_a@ommnomi.test")
		sync_user_project_roles("viewer_a@ommnomi.test")
		sync_user_project_roles("surveyor_a@ommnomi.test")
		sync_user_project_roles("dual_user@ommnomi.test")

		# Create templates
		tmpl_a_doc = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Issue 62 Template A",
			"project": self.proj_a,
			"version": 1,
			"is_public": 0,
			"status": "Draft",
			"sections": [{"section_code": "SEC_1", "section_title": "Section 1", "display_order": 1}],
			"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Q1", "is_mandatory": 1}],
		}).insert(ignore_permissions=True)
		self.tmpl_a = tmpl_a_doc.name
		self.created_templates.append(self.tmpl_a)

		tmpl_b_doc = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Issue 62 Template B",
			"project": self.proj_b,
			"version": 1,
			"is_public": 0,
			"status": "Draft",
			"sections": [{"section_code": "SEC_1", "section_title": "Section 1", "display_order": 1}],
			"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Q1", "is_mandatory": 1}],
		}).insert(ignore_permissions=True)
		self.tmpl_b = tmpl_b_doc.name
		self.created_templates.append(self.tmpl_b)

		# Public citizen link template on Project B
		tmpl_b_public_doc = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Issue 62 Template B Citizen",
			"project": self.proj_b,
			"version": 1,
			"is_public": 0,
			"is_public_citizen_link": 1,
			"status": "Draft",
			"sections": [{"section_code": "SEC_1", "section_title": "Section 1", "display_order": 1}],
			"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Q1", "is_mandatory": 1}],
		}).insert(ignore_permissions=True)
		self.tmpl_b_public = tmpl_b_public_doc.name
		self.created_templates.append(self.tmpl_b_public)

		# Create responses
		resp_a_doc = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"idempotency_key": "issue62-resp-a-001",
			"survey_template": self.tmpl_a,
			"template_version": 1,
			"surveyor": self.surv_a,
			"survey_status": "Submitted",
			"owner": "surveyor_a@ommnomi.test",
		}).insert(ignore_permissions=True)
		self.resp_a = resp_a_doc.name
		self.created_responses.append(self.resp_a)

		resp_b_doc = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"idempotency_key": "issue62-resp-b-001",
			"survey_template": self.tmpl_b,
			"template_version": 1,
			"surveyor": self.surv_a,
			"survey_status": "Submitted",
			"owner": "Administrator",
		}).insert(ignore_permissions=True)
		self.resp_b = resp_b_doc.name
		self.created_responses.append(self.resp_b)

		frappe.db.commit()

	def test_is_super_user_fails_closed(self):
		"""Empty or missing user strings must NEVER be granted super user status."""
		self.assertFalse(is_super_user(None))
		self.assertFalse(is_super_user(""))
		self.assertTrue(is_super_user("Administrator"))

	def test_analyst_permissions_and_list_scoping(self):
		"""Analyst on Project A can list and read responses from A, cannot read or export B, cannot write."""
		analyst = "analyst_a@ommnomi.test"
		frappe.set_user(analyst)
		try:
			# 1. Template list scoping (SQL syntax error check and citizen link retention)
			templates = frappe.get_list("OmniQuery Template", pluck="name")
			self.assertIn(self.tmpl_a, templates)
			self.assertNotIn(self.tmpl_b, templates)
			# Citizen link template from Project B must remain visible in member branch
			self.assertIn(self.tmpl_b_public, templates)

			# 2. Response list scoping (permission_query_conditions check)
			responses = frappe.get_list("OmniQuery Response", pluck="name")
			self.assertIn(self.resp_a, responses)
			self.assertNotIn(self.resp_b, responses)

			# 3. Real doc-level permission hook checks
			doc_a = frappe.get_doc("OmniQuery Response", self.resp_a)
			self.assertTrue(frappe.has_permission("OmniQuery Response", "read", doc=doc_a, user=analyst))
			self.assertTrue(frappe.has_permission("OmniQuery Response", "export", doc=doc_a, user=analyst))
			self.assertFalse(frappe.has_permission("OmniQuery Response", "write", doc=doc_a, user=analyst))
			self.assertFalse(frappe.has_permission("OmniQuery Response", "create", doc=doc_a, user=analyst))

			# Doc B must be strictly denied for read, export, print, email, share
			doc_b = frappe.get_doc("OmniQuery Response", self.resp_b)
			self.assertFalse(frappe.has_permission("OmniQuery Response", "read", doc=doc_b, user=analyst))
			self.assertFalse(frappe.has_permission("OmniQuery Response", "export", doc=doc_b, user=analyst))
			self.assertFalse(has_response_permission(doc_b, "print", user=analyst))
			self.assertFalse(has_response_permission(doc_b, "email", user=analyst))
			self.assertFalse(has_response_permission(doc_b, "share", user=analyst))

			# Template print/email/share on private template B must also be denied
			tmpl_b_doc = frappe.get_doc("OmniQuery Template", self.tmpl_b)
			self.assertFalse(has_template_permission(tmpl_b_doc, "print", user=analyst))
			self.assertFalse(has_template_permission(tmpl_b_doc, "email", user=analyst))

			# 4. Print on accessible Project A is allowed
			self.assertTrue(has_response_permission(doc_a, "print", user=analyst))
			self.assertTrue(has_template_permission(frappe.get_doc("OmniQuery Template", self.tmpl_a), "print", user=analyst))

			# 5. Export API endpoint: allows export for Project A, strictly blocks Project B
			res_a = export_flattened_responses(project=self.proj_a, format="json")
			self.assertIsInstance(res_a, dict)
			self.assertGreaterEqual(len(res_a.get("rows", [])), 1)

			with self.assertRaises(frappe.PermissionError):
				export_flattened_responses(project=self.proj_b, format="json")
		finally:
			frappe.set_user("Administrator")

	def test_viewer_permissions_and_list_scoping(self):
		"""Viewer on Project A can list and read responses from A, cannot read B, and cannot export or write."""
		viewer = "viewer_a@ommnomi.test"
		frappe.set_user(viewer)
		try:
			responses = frappe.get_list("OmniQuery Response", pluck="name")
			self.assertIn(self.resp_a, responses)
			self.assertNotIn(self.resp_b, responses)

			doc_a = frappe.get_doc("OmniQuery Response", self.resp_a)
			self.assertTrue(frappe.has_permission("OmniQuery Response", "read", doc=doc_a, user=viewer))
			self.assertFalse(frappe.has_permission("OmniQuery Response", "export", doc=doc_a, user=viewer))
			self.assertFalse(frappe.has_permission("OmniQuery Response", "write", doc=doc_a, user=viewer))

			# Doc B denied
			doc_b = frappe.get_doc("OmniQuery Response", self.resp_b)
			self.assertFalse(frappe.has_permission("OmniQuery Response", "read", doc=doc_b, user=viewer))

			# Export API endpoint strictly throws PermissionError
			with self.assertRaises(frappe.PermissionError):
				export_flattened_responses(project=self.proj_a, format="json")
		finally:
			frappe.set_user("Administrator")

	def test_dual_project_user_scope_isolation(self):
		"""
		User who is Project Viewer on A and Project Admin on B:
		- Cannot write or export on Project A
		- Can read, write, and export on Project B
		- Exporting without project filter only exports Project B responses
		"""
		dual = "dual_user@ommnomi.test"
		frappe.set_user(dual)
		try:
			doc_a = frappe.get_doc("OmniQuery Response", self.resp_a)
			doc_b = frappe.get_doc("OmniQuery Response", self.resp_b)

			# On Project A: read only (no write, no export)
			self.assertTrue(frappe.has_permission("OmniQuery Response", "read", doc=doc_a, user=dual))
			self.assertFalse(frappe.has_permission("OmniQuery Response", "write", doc=doc_a, user=dual))
			self.assertFalse(frappe.has_permission("OmniQuery Response", "export", doc=doc_a, user=dual))

			# On Project B: write and export permitted
			self.assertTrue(frappe.has_permission("OmniQuery Response", "read", doc=doc_b, user=dual))
			self.assertTrue(frappe.has_permission("OmniQuery Response", "write", doc=doc_b, user=dual))
			self.assertTrue(frappe.has_permission("OmniQuery Response", "export", doc=doc_b, user=dual))

			# Export with no project filter must ONLY include Project B responses, NEVER Project A
			res = export_flattened_responses(format="json")
			exported_names = [row["Response Name"] for row in res.get("rows", [])]
			self.assertIn(self.resp_b, exported_names)
			self.assertNotIn(self.resp_a, exported_names)
		finally:
			frappe.set_user("Administrator")

	def test_outsider_cannot_access_any_response(self):
		"""User with no project membership cannot see or read responses in Project A or B."""
		outsider = "outsider@ommnomi.test"
		frappe.set_user(outsider)
		try:
			with self.assertRaises(frappe.PermissionError):
				frappe.get_list("OmniQuery Response", pluck="name")

			doc_a = frappe.get_doc("OmniQuery Response", self.resp_a)
			self.assertFalse(frappe.has_permission("OmniQuery Response", "read", doc=doc_a, user=outsider))

			with self.assertRaises(frappe.PermissionError):
				export_flattened_responses(project=self.proj_a, format="json")
		finally:
			frappe.set_user("Administrator")

	def test_surveyor_can_read_own_response_via_surveyor_link(self):
		"""Field surveyor can read their own response matched through tabOmniQuery Surveyor.user."""
		surveyor_user = "surveyor_a@ommnomi.test"
		frappe.set_user(surveyor_user)
		try:
			responses = frappe.get_list("OmniQuery Response", pluck="name")
			self.assertIn(self.resp_a, responses)
			self.assertIn(self.resp_b, responses)

			doc_b = frappe.get_doc("OmniQuery Response", self.resp_b)
			self.assertTrue(frappe.has_permission("OmniQuery Response", "read", doc=doc_b, user=surveyor_user))
		finally:
			frappe.set_user("Administrator")

	def test_role_revocation_on_membership_removal(self):
		"""When a user has no active project membership, their assigned OmniQuery role is cleanly revoked."""
		frappe.set_user("Administrator")
		user = "analyst_a@ommnomi.test"

		# Confirm role is initially present
		u_doc = frappe.get_doc("User", user)
		self.assertTrue(any(r.role == "OmniQuery Analyst" for r in u_doc.roles))

		# Delete all project memberships for this user
		frappe.db.delete("OmniQuery Project Member", {"user": user})
		sync_user_project_roles(user)

		# Role must now be revoked
		u_doc.reload()
		self.assertFalse(any(r.role == "OmniQuery Analyst" for r in u_doc.roles))
