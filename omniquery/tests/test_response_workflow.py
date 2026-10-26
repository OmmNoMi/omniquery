import unittest
import frappe
from frappe.model.workflow import get_transitions
from omniquery.omniquery.doctype.omniquery_response.omniquery_response import (
	apply_response_workflow,
)


class TestResponseWorkflow(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		frappe.set_user("Administrator")
		cls._ensure_roles()
		cls._ensure_test_users()
		cls._ensure_project_and_template()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		cls._cleanup()

	@classmethod
	def _ensure_roles(cls):
		for role in ("OmniQuery Manager", "OmniQuery User", "OmniQuery Admin"):
			if not frappe.db.exists("Role", role):
				frappe.get_doc({"doctype": "Role", "role_name": role, "desk_access": 1}).insert(
					ignore_permissions=True
				)

	@classmethod
	def _ensure_test_users(cls):
		users = {
			"resp_manager@ommnomi.test": ["OmniQuery Manager"],
			"resp_user@ommnomi.test": ["OmniQuery User"],
		}
		for email, roles in users.items():
			if not frappe.db.exists("User", email):
				u = frappe.get_doc({
					"doctype": "User",
					"email": email,
					"first_name": email.split("@")[0],
					"roles": [{"role": r} for r in roles],
				}).insert(ignore_permissions=True)
			else:
				u = frappe.get_doc("User", email)
				u.roles = []
				for r in roles:
					u.append("roles", {"role": r})
				u.save(ignore_permissions=True)

	@classmethod
	def _ensure_project_and_template(cls):
		if not frappe.db.exists("OmniQuery Project", "PROJ-Workflow Test Project"):
			p = frappe.get_doc({
				"doctype": "OmniQuery Project",
				"project_name": "Workflow Test Project",
				"grantor_organization": "Test Grantor Org",
				"status": "Active",
			}).insert(ignore_permissions=True)
			cls.project_name = p.name
		else:
			cls.project_name = "PROJ-Workflow Test Project"

		cls.template_name = "TMPL-Workflow-Test-1"
		if not frappe.db.exists("OmniQuery Template", cls.template_name):
			t = frappe.get_doc({
				"doctype": "OmniQuery Template",
				"title": "Workflow Test Template",
				"project": cls.project_name,
				"version": 1,
				"status": "Published",
				"sections": [{"section_code": "SEC_1", "section_title": "Section 1", "display_order": 1}],
				"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Q1", "is_mandatory": 0}],
			}).insert(ignore_permissions=True)
			cls.template_name = t.name

		if not frappe.db.exists("OmniQuery Surveyor", "SURV-resp_user"):
			frappe.get_doc({
				"doctype": "OmniQuery Surveyor",
				"surveyor_name": "resp_user",
				"user": "resp_user@ommnomi.test",
				"status": "Active",
			}).insert(ignore_permissions=True)

	@classmethod
	def _cleanup(cls):
		for r in frappe.get_all("OmniQuery Response", filters={"survey_template": getattr(cls, "template_name", "")}, pluck="name"):
			frappe.delete_doc("OmniQuery Response", r, force=True, ignore_permissions=True)
		for u in ("resp_manager@ommnomi.test", "resp_user@ommnomi.test"):
			if frappe.db.exists("User", u):
				frappe.delete_doc("User", u, force=True, ignore_permissions=True)
		if frappe.db.exists("OmniQuery Surveyor", "SURV-resp_user"):
			frappe.delete_doc("OmniQuery Surveyor", "SURV-resp_user", force=True, ignore_permissions=True)
		if hasattr(cls, "template_name") and frappe.db.exists("OmniQuery Template", cls.template_name):
			frappe.delete_doc("OmniQuery Template", cls.template_name, force=True, ignore_permissions=True)
		if hasattr(cls, "project_name") and frappe.db.exists("OmniQuery Project", cls.project_name):
			frappe.delete_doc("OmniQuery Project", cls.project_name, force=True, ignore_permissions=True)
		frappe.db.commit()

	def _create_response(self, status="Submitted"):
		frappe.set_user("Administrator")
		resp = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"idempotency_key": f"TEST-WF-{frappe.generate_hash(length=8)}",
			"survey_template": self.template_name,
			"template_version": 1,
			"surveyor": "SURV-resp_user",
			"survey_status": status,
		}).insert(ignore_permissions=True)
		frappe.db.commit()
		return resp

	def test_omniquery_user_cannot_apply_approve_transition(self):
		resp = self._create_response(status="Submitted")
		frappe.set_user("resp_user@ommnomi.test")

		with self.assertRaises(frappe.PermissionError):
			apply_response_workflow(resp.name, "Approve")

	def test_omniquery_manager_can_apply_approve_transition_and_version_logged(self):
		resp = self._create_response(status="Submitted")
		frappe.set_user("resp_manager@ommnomi.test")

		updated = apply_response_workflow(resp.name, "Approve")
		self.assertEqual(updated.survey_status, "Approved")

		# Verify recorded in Version log
		versions = frappe.get_all(
			"Version",
			filters={"ref_doctype": "OmniQuery Response", "docname": resp.name},
			fields=["data"],
		)
		self.assertTrue(len(versions) > 0, "Approval transition must be recorded in Version log")
		self.assertIn("survey_status", versions[0]["data"])

	def test_flagging_with_reason_stores_comment(self):
		resp = self._create_response(status="Submitted")
		frappe.set_user("resp_manager@ommnomi.test")

		reason = "Telemetry speedrun detected: completed in 4 seconds"
		updated = apply_response_workflow(resp.name, "Flag for Audit", reason=reason)
		self.assertEqual(updated.survey_status, "Audit Flagged")

		# Check Comment exists on document
		comments = frappe.get_all(
			"Comment",
			filters={"reference_doctype": "OmniQuery Response", "reference_name": resp.name},
			pluck="content",
		)
		self.assertTrue(
			any(reason in c for c in comments),
			f"Expected reason '{reason}' in response comments: {comments}",
		)

	def test_draft_response_has_no_approve_transition(self):
		resp = self._create_response(status="Draft")
		frappe.set_user("resp_manager@ommnomi.test")

		transitions = get_transitions(resp)
		actions = [t.get("action") for t in transitions]
		self.assertNotIn("Approve", actions, "Draft response must have no Approve transition")

		with self.assertRaises(Exception):
			apply_response_workflow(resp.name, "Approve")

	def test_flag_or_reject_requires_reason(self):
		resp = self._create_response(status="Submitted")
		frappe.set_user("resp_manager@ommnomi.test")

		with self.assertRaises(frappe.ValidationError):
			apply_response_workflow(resp.name, "Flag for Audit", reason=None)

		with self.assertRaises(frappe.ValidationError):
			apply_response_workflow(resp.name, "Reject", reason="")
