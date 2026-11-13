"""Issue #47: Desk analytics and surveyor KPIs count only what the caller may see.

Every count is exact over rows this module makes, so a leak from another project, or a
response credited to someone else's Surveyor, changes a number here.
"""

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.api.analytics import get_project_analytics
from omniquery.api.survey import get_surveyor_kpis
from omniquery.tests.utils import delete_test_docs

ANALYST, VIEWER, SURVEYOR, MANAGER, OUTSIDER, NAMESAKE = (
	f"{name}_issue47@ommnomi.test" for name in ("analyst", "viewer", "surveyor", "manager", "outsider", "namesake")
)
USERS = {
	ANALYST: [], VIEWER: [], SURVEYOR: ["OmniQuery User"], MANAGER: ["OmniQuery Manager"], OUTSIDER: [], NAMESAKE: [],
}
PROJECTS = {
	"A": [(ANALYST, "Project Analyst"), (VIEWER, "Project Viewer"), (SURVEYOR, "Project User")],
	"B": [],
}
RESPONSE = "OmniQuery Response"
KEY = "issue47-"


class TestIssue47Analytics(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		_cleanup()
		for user, roles in USERS.items():
			_make_user(user, roles)
		cls.project = {key: _make_project(key, members) for key, members in PROJECTS.items()}
		template = {key: _make_template(cls.project[key]) for key in PROJECTS}
		own = _make_surveyor("Issue47 Field Surveyor", SURVEYOR)
		namesake = _make_surveyor(SURVEYOR, NAMESAKE)  # named SURV-<surveyor's email>, but someone else's
		cls.own_surveyor = own
		_make_response(template["A"], SURVEYOR, own, "Approved")
		_make_response(template["A"], SURVEYOR, own, "Audit Flagged")
		_make_response(template["A"], SURVEYOR, own, "Audit Flagged")
		_make_response(template["A"], "Administrator", namesake, "Submitted")
		_make_response(template["B"], "Administrator", own, "Submitted")  # synced for them by a supervisor
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		_cleanup()
		frappe.db.commit()
		super().tearDownClass()

	def tearDown(self):
		frappe.set_user("Administrator")

	def analytics(self, user, project=None):
		frappe.set_user(user)
		return get_project_analytics(project_id=project)

	def test_member_sees_only_their_projects_analytics(self):
		for user in (ANALYST, VIEWER):
			data = self.analytics(user)
			self.assertEqual((data["total_responses"], data["approved_count"], data["flagged_count"]), (4, 1, 2), user)
			self.assertEqual(data["approval_rate"], 25.0)
			self.assertEqual(sum(day["count"] for day in data["daily_velocity"]), 4)
			self.assertRaises(frappe.PermissionError, self.analytics, user, self.project["B"])

	def test_leaderboard_counts_each_surveyor_within_the_project(self):
		row = next(r for r in self.analytics(ANALYST)["leaderboard"] if r["surveyor"] == self.own_surveyor)
		self.assertEqual((row["total_responses"], row["approved"], row["flagged"], row["quality_score"]), (3, 1, 2, 33.3))

	def test_field_surveyor_and_outsider_get_no_analytics(self):
		for user in (SURVEYOR, OUTSIDER):
			self.assertRaises(frappe.PermissionError, self.analytics, user)

	def test_site_wide_manager_sees_any_project(self):
		self.assertEqual(self.analytics(MANAGER, self.project["A"])["total_responses"], 4)
		self.assertEqual(self.analytics(MANAGER, self.project["B"])["total_responses"], 1)
		self.assertGreaterEqual(self.analytics(MANAGER, "ALL")["total_responses"], 5)

	def test_kpis_count_own_and_linked_rows_not_a_namesake_surveyor(self):
		frappe.set_user(SURVEYOR)
		self.assertEqual(
			get_surveyor_kpis(),
			{"today_count": 4, "week_count": 4, "total_count": 4, "approved_count": 1, "daily_target": None},
		)
		self.assertEqual(get_surveyor_kpis(project=self.project["A"])["total_count"], 3)

	def test_guest_kpis_are_zero(self):
		frappe.set_user("Guest")
		self.assertEqual(
			get_surveyor_kpis(),
			{"today_count": 0, "week_count": 0, "total_count": 0, "approved_count": 0, "daily_target": None},
		)

	def test_analytics_page_is_for_response_readers_only(self):
		roles = {r.role for r in frappe.get_doc("Page", "omniquery-analytics").roles}
		self.assertEqual(roles & {"All", "Guest", "OmniQuery User"}, set())
		self.assertTrue({"OmniQuery Analyst", "OmniQuery Viewer", "OmniQuery Manager"} <= roles)
		sidebar = frappe.get_doc("Sidebar", "OmniQuery")
		self.assertIn("omniquery-analytics", [i.link_to for i in sidebar.items if i.link_type == "Page"])


def _make_user(email, roles):
	frappe.get_doc({
		"doctype": "User", "email": email, "first_name": email.split("@")[0], "send_welcome_email": 0,
		"roles": [{"role": role} for role in ["Desk User", *roles]],
	}).insert(ignore_permissions=True)


def _make_project(key, members):
	return frappe.get_doc({
		"doctype": "OmniQuery Project", "project_name": f"Test Issue47 Project {key}", "grantor_organization": "State Mission",
		"status": "Active", "members": [{"user": user, "project_role": role} for user, role in members],
	}).insert(ignore_permissions=True).name


def _make_template(project):
	template = frappe.get_doc({"doctype": "OmniQuery Template", "title": f"Issue 47 Template {project}", "project": project, "status": "Draft"})
	template.insert(ignore_permissions=True)
	template.submit()
	return template.name


def _make_surveyor(name, user):
	return frappe.get_doc({"doctype": "OmniQuery Surveyor", "surveyor_name": name, "user": user, "status": "Active"}).insert(ignore_permissions=True).name


def _make_response(template, owner, surveyor, status):
	frappe.set_user(owner)  # sync inserts as the sender, so the sender owns the row
	doc = frappe.get_doc({
		"doctype": RESPONSE, "idempotency_key": f"{KEY}{frappe.generate_hash(length=8)}", "survey_template": template,
		"template_version": 1, "survey_status": "Submitted", "docstatus": 1, "surveyor": surveyor,
	}).insert(ignore_permissions=True)
	frappe.set_user("Administrator")
	frappe.db.set_value(RESPONSE, doc.name, "survey_status", status)  # the state review leaves it in


def _cleanup():
	delete_test_docs([
		(RESPONSE, {"idempotency_key": ["like", f"{KEY}%"]}),
		("OmniQuery Template", {"title": ["like", "Issue 47 Template %"]}),
		("OmniQuery Project", {"project_name": ["like", "Test Issue47 Project %"]}),
		("OmniQuery Surveyor", {"user": ["in", list(USERS)]}),
		("User", {"name": ["in", list(USERS)]}),
	])
