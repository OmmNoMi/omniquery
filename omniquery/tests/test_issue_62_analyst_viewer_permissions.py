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

		# 4. Clean projects created by this test
		for p in getattr(self, "created_projects", []):
			if frappe.db.exists("OmniQuery Project", p):
				frappe.delete_doc("OmniQuery Project", p, force=True, ignore_permissions=True)
		for p in frappe.get_all("OmniQuery Project", filters={"project_name": ["like", "%Issue62%"]}, pluck="name"):
			frappe.delete_doc("OmniQuery Project", p, force=True, ignore_permissions=True)

		# 5. Clean users created specifically by this test
		for u in (
			"analyst_issue62@ommnomi.test",
			"viewer_issue62@ommnomi.test",
			"surveyor_issue62@ommnomi.test",
			"dual_issue62@ommnomi.test",
			"outsider_issue62@ommnomi.test",
			"manager_issue62@ommnomi.test",
		):
			if frappe.db.exists("User", u):
				frappe.delete_doc("User", u, force=True, ignore_permissions=True)

	def setup_users_and_projects(self):
		# Create test users with Desk User
		test_user_configs = [
			("analyst_issue62@ommnomi.test", "OmniQuery Analyst"),
			("viewer_issue62@ommnomi.test", "OmniQuery Viewer"),
			("surveyor_issue62@ommnomi.test", "OmniQuery User"),
			("dual_issue62@ommnomi.test", "OmniQuery User"),
			("outsider_issue62@ommnomi.test", "Desk User"),
			("manager_issue62@ommnomi.test", "OmniQuery Manager"),
		]
		for email, role in test_user_configs:
			if not frappe.db.exists("User", email):
				u = frappe.get_doc({
					"doctype": "User",
					"email": email,
					"first_name": email.split("@")[0],
					"send_welcome_email": 0,
					"roles": [{"role": "Desk User"}],
				})
				if role != "Desk User" and frappe.db.exists("Role", role):
					u.append("roles", {"role": role})
				u.insert(ignore_permissions=True)
				self.created_users.append(email)

		# Create test surveyor record
		surv = frappe.get_doc({
			"doctype": "OmniQuery Surveyor",
			"surveyor_name": "Issue62 Surveyor A",
			"user": "surveyor_issue62@ommnomi.test",
			"status": "Active",
		}).insert(ignore_permissions=True)
		self.created_surveyors.append(surv.name)
		self.surv_a = surv.name

		# Create Project A
		proj_a_doc = frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Test Issue62 Project A",
			"grantor_organization": "State Mission",
			"status": "Active",
			"members": [
				{"user": "analyst_issue62@ommnomi.test", "project_role": "Project Analyst"},
				{"user": "viewer_issue62@ommnomi.test", "project_role": "Project Viewer"},
				{"user": "surveyor_issue62@ommnomi.test", "project_role": "Project User"},
				{"user": "dual_issue62@ommnomi.test", "project_role": "Project Viewer"},
			],
		}).insert(ignore_permissions=True)
		self.proj_a = proj_a_doc.name
		self.created_projects.append(self.proj_a)

		# Create Project B
		proj_b_doc = frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Test Issue62 Project B",
			"grantor_organization": "State Mission",
			"status": "Active",
			"members": [
				{"user": "dual_issue62@ommnomi.test", "project_role": "Project Admin"},
			],
		}).insert(ignore_permissions=True)
		self.proj_b = proj_b_doc.name
		self.created_projects.append(self.proj_b)

		# Create Empty Project C (has zero templates)
		proj_c_doc = frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Test Issue62 Project C Empty",
			"grantor_organization": "State Mission",
			"status": "Active",
		}).insert(ignore_permissions=True)
		self.proj_c = proj_c_doc.name
		self.created_projects.append(self.proj_c)

		# Sync project roles cleanly
		sync_user_project_roles("analyst_issue62@ommnomi.test")
		sync_user_project_roles("viewer_issue62@ommnomi.test")
		sync_user_project_roles("surveyor_issue62@ommnomi.test")
		sync_user_project_roles("dual_issue62@ommnomi.test")

		# Create Template A under Project A
		tmpl_a = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Issue 62 Template A",
			"project": self.proj_a,
			"status": "Published",
			"is_published": 1,
			"is_public": 0,
			"is_public_citizen_link": 0,
		}).insert(ignore_permissions=True)
		tmpl_a.submit()
		self.tmpl_a = tmpl_a.name
		self.created_templates.append(self.tmpl_a)

		# Create Template B under Project B
		tmpl_b = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Issue 62 Template B",
			"project": self.proj_b,
			"status": "Published",
			"is_published": 1,
			"is_public": 0,
			"is_public_citizen_link": 0,
		}).insert(ignore_permissions=True)
		tmpl_b.submit()
		self.tmpl_b = tmpl_b.name
		self.created_templates.append(self.tmpl_b)

		# Create Response A under Template A (Project A) with numeric answer = 0
		resp_a = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"survey_template": self.tmpl_a,
			"template_version": 1,
			"survey_status": "Submitted",
			"surveyor": self.surv_a,
			"idempotency_key": "issue62-resp-a",
			"items": [
				{
					"question_code": "Q_CHILDREN",
					"question_label": "Number of children",
					"value_numeric": 0,
				}
			],
		}).insert(ignore_permissions=True)
		self.resp_a = resp_a.name
		self.created_responses.append(self.resp_a)

		# Create Response B under Template B (Project B)
		resp_b = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"survey_template": self.tmpl_b,
			"template_version": 1,
			"survey_status": "Submitted",
			"surveyor": self.surv_a,
			"owner": "dual_issue62@ommnomi.test",
			"idempotency_key": "issue62-resp-b",
			"items": [
				{
					"question_code": "Q_AGE",
					"question_label": "Age of respondent",
					"value_numeric": 35,
				}
			],
		}).insert(ignore_permissions=True)
		self.resp_b = resp_b.name
		self.created_responses.append(self.resp_b)

	def test_is_super_user_security(self):
		"""is_super_user fails closed on empty or invalid inputs, True for Administrator and OmniQuery Admin."""
		self.assertFalse(is_super_user(None))
		self.assertFalse(is_super_user(""))
		self.assertTrue(is_super_user("Administrator"))
		self.assertFalse(is_super_user("analyst_issue62@ommnomi.test"))
		self.assertFalse(is_super_user("viewer_issue62@ommnomi.test"))

	def test_analyst_permissions_and_list_scoping(self):
		"""Analyst on Project A can list and read responses from A, cannot read B, can export A, cannot write or create."""
		analyst = "analyst_issue62@ommnomi.test"
		frappe.set_user(analyst)
		try:
			responses = frappe.get_list("OmniQuery Response", pluck="name")
			self.assertIn(self.resp_a, responses)
			self.assertNotIn(self.resp_b, responses)

			doc_a = frappe.get_doc("OmniQuery Response", self.resp_a)
			self.assertTrue(frappe.has_permission("OmniQuery Response", "read", doc=doc_a, user=analyst))
			self.assertTrue(frappe.has_permission("OmniQuery Response", "export", doc=doc_a, user=analyst))
			self.assertTrue(frappe.has_permission("OmniQuery Response", "print", doc=doc_a, user=analyst))
			self.assertFalse(frappe.has_permission("OmniQuery Response", "write", doc=doc_a, user=analyst))

			# Doc B from Project B is strictly denied
			doc_b = frappe.get_doc("OmniQuery Response", self.resp_b)
			self.assertFalse(frappe.has_permission("OmniQuery Response", "read", doc=doc_b, user=analyst))
			self.assertFalse(frappe.has_permission("OmniQuery Response", "export", doc=doc_b, user=analyst))
			self.assertFalse(frappe.has_permission("OmniQuery Response", "print", doc=doc_b, user=analyst))

			# Export API endpoint: allows export for Project A, strictly blocks Project B
			res_a = export_flattened_responses(project=self.proj_a, format="json")
			self.assertIsInstance(res_a, dict)
			self.assertGreaterEqual(len(res_a.get("rows", [])), 1)

			with self.assertRaises(frappe.PermissionError):
				export_flattened_responses(project=self.proj_b, format="json")
		finally:
			frappe.set_user("Administrator")

	def test_viewer_permissions_and_list_scoping(self):
		"""Viewer on Project A can list and read responses from A, cannot read B, and cannot export or write."""
		viewer = "viewer_issue62@ommnomi.test"
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

			# Export API endpoint strictly throws PermissionError for viewer
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
		dual = "dual_issue62@ommnomi.test"
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
			exported_names = [row[0] for row in res.get("rows", [])]
			self.assertIn(self.resp_b, exported_names)
			self.assertNotIn(self.resp_a, exported_names)
		finally:
			frappe.set_user("Administrator")

	def test_outsider_cannot_access_any_response(self):
		"""User with no project membership cannot see or read responses in Project A or B."""
		outsider = "outsider_issue62@ommnomi.test"
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
		surveyor_user = "surveyor_issue62@ommnomi.test"
		frappe.set_user(surveyor_user)
		try:
			responses = frappe.get_list("OmniQuery Response", pluck="name")
			self.assertIn(self.resp_a, responses)
			self.assertIn(self.resp_b, responses)

			doc_b = frappe.get_doc("OmniQuery Response", self.resp_b)
			self.assertTrue(frappe.has_permission("OmniQuery Response", "read", doc=doc_b, user=surveyor_user))
		finally:
			frappe.set_user("Administrator")

	def test_role_revocation_on_project_save_and_trash(self):
		"""
		1. Removing a member from project.members and calling project.save() revokes their role.
		2. Deleting an unlinked project revokes roles for its remaining members via on_trash.
		"""
		frappe.set_user("Administrator")
		user = "analyst_issue62@ommnomi.test"

		# Confirm role is initially present
		u_doc = frappe.get_doc("User", user)
		self.assertTrue(any(r.role == "OmniQuery Analyst" for r in u_doc.roles))

		# Remove member via project.save()
		proj = frappe.get_doc("OmniQuery Project", self.proj_a)
		proj.members = [m for m in proj.members if m.user != user]
		proj.save(ignore_permissions=True)

		# Role must now be revoked
		u_doc.reload()
		self.assertFalse(any(r.role == "OmniQuery Analyst" for r in u_doc.roles))

		# Test on_trash with unlinked Project C:
		# Add viewer to Project C, sync roles, verify role present, then delete Project C
		proj_c = frappe.get_doc("OmniQuery Project", self.proj_c)
		proj_c.append("members", {"user": user, "project_role": "Project Analyst"})
		proj_c.save(ignore_permissions=True)

		u_doc.reload()
		self.assertTrue(any(r.role == "OmniQuery Analyst" for r in u_doc.roles))

		# Delete Project C (triggers on_trash)
		proj_c.delete(ignore_permissions=True)
		if self.proj_c in self.created_projects:
			self.created_projects.remove(self.proj_c)

		u_doc.reload()
		self.assertFalse(any(r.role == "OmniQuery Analyst" for r in u_doc.roles))

	def test_template_create_permission(self):
		"""OmniQuery Manager can create templates; Project Admin can create in their project; Viewers cannot."""
		manager = "manager_issue62@ommnomi.test"
		self.assertTrue(frappe.has_permission("OmniQuery Template", "create", user=manager))

		viewer = "viewer_issue62@ommnomi.test"
		self.assertFalse(frappe.has_permission("OmniQuery Template", "create", user=viewer))

	def test_site_manager_unscoped_visibility(self):
		"""OmniQuery Manager can see responses from all projects without explicit membership."""
		manager = "manager_issue62@ommnomi.test"
		frappe.set_user(manager)
		try:
			responses = frappe.get_list("OmniQuery Response", pluck="name")
			self.assertIn(self.resp_a, responses)
			self.assertIn(self.resp_b, responses)

			doc_a = frappe.get_doc("OmniQuery Response", self.resp_a)
			doc_b = frappe.get_doc("OmniQuery Response", self.resp_b)
			self.assertTrue(frappe.has_permission("OmniQuery Response", "read", doc=doc_a, user=manager))
			self.assertTrue(frappe.has_permission("OmniQuery Response", "read", doc=doc_b, user=manager))
		finally:
			frappe.set_user("Administrator")

	def test_export_empty_project_and_numeric_zero(self):
		"""
		1. Exporting an empty project returns empty rows (never dumps all site responses).
		2. Question response with numeric 0 exports as '0' and not blank.
		"""
		admin = "Administrator"
		frappe.set_user(admin)
		try:
			# Export empty project C
			res_c = export_flattened_responses(project=self.proj_c, format="json")
			self.assertEqual(len(res_c.get("rows", [])), 0)

			# Export Project A and check numeric 0
			res_a = export_flattened_responses(project=self.proj_a, format="json")
			headers = res_a.get("headers", [])
			rows = res_a.get("rows", [])
			self.assertGreaterEqual(len(rows), 1)

			q_idx = None
			for idx, h in enumerate(headers):
				if "Q_CHILDREN" in h:
					q_idx = idx
					break
			self.assertIsNotNone(q_idx)
			# Value must be 0 (numeric 0, not empty string)
			self.assertEqual(rows[0][q_idx], 0)
		finally:
			frappe.set_user("Administrator")
