"""A survey's draft and its submission belong to the signed-in user (#35).

The server takes the owner and the Surveyor from the session, never from the `surveyor` a
client sends, on the draft sync and on submit alike. A payload naming someone else, or a name
that matches no one, neither reattributes the work nor creates Surveyor records.
"""

import uuid

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.api.sync import batch_push, resolve_respondent, resolve_surveyor, sync_draft
from omniquery.tests.utils import delete_test_docs

PREFIX = "Test Issue35"
MEMBER = "member_issue35@ommnomi.test"
NAMESAKE = "namesake_issue35@ommnomi.test"
USERS = (MEMBER, NAMESAKE)


class TestDraftAndSubmitAttribution(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		_cleanup()
		for user in USERS:
			_make_user(user)
		project = frappe.get_doc({
			"doctype": "OmniQuery Project", "project_name": f"{PREFIX} Project", "grantor_organization": "State Mission",
			"status": "Active", "members": [{"user": MEMBER, "project_role": "Project User"}],
		}).insert(ignore_permissions=True).name
		cls.template = _make_template(project)
		# another person's Surveyor whose name is the member's email: matching by name would credit them
		frappe.get_doc({
			"doctype": "OmniQuery Surveyor", "surveyor_name": MEMBER, "user": NAMESAKE, "status": "Active",
		}).insert(ignore_permissions=True)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		_cleanup()
		frappe.db.commit()
		super().tearDownClass()

	def tearDown(self):
		_sign_in("Administrator")

	def test_draft_belongs_to_the_session_user_whatever_surveyor_the_client_sends(self):
		_sign_in(MEMBER)
		result = sync_draft(data={"draft": self._payload(surveyor="SURV-Administrator")})

		self.assertEqual(result.get("status"), "SUCCESS")
		doc = frappe.get_doc("OmniQuery Response", result["doc_name"])
		self.assertEqual(doc.owner, MEMBER)
		self.assertEqual(_surveyor_user(doc.surveyor), MEMBER)

	def test_submit_keeps_the_session_user_as_surveyor(self):
		_sign_in(MEMBER)
		payload = self._payload(surveyor="Administrator")
		sync_draft(data={"draft": payload})
		result = batch_push(submissions=[payload])["results"][0]

		self.assertEqual(result["status"], "SUCCESS")
		doc = frappe.get_doc("OmniQuery Response", result["doc_name"])
		self.assertEqual(doc.survey_status, "Submitted")
		self.assertEqual(_surveyor_user(doc.surveyor), MEMBER)
		audit = frappe.db.get_value("OmniQuery Sync Audit Log", {"idempotency_key": payload["idempotency_key"]}, "surveyor")
		self.assertEqual(_surveyor_user(audit), MEMBER)

	def test_a_namesake_surveyor_is_never_matched(self):
		_sign_in(MEMBER)
		self.assertEqual(_surveyor_user(resolve_surveyor()), MEMBER)

	def test_an_unknown_surveyor_name_creates_no_surveyor(self):
		_sign_in(MEMBER)
		before = frappe.db.count("OmniQuery Surveyor")
		batch_push(submissions=[self._payload(surveyor=f"made-up-{uuid.uuid4().hex[:6]}")])
		self.assertEqual(frappe.db.count("OmniQuery Surveyor"), before)

	def test_an_unregistered_respondent_is_left_empty(self):
		self.assertIsNone(resolve_respondent("NonExistentPerson"))

	def _payload(self, **extra):
		return {
			"idempotency_key": f"OQS-{PREFIX.replace(' ', '')}-{uuid.uuid4().hex[:6]}",
			"survey_template": self.template,
			"template_version": 1,
			"items": [{"question_code": "q1", "value": "Jaipur"}],
			**extra,
		}


def _sign_in(user):
	frappe.set_user(user)
	frappe.local.request_cache.clear()


def _surveyor_user(surveyor):
	return frappe.db.get_value("OmniQuery Surveyor", surveyor, "user")


def _make_user(email):
	frappe.get_doc({
		"doctype": "User", "email": email, "first_name": email.split("_")[0].title(), "last_name": "Issue35",
		"send_welcome_email": 0, "roles": [{"role": "OmniQuery User"}],
	}).insert(ignore_permissions=True)


def _make_template(project):
	doc = frappe.get_doc({
		"doctype": "OmniQuery Template", "title": f"{PREFIX} Survey", "project": project, "version": 1,
		"sections": [{"section_code": "SEC_1", "section_title": "Basic Section"}],
		"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "District"}],
	}).insert(ignore_permissions=True)
	doc.submit()
	return doc.name


def _cleanup():
	key = ["like", f"OQS-{PREFIX.replace(' ', '')}-%"]
	delete_test_docs([
		("OmniQuery Response", {"idempotency_key": key}),
		("OmniQuery Sync Audit Log", {"idempotency_key": key}),
		("OmniQuery Template", {"title": ["like", f"{PREFIX} %"]}),
		("OmniQuery Project", {"project_name": ["like", f"{PREFIX} %"]}),
		("OmniQuery Surveyor", {"user": ["in", USERS]}),
		("User", {"name": ["in", USERS]}),
	])
