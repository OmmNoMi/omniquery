"""Issue #55: the surveyor's daily target comes from their project, never a made-up 10.

A member's own target beats the project's. A project the caller does not belong to gives no
target, and the all-projects view shows one only when every project agrees.
"""

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.api.survey import get_surveyor_kpis
from omniquery.tests.utils import delete_test_docs

OVERRIDE, DEFAULTED, UNSET, SPLIT, AGREED, OUTSIDER = (
	f"{name}_issue55@ommnomi.test" for name in ("override", "defaulted", "unset", "split", "agreed", "outsider")
)
USERS = (OVERRIDE, DEFAULTED, UNSET, SPLIT, AGREED, OUTSIDER)
# project key: (project default, [(member, their own target)])
PROJECTS = {
	"A": (6, [(OVERRIDE, 8), (DEFAULTED, 0), (SPLIT, 0), (AGREED, 0)]),
	"B": (12, [(SPLIT, 0), (AGREED, 6)]),
	"C": (0, [(UNSET, 0)]),
}
KPIS = "omniquery.api.survey.get_surveyor_kpis"


class TestIssue55DailyTarget(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		_cleanup()
		for user in USERS:
			_make_user(user)
		cls.project = {key: _make_project(key, *spec) for key, spec in PROJECTS.items()}
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		_cleanup()
		frappe.db.commit()
		super().tearDownClass()

	def tearDown(self):
		frappe.set_user("Administrator")

	def target(self, user, project=None):
		frappe.set_user(user)
		return get_surveyor_kpis(project=project)["daily_target"]

	def test_member_target_beats_the_project_default(self):
		self.assertEqual(self.target(OVERRIDE, self.project["A"]), 8)
		self.assertEqual(self.target(DEFAULTED, self.project["A"]), 6)

	def test_no_target_is_none_not_a_made_up_number(self):
		self.assertIsNone(self.target(UNSET, self.project["C"]))
		self.assertIsNone(self.target(UNSET))

	def test_a_project_you_do_not_belong_to_gives_no_target(self):
		self.assertIsNone(self.target(OUTSIDER, self.project["A"]))
		self.assertIsNone(self.target(OVERRIDE, self.project["B"]))

	def test_all_projects_view_shows_a_target_only_when_every_project_agrees(self):
		self.assertEqual(self.target(SPLIT, self.project["B"]), 12)
		self.assertIsNone(self.target(SPLIT, "ALL"))
		self.assertIsNone(self.target(SPLIT))
		self.assertEqual(self.target(AGREED), 6)  # 6 from A's default, 6 from their own on B
		self.assertEqual(self.target(OVERRIDE, "ALL"), 8)

	def test_no_one_reads_another_users_kpis(self):
		"""The PR once took a `surveyor` argument; a caller must only ever get their own numbers."""
		for caller in ("Guest", OUTSIDER):
			frappe.set_user(caller)
			kpis = frappe.call(KPIS, project=self.project["A"], surveyor=OVERRIDE)
			self.assertEqual((kpis["total_count"], kpis["daily_target"]), (0, None), caller)

	def test_negative_targets_are_refused(self):
		project = frappe.get_doc("OmniQuery Project", self.project["C"])
		project.daily_target = -6
		self.assertRaises(frappe.ValidationError, project.save, ignore_permissions=True)
		project.reload()
		project.members[0].daily_target = -1
		self.assertRaises(frappe.ValidationError, project.save, ignore_permissions=True)


def _make_user(email):
	frappe.get_doc({
		"doctype": "User", "email": email, "first_name": email.split("@")[0], "send_welcome_email": 0,
		"roles": [{"role": "OmniQuery User"}],
	}).insert(ignore_permissions=True)


def _make_project(key, default, members):
	return frappe.get_doc({
		"doctype": "OmniQuery Project", "project_name": f"Test Issue55 Project {key}", "grantor_organization": "State Mission",
		"status": "Active", "daily_target": default,
		"members": [{"user": user, "project_role": "Project User", "daily_target": own} for user, own in members],
	}).insert(ignore_permissions=True).name


def _cleanup():
	delete_test_docs([
		("OmniQuery Project", {"project_name": ["like", "Test Issue55 Project %"]}),
		("OmniQuery Surveyor", {"user": ["in", list(USERS)]}),
		("User", {"name": ["in", list(USERS)]}),
	])
