import uuid
import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.api.sync import batch_push


class TestSupervisorAudit(FrappeTestCase):
	def setUp(self):
		self.test_records = []
		# Project fixture
		self.proj = frappe.db.get_value("OmniQuery Project", {"status": "Active"}, "name")
		if not self.proj:
			p = frappe.get_doc({
				"doctype": "OmniQuery Project",
				"project_name": "Test Audit Project",
				"status": "Active",
			}).insert(ignore_permissions=True)
			self.proj = p.name
			self.test_records.append(("OmniQuery Project", self.proj))

		# Template fixture
		t = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Speedrun Audit Test Template",
			"project": self.proj,
			"version": 1,
			"status": "Published",
		}).insert(ignore_permissions=True)
		self.tmpl = t.name
		self.test_records.append(("OmniQuery Template", self.tmpl))

	def tearDown(self):
		for dt, dn in reversed(self.test_records):
			try:
				if frappe.db.exists(dt, dn):
					frappe.delete_doc(dt, dn, force=True)
			except Exception:
				pass
		frappe.db.commit()

	def test_automated_speedrun_outlier_detection(self):
		"""
		Telemetry Invariant: A survey with 6 questions submitted with time_spent_seconds=5
		must automatically trigger an outlier flag (< 18 seconds) and mark status as Audit Flagged.
		"""
		key = f"TEST-SPEEDRUN-{uuid.uuid4().hex[:6]}"
		payload = {
			"idempotency_key": key,
			"survey_template": self.tmpl,
			"template_version": 1,
			"surveyor": "SURV-Administrator",
			"time_spent_seconds": 5,  # Only 5 seconds for 6 questions (Suspicious speedrun)
			"items": [
				{"question_code": f"Q_{i}", "question_label": f"Question {i}", "value": f"Ans {i}"}
				for i in range(1, 7)
			],
		}

		res = batch_push(submissions=[payload])
		self.assertEqual(res["results"][0]["status"], "SUCCESS")
		doc_name = res["results"][0]["doc_name"]
		self.test_records.append(("OmniQuery Response", doc_name))

		# Verify Supervisor Audit record was synthesized
		audit_name = f"AUDIT-{doc_name}"
		self.assertTrue(frappe.db.exists("OmniQuery Supervisor Audit", audit_name))
		self.test_records.append(("OmniQuery Supervisor Audit", audit_name))

		audit_doc = frappe.get_doc("OmniQuery Supervisor Audit", audit_name)
		self.assertEqual(audit_doc.is_outlier_flagged, 1)
		self.assertEqual(audit_doc.audit_verdict, "Flagged for Re-Survey")
		self.assertIn("Speedrun detected", audit_doc.audit_remarks)

		# Verify Response was moved to Audit Flagged
		resp_doc = frappe.get_doc("OmniQuery Response", doc_name)
		self.assertEqual(resp_doc.survey_status, "Audit Flagged")

	def test_automated_normal_submission_verification(self):
		"""
		Telemetry Invariant: A survey submitted with reasonable time (60 seconds for 6 questions)
		must be marked Verified without outlier flags.
		"""
		key = f"TEST-NORMAL-{uuid.uuid4().hex[:6]}"
		payload = {
			"idempotency_key": key,
			"survey_template": self.tmpl,
			"template_version": 1,
			"surveyor": "SURV-Administrator",
			"time_spent_seconds": 90,  # 90 seconds for 6 questions (Normal)
			"items": [
				{"question_code": f"Q_{i}", "question_label": f"Question {i}", "value": f"Ans {i}"}
				for i in range(1, 7)
			],
		}

		res = batch_push(submissions=[payload])
		doc_name = res["results"][0]["doc_name"]
		self.test_records.append(("OmniQuery Response", doc_name))

		audit_name = f"AUDIT-{doc_name}"
		self.assertTrue(frappe.db.exists("OmniQuery Supervisor Audit", audit_name))
		self.test_records.append(("OmniQuery Supervisor Audit", audit_name))

		audit_doc = frappe.get_doc("OmniQuery Supervisor Audit", audit_name)
		self.assertEqual(audit_doc.is_outlier_flagged, 0)
		self.assertEqual(audit_doc.audit_verdict, "Verified")
