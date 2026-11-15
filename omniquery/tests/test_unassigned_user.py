"""Issue #57: a signed-in user in no project is told to ask their supervisor, and sees nothing private.

Project templates need membership; allowed_users / allowed_roles only narrow a project's
members, never grant an outsider. Public surveys stay open to everyone. Project details are for
members, site-wide reviewers, or anyone when the project runs a public survey. Adding a member
gives them a Surveyor record, without undoing the Desk role sync (#62).
"""

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.api.survey import get_bootstrap_data, get_project_details, list_active_templates, user_has_template_permission
from omniquery.tests.utils import delete_test_docs

OUTSIDER, MEMBER, ANALYST, MANAGER, TWIN_A, TWIN_B = (
	f"{name}_issue57@ommnomi.test" for name in ("outsider", "member", "analyst", "manager", "twin_a", "twin_b")
)
USERS = {OUTSIDER: "OmniQuery User", MEMBER: "OmniQuery User", ANALYST: "OmniQuery User", MANAGER: "OmniQuery Manager"}
TWINS = (TWIN_A, TWIN_B)
PREFIX = "Test Issue57"


class TestIssue57UnassignedUser(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		_cleanup()
		for user, role in USERS.items():
			_make_user(user, user.split("@")[0], role)
		for user in TWINS:
			_make_user(user, "Twin", "OmniQuery User")
		cls.private = _make_project("Private", [(MEMBER, "Project User"), (ANALYST, "Project Analyst")])
		cls.open = _make_project("Open", [])
		cls.project_survey = _make_template("Project Survey", cls.private)
		cls.narrowed = _make_template("Narrowed Survey", cls.private, allowed_roles="OmniQuery User", allowed_users=OUTSIDER)
		cls.public_survey = _make_template("Public Survey", cls.open, is_public=1)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		_cleanup()
		frappe.db.commit()
		super().tearDownClass()

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_outsider_is_unassigned_and_sees_only_public_surveys(self):
		boot = _bootstrap(OUTSIDER)
		self.assertTrue(boot["is_unassigned"])
		self.assertIn(self.public_survey, boot["names"])
		self.assertNotIn(self.project_survey, boot["names"])
		self.assertEqual(_listed(OUTSIDER) & {self.project_survey, self.narrowed}, set())

	def test_member_is_assigned_and_gets_the_project_survey(self):
		boot = _bootstrap(MEMBER)
		self.assertFalse(boot["is_unassigned"])
		self.assertIn(self.project_survey, boot["names"])
		self.assertIn(self.public_survey, boot["names"])
		self.assertIn(self.project_survey, _listed(MEMBER))

	def test_site_wide_manager_without_a_project_is_not_unassigned(self):
		self.assertFalse(_bootstrap(MANAGER)["is_unassigned"])

	def test_allow_lists_narrow_members_and_never_grant_outsiders(self):
		# the outsider is named in allowed_users and holds the allowed role, and still gets nothing
		self.assertNotIn(self.narrowed, _bootstrap(OUTSIDER)["names"])
		self.assertNotIn(self.narrowed, _listed(OUTSIDER))
		self.assertFalse(user_has_template_permission(self.narrowed, OUTSIDER))  # the sync gate
		self.assertTrue(user_has_template_permission(self.narrowed, MEMBER))  # member with the role
		frappe.db.set_value("OmniQuery Template", self.narrowed, "allowed_roles", "OmniQuery Manager")
		try:
			self.assertFalse(user_has_template_permission(self.narrowed, MEMBER))  # member without it
		finally:
			frappe.db.set_value("OmniQuery Template", self.narrowed, "allowed_roles", "OmniQuery User")

	def test_private_project_details_are_for_members_only(self):
		for caller in ("Guest", OUTSIDER):
			_as(caller)
			self.assertEqual(get_project_details(self.private), {}, caller)
		for caller in (MEMBER, MANAGER):
			_as(caller)
			self.assertEqual(get_project_details(self.private)["project"]["name"], self.private, caller)

	def test_a_project_running_a_public_survey_shows_its_details_to_anyone(self):
		for caller in ("Guest", OUTSIDER):
			_as(caller)
			self.assertEqual(get_project_details(self.open)["project"]["name"], self.open, caller)

	def test_adding_a_member_gives_them_a_surveyor_and_keeps_the_role_sync(self):
		self.assertTrue(frappe.db.exists("OmniQuery Surveyor", {"user": MEMBER}))
		self.assertIn("OmniQuery Analyst", frappe.get_roles(ANALYST))  # #62: on_update still syncs roles
		self.assertFalse(frappe.db.exists("OmniQuery Surveyor", {"user": OUTSIDER}))
		self.assertFalse(frappe.db.exists("OmniQuery Surveyor", {"user": ANALYST}))  # analysts do not collect

	def test_colleagues_with_the_same_name_each_get_a_surveyor(self):
		project = frappe.get_doc("OmniQuery Project", self.open)
		for user in TWINS:
			project.append("members", {"user": user, "project_role": "Project User"})
		project.save(ignore_permissions=True)
		names = {frappe.db.get_value("OmniQuery Surveyor", {"user": user}, "name") for user in TWINS}
		self.assertEqual(len(names - {None}), 2)


def _as(user):
	frappe.set_user(user)
	frappe.local.request_cache.clear()


def _bootstrap(user):
	_as(user)
	boot = get_bootstrap_data()
	return {"is_unassigned": boot["is_unassigned"], "names": {t["name"] for t in boot["templates"]}}


def _listed(user):
	_as(user)
	return {t["name"] for t in list_active_templates()}


def _make_user(email, first_name, role):
	frappe.get_doc({
		"doctype": "User", "email": email, "first_name": first_name, "last_name": "Issue57", "send_welcome_email": 0,
		"roles": [{"role": role}],
	}).insert(ignore_permissions=True)


def _make_project(key, members):
	return frappe.get_doc({
		"doctype": "OmniQuery Project", "project_name": f"{PREFIX} {key}", "grantor_organization": "State Mission",
		"status": "Active", "members": [{"user": user, "project_role": role} for user, role in members],
	}).insert(ignore_permissions=True).name


def _make_template(title, project, **access):
	doc = frappe.get_doc({
		"doctype": "OmniQuery Template", "title": f"{PREFIX} {title}", "project": project, "version": 1,
		"sections": [{"section_code": "SEC_1", "section_title": "Basic Section"}],
		"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Question 1"}],
		**access,
	}).insert(ignore_permissions=True)
	doc.submit()
	return doc.name


def _cleanup():
	everyone = [*USERS, *TWINS]
	delete_test_docs([
		("OmniQuery Template", {"title": ["like", f"{PREFIX} %"]}),
		("OmniQuery Project", {"project_name": ["like", f"{PREFIX} %"]}),
		("OmniQuery Surveyor", {"user": ["in", everyone]}),
		("User", {"name": ["in", everyone]}),
	])
