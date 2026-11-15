"""Issue #62: analysts and viewers read only their projects' responses, through Frappe's own checks.

Every assertion goes through frappe.get_list / frappe.has_permission / the export API, so a
DocPerm, a missing User Permission or a broken sync fails here, not only a helper.
"""

from unittest import mock

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.api.export import export_flattened_responses
from omniquery.api.sync import resolve_surveyor
from omniquery.patches.v1_0 import sync_analyst_viewer_roles
from omniquery.permissions import SCOPED_DOCTYPE, sync_user_project_roles
from omniquery.tests.utils import delete_test_docs

ANALYST, VIEWER, SURVEYOR, DUAL, OUTSIDER, MANAGER, PROFILED, REVOKED = (
	f"{name}_issue62@ommnomi.test"
	for name in ("analyst", "viewer", "surveyor", "dual", "outsider", "manager", "profiled", "revoked")
)
USERS = {
	ANALYST: [], VIEWER: [], SURVEYOR: ["OmniQuery User"], DUAL: ["OmniQuery User"],
	OUTSIDER: [], MANAGER: ["OmniQuery Manager"], PROFILED: [], REVOKED: [],
}
PROJECTS = {
	"A": [(ANALYST, "Project Analyst"), (VIEWER, "Project Viewer"), (SURVEYOR, "Project User"),
		(DUAL, "Project Viewer"), (MANAGER, "Project Analyst")],
	"B": [(DUAL, "Project Admin")],
	"C": [],
}
PROFILE = "Issue62 Profile"
PROJECT_SYNC = "omniquery.omniquery.doctype.omniquery_project.omniquery_project.sync_user_project_roles"
RESPONSE = "OmniQuery Response"


