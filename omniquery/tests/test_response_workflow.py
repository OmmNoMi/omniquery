import unittest.mock

import frappe
from frappe.model.workflow import apply_workflow, get_transitions
from frappe.tests.utils import FrappeTestCase
from frappe.utils import cint

from omniquery.api.sync import batch_push, resolve_surveyor, sync_draft
from omniquery.install import _response_workflow_payload, ensure_response_workflow
from omniquery.omniquery.doctype.omniquery_response.omniquery_response import apply_response_workflow
from omniquery.tests.utils import delete_test_docs

MANAGER, SURVEYOR = "resp_manager@ommnomi.test", "resp_user@ommnomi.test"
PROJECT = "Workflow Test Project"
KEY = {"idempotency_key": ["like", "TEST-WF-%"]}
# the docstatus sync gives a response in each state it writes (api/sync.py)
SYNC_DOCSTATUS = {"Draft": 0, "Submitted": 1}


class TestResponseWorkflow(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		ensure_response_workflow()
		_ensure_user(MANAGER, "OmniQuery Manager")
		_ensure_user(SURVEYOR, "OmniQuery User")
		cls.template, cls.surveyor = _ensure_template(), resolve_surveyor(SURVEYOR)
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		_cleanup(cls.template)
		super().tearDownClass()

	def tearDown(self):
		frappe.set_user("Administrator")

	def _response(self, status="Submitted", owner="Administrator"):
		frappe.set_user(owner)  # the inserting user owns the row, as sync makes the surveyor own it
		doc = frappe.get_doc({
			"doctype": "OmniQuery Response", "idempotency_key": f"TEST-WF-{frappe.generate_hash(length=8)}",
			"survey_template": self.template, "template_version": 1, "survey_status": status,
			"surveyor": self.surveyor, "docstatus": SYNC_DOCSTATUS[status],
		}).insert(ignore_permissions=True)
		frappe.set_user("Administrator")
		return doc

	def test_manager_approves_a_synced_response_and_it_is_versioned(self):
		resp = self._response()
		frappe.set_user(MANAGER)
		with unittest.mock.patch("frappe.in_test", False):  # Frappe skips Version rows under tests
			self.assertEqual(apply_response_workflow(resp.name, "Approve").survey_status, "Approved")
		data = frappe.get_all("Version", filters={"ref_doctype": resp.doctype, "docname": resp.name}, pluck="data")
		self.assertTrue(any("survey_status" in d for d in data), data)

	def test_surveyor_cannot_approve(self):
		"""Even their own response: review is the reviewer's, and the surveyor can read this one."""
		resp = self._response(owner=SURVEYOR)
		frappe.set_user(SURVEYOR)
		with self.assertRaises(frappe.ValidationError):
			apply_response_workflow(resp.name, "Approve")
		self.assertEqual(frappe.db.get_value(resp.doctype, resp.name, "survey_status"), "Submitted")

	def test_flag_and_reject_need_a_reason_which_is_kept_as_a_comment(self):
		for action, state in (("Flag for Audit", "Audit Flagged"), ("Reject", "Rejected")):
			resp = self._response()
			frappe.set_user(MANAGER)
			for blank in (None, "", "   "):
				self.assertRaises(frappe.ValidationError, apply_response_workflow, resp.name, action, blank)
			self.assertEqual(apply_response_workflow(resp.name, action, " Too fast ").survey_status, state)
			comments = frappe.get_all("Comment", filters={"reference_name": resp.name, "comment_type": "Comment"}, pluck="content")
			self.assertIn(f"{action}: Too fast", comments)

	def test_frappe_own_workflow_action_cannot_reject_without_a_reason(self):
		"""Desk's list view and the REST API call apply_workflow directly, never our wrapper."""
		resp = self._response()
		frappe.set_user(MANAGER)
		with self.assertRaisesRegex(frappe.ValidationError, "A reason is required"):
			apply_workflow(frappe.get_doc(resp.doctype, resp.name), "Reject")

	def test_draft_has_no_review_transition(self):
		resp = self._response("Draft")
		frappe.set_user(MANAGER)
		self.assertEqual([t.action for t in get_transitions(resp)], [])
		self.assertRaises(frappe.ValidationError, apply_response_workflow, resp.name, "Approve")

	def test_surveyor_sync_still_submits_a_live_draft(self):
		"""Regression: a review workflow must never block the field app's own draft and submit."""
		key = f"TEST-WF-{frappe.generate_hash(length=8)}"
		sub = {"idempotency_key": key, "survey_template": self.template, "template_version": 1, "items": []}
		frappe.set_user(SURVEYOR)
		self.assertEqual(sync_draft(data={"draft": sub})["status"], "SUCCESS")
		self.assertEqual(batch_push(submissions=[sub])["results"][0]["status"], "SUCCESS")
		self.assertEqual(frappe.db.get_value("OmniQuery Response", key, ["survey_status", "docstatus"]), ("Submitted", 1))

	def test_guest_sync_inserts_a_submitted_response(self):
		"""A guest holds no workflow role, so only the field-state rule lets this insert through."""
		key = f"TEST-WF-{frappe.generate_hash(length=8)}"
		frappe.set_user("Guest")
		sub = {"idempotency_key": key, "survey_template": self.template, "template_version": 1, "items": []}
		self.assertEqual(batch_push(submissions=[sub])["results"][0]["status"], "SUCCESS")
		self.assertEqual(frappe.db.get_value("OmniQuery Response", key, ["survey_status", "docstatus"]), ("Submitted", 1))


class TestWorkflowInvariants(FrappeTestCase):
	"""Rules every workflow on an OmniQuery doctype must keep, the shipped one and any added later."""

	def test_shipped_and_installed_workflows_keep_the_rules(self):
		for workflow in [_response_workflow_payload(), *_installed_omniquery_workflows()]:
			with self.subTest(workflow=workflow["workflow_name"]):
				self.assertEqual(workflow_problems(workflow), [])


def workflow_problems(workflow):
	"""Each rule broken here fails at runtime, after a reviewer has clicked, not at install."""
	doctype = workflow["document_type"]
	docstatus = {s["state"]: cint(s["doc_status"]) for s in workflow["states"]}
	problems = [f"{s} must be docstatus {d}: sync stores it so" for s, d in _sync_states(doctype) if docstatus.get(s, d) != d]
	submitters = {p.role for p in frappe.get_meta(doctype).permissions if p.submit}
	for t in workflow["transitions"]:
		if docstatus[t["state"]] == 1 and docstatus[t["next_state"]] == 0:
			problems.append(f"{t['state']} -> {t['next_state']}: a submitted document cannot return to draft")
		if docstatus[t["state"]] == 1 and t["allowed"] not in submitters:
			problems.append(f"{t['allowed']} needs submit on {doctype} to save after submit ({t['action']})")
	return problems


def _sync_states(doctype):
	return SYNC_DOCSTATUS.items() if doctype == "OmniQuery Response" else ()


def _installed_omniquery_workflows():
	doctypes = frappe.get_all("DocType", filters={"module": "OmniQuery"}, pluck="name")
	names = frappe.get_all("Workflow", filters={"document_type": ["in", doctypes]}, pluck="name")
	return [frappe.get_doc("Workflow", name).as_dict() for name in names]


def _ensure_user(email, role):
	if not frappe.db.exists("User", email):
		frappe.get_doc({"doctype": "User", "email": email, "first_name": email.split("@")[0]}).insert(ignore_permissions=True)
	user = frappe.get_doc("User", email)
	user.set("roles", [{"role": role}])
	user.save(ignore_permissions=True)


def _ensure_template():
	if not frappe.db.exists("OmniQuery Project", {"project_name": PROJECT}):
		frappe.get_doc({"doctype": "OmniQuery Project", "project_name": PROJECT, "grantor_organization": "Test Grantor", "status": "Active"}).insert(ignore_permissions=True)
	project = frappe.db.get_value("OmniQuery Project", {"project_name": PROJECT})
	template = frappe.get_doc({"doctype": "OmniQuery Template", "title": "Workflow Test Template", "project": project, "status": "Draft", "is_public": 1})
	template.insert(ignore_permissions=True)
	template.submit()
	return template.name


def _cleanup(template):
	delete_test_docs([
		("OmniQuery Response", KEY), ("OmniQuery Sync Audit Log", KEY),
		("OmniQuery Template", {"name": template}), ("OmniQuery Surveyor", {"user": ["in", [MANAGER, SURVEYOR]]}),
		("OmniQuery Project", {"project_name": PROJECT}), ("User", {"name": ["in", [MANAGER, SURVEYOR]]}),
	])
	frappe.db.commit()