class TestIssue62AnalystViewerPermissions(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		_cleanup()
		frappe.get_doc({"doctype": "Role Profile", "role_profile": PROFILE, "roles": [{"role": "Desk User"}]}).insert(ignore_permissions=True)
		for user, roles in USERS.items():
			_make_user(user, roles)
		cls.project = {key: _make_project(key, members) for key, members in PROJECTS.items()}
		cls.template = {key: _make_template(cls.project[key]) for key in ("A", "B")}
		cls.resp_a, cls.resp_b = _make_response(cls.template["A"], "Administrator", 0), _make_response(cls.template["B"], DUAL, 35)
		cls.resp_own = _make_response(cls.template["A"], SURVEYOR, 1)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		_cleanup()
		frappe.db.commit()
		super().tearDownClass()

	def tearDown(self):
		frappe.set_user("Administrator")

	def can(self, ptype, name, user):
		return frappe.has_permission(RESPONSE, ptype, doc=frappe.get_doc(RESPONSE, name), user=user)

	def listed(self, user):
		frappe.set_user(user)
		return set(frappe.get_list(RESPONSE, pluck="name"))

	def test_response_takes_its_project_from_the_template(self):
		self.assertEqual(frappe.db.get_value(RESPONSE, self.resp_a, "project"), self.project["A"])

	def test_membership_grants_desk_roles(self):
		self.assertIn("OmniQuery Analyst", frappe.get_roles(ANALYST))
		self.assertIn("OmniQuery Viewer", frappe.get_roles(VIEWER))
		self.assertEqual({"OmniQuery Analyst", "OmniQuery Viewer"} & set(frappe.get_roles(SURVEYOR)), set())

	def test_analyst_reads_and_exports_only_their_project(self):
		self.assertIn(self.resp_a, self.listed(ANALYST))
		self.assertNotIn(self.resp_b, self.listed(ANALYST))
		for ptype in ("read", "export", "print"):
			self.assertTrue(self.can(ptype, self.resp_a, ANALYST), ptype)
			self.assertFalse(self.can(ptype, self.resp_b, ANALYST), ptype)
		self.assertFalse(self.can("write", self.resp_a, ANALYST))
		self.assertGreaterEqual(len(export_flattened_responses(project=self.project["A"], format="json")["rows"]), 1)
		self.assertRaises(frappe.PermissionError, export_flattened_responses, project=self.project["B"], format="json")

	def test_viewer_reads_but_cannot_export_or_write(self):
		self.assertIn(self.resp_a, self.listed(VIEWER))
		self.assertNotIn(self.resp_b, self.listed(VIEWER))
		self.assertTrue(self.can("read", self.resp_a, VIEWER))
		for ptype in ("export", "write", "create"):
			self.assertFalse(self.can(ptype, self.resp_a, VIEWER), ptype)
		self.assertRaises(frappe.PermissionError, export_flattened_responses, project=self.project["A"], format="json")

	def test_dual_member_export_api_keeps_viewer_project_out(self):
		"""Viewer on A, Project Admin on B. Desk Report-view export of A is a known gap (ROADMAP)."""
		self.assertTrue(self.can("read", self.resp_a, DUAL))
		self.assertTrue(self.can("read", self.resp_b, DUAL))
		frappe.set_user(DUAL)
		exported = {row[0] for row in export_flattened_responses(format="json")["rows"]}
		self.assertIn(self.resp_b, exported)
		self.assertNotIn(self.resp_a, exported)
		self.assertRaises(frappe.PermissionError, export_flattened_responses, project=self.project["A"], format="json")

	def test_project_admin_reviews_nothing_and_writes_only_own_rows(self):
		"""Review is the site-wide OmniQuery Manager's; a project role never grants write."""
		self.assertFalse(self.can("write", self.resp_a, DUAL))
		self.assertTrue(self.can("write", self.resp_b, DUAL))  # DUAL owns it, as a field surveyor
		self.assertFalse(self.can("write", self.resp_own, DUAL))

	def test_surveyor_sees_and_writes_only_own_responses(self):
		self.assertEqual(self.listed(SURVEYOR) & {self.resp_a, self.resp_b, self.resp_own}, {self.resp_own})
		self.assertTrue(self.can("write", self.resp_own, SURVEYOR))
		self.assertFalse(self.can("write", self.resp_a, SURVEYOR))

	def test_outsider_cannot_reach_any_response(self):
		frappe.set_user(OUTSIDER)
		self.assertRaises(frappe.PermissionError, frappe.get_list, RESPONSE)
		self.assertFalse(self.can("read", self.resp_a, OUTSIDER))
		self.assertRaises(frappe.PermissionError, export_flattened_responses, project=self.project["A"], format="json")

	def test_site_wide_manager_is_never_scoped(self):
		self.assertFalse(frappe.get_all("User Permission", filters={"user": MANAGER}))
		self.assertTrue({self.resp_a, self.resp_b} <= self.listed(MANAGER))

	def test_removing_or_deleting_membership_revokes_access(self):
		project = frappe.get_doc(_project_doc("D", [(REVOKED, "Project Analyst")])).insert(ignore_permissions=True)
		self.assertEqual(_scoped_projects(REVOKED), [project.name])
		project.set("members", [])
		project.save(ignore_permissions=True)
		self.assertEqual((_scoped_projects(REVOKED), "OmniQuery Analyst" in frappe.get_roles(REVOKED)), ([], False))
		project.append("members", {"user": REVOKED, "project_role": "Project Viewer"})
		project.save(ignore_permissions=True)
		frappe.delete_doc("OmniQuery Project", project.name, ignore_permissions=True)
		self.assertEqual((_scoped_projects(REVOKED), "OmniQuery Viewer" in frappe.get_roles(REVOKED)), ([], False))

	def test_project_save_syncs_only_members_whose_role_changed(self):
		project = frappe.get_doc("OmniQuery Project", self.project["A"])
		project.append("members", {"user": OUTSIDER, "project_role": "Project Viewer"})
		with mock.patch(PROJECT_SYNC) as sync:
			project.save(ignore_permissions=True)
			project.set("members", [m for m in project.members if m.user != OUTSIDER])
			project.save(ignore_permissions=True)
		self.assertEqual([call.args[0] for call in sync.call_args_list], [OUTSIDER, OUTSIDER])

	def test_role_profile_that_strips_the_role_is_reported(self):
		user = frappe.get_doc("User", PROFILED)
		user.set("role_profiles", [{"role_profile": PROFILE}])
		user.save(ignore_permissions=True)
		project = frappe.get_doc("OmniQuery Project", self.project["C"])
		project.append("members", {"user": PROFILED, "project_role": "Project Analyst"})
		frappe.local.message_log = []
		project.save(ignore_permissions=True)
		self.assertNotIn("OmniQuery Analyst", frappe.get_roles(PROFILED))
		self.assertIn("Role Profile", str(frappe.local.message_log))

	def test_patch_backfills_response_project(self):
		frappe.db.set_value(RESPONSE, self.resp_a, "project", None)
		sync_analyst_viewer_roles.execute()
		self.assertEqual(frappe.db.get_value(RESPONSE, self.resp_a, "project"), self.project["A"])

	def test_sync_is_idempotent(self):
		before = frappe.get_doc("User", ANALYST).modified
		self.assertEqual(sync_user_project_roles(ANALYST), {"OmniQuery Analyst"})
		self.assertEqual(frappe.get_doc("User", ANALYST).modified, before)

	def test_export_of_empty_project_is_empty_and_zero_is_kept(self):
		self.assertEqual(export_flattened_responses(project=self.project["C"], format="json")["rows"], [])
		result = export_flattened_responses(project=self.project["A"], format="json")
		column = next(i for i, header in enumerate(result["headers"]) if "Q_CHILDREN" in header)
		row = next(r for r in result["rows"] if r[0] == self.resp_a)
		self.assertEqual(row[column], 0)


def _make_user(email, roles):
	frappe.get_doc({
		"doctype": "User", "email": email, "first_name": email.split("@")[0], "send_welcome_email": 0,
		"roles": [{"role": role} for role in ["Desk User", *roles]],
	}).insert(ignore_permissions=True)


def _project_doc(key, members):
	return {
		"doctype": "OmniQuery Project", "project_name": f"Test Issue62 Project {key}", "grantor_organization": "State Mission",
		"status": "Active", "members": [{"user": user, "project_role": role} for user, role in members],
	}


def _make_project(key, members):
	return frappe.get_doc(_project_doc(key, members)).insert(ignore_permissions=True).name


def _make_template(project):
	template = frappe.get_doc({"doctype": "OmniQuery Template", "title": f"Issue 62 Template {project}", "project": project, "status": "Draft"})
	template.insert(ignore_permissions=True)
	template.submit()
	return template.name


def _make_response(template, owner, answer):
	frappe.set_user(owner)  # sync inserts as the surveyor, so the surveyor owns the row
	doc = frappe.get_doc({
		"doctype": RESPONSE, "idempotency_key": f"issue62-{frappe.generate_hash(length=8)}", "survey_template": template,
		"template_version": 1, "survey_status": "Submitted", "docstatus": 1, "surveyor": resolve_surveyor(owner),
		"items": [{"question_code": "Q_CHILDREN", "question_label": "Number of children", "value_numeric": answer}],
	}).insert(ignore_permissions=True)
	frappe.set_user("Administrator")
	return doc.name


def _scoped_projects(user):
	return frappe.get_all("User Permission", filters={"user": user, "applicable_for": SCOPED_DOCTYPE}, pluck="for_value")


def _cleanup():
	delete_test_docs([
		(RESPONSE, {"idempotency_key": ["like", "issue62-%"]}),
		("OmniQuery Template", {"title": ["like", "Issue 62 Template %"]}),
		("OmniQuery Project", {"project_name": ["like", "Test Issue62 Project %"]}),
		("OmniQuery Surveyor", {"user": ["in", list(USERS)]}),
		("User", {"name": ["in", list(USERS)]}),
		("Role Profile", {"name": PROFILE}),
	])
