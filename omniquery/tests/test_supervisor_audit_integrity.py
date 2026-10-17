import uuid
import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.api.sync import batch_push


class TestSupervisorAuditIntegrity(FrappeTestCase):
	def setUp(self):
		self.test_records = []
		# Project fixture
		self.proj = frappe.db.get_value("OmniQuery Project", {"status": "Active"}, "name")
		if not self.proj:
			p = frappe.get_doc({
				"doctype": "OmniQuery Project",
				"project_name": "Test Audit Integrity Project",
				"status": "Active",
			}).insert(ignore_permissions=True)
			self.proj = p.name
			self.test_records.append(("OmniQuery Project", self.proj))

		# Template fixture
		t = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Audit Integrity Test Template",
			"project": self.proj,
			"version": 1,
			"status": "Published",
		}).insert(ignore_permissions=True)
		self.tmpl = t.name
		self.test_records.append(("OmniQuery Template", self.tmpl))

	def tearDown(self):
		frappe.set_user("Administrator")
		for dt, dn in reversed(self.test_records):
			try:
				if frappe.db.exists(dt, dn):
					frappe.delete_doc(dt, dn, force=True)
			except Exception:
				pass
		frappe.db.commit()

	def test_sync_does_not_create_supervisor_audit_and_sets_outlier_signal(self):
		"""
		Issue #59 Invariant: Syncing a response must NOT create an automated Supervisor Audit
		with a human verdict and forged supervisor identity.
		Instead, automated telemetry signals must be saved directly on OmniQuery Response.
		"""
		key = f"TEST-SPEEDRUN-{uuid.uuid4().hex[:6]}"
		payload = {
			"idempotency_key": key,
			"survey_template": self.tmpl,
			"template_version": 1,
			"surveyor": "SURV-Administrator",
			"time_spent_seconds": 5,  # 5 seconds for 6 questions (Outlier)
			"items": [
				{"question_code": f"Q_{i}", "question_label": f"Question {i}", "value": f"Ans {i}"}
				for i in range(1, 7)
			],
		}

		res = batch_push(submissions=[payload])
		self.assertEqual(res["results"][0]["status"], "SUCCESS")
		doc_name = res["results"][0]["doc_name"]
		self.test_records.append(("OmniQuery Response", doc_name))

		# Zero machine-generated Supervisor Audit
		audit_name = f"AUDIT-{doc_name}"
		self.assertFalse(
			frappe.db.exists("OmniQuery Supervisor Audit", audit_name),
			f"Supervisor Audit {audit_name} was synthesized by machine during sync. Audits must only be created by human supervisors."
		)

		# Signals must be on OmniQuery Response
		resp_doc = frappe.get_doc("OmniQuery Response", doc_name)
		self.assertEqual(resp_doc.is_outlier_flagged, 1)
		self.assertIn("Speedrun detected", resp_doc.outlier_reasons or "")
		self.assertEqual(resp_doc.survey_status, "Audit Flagged")

	def test_normal_sync_creates_no_audit_and_flag_is_zero(self):
		"""
		Telemetry Invariant: Normal survey sync creates NO Supervisor Audit record
		and sets is_outlier_flagged = 0 on OmniQuery Response.
		"""
		key = f"TEST-NORMAL-{uuid.uuid4().hex[:6]}"
		payload = {
			"idempotency_key": key,
			"survey_template": self.tmpl,
			"template_version": 1,
			"surveyor": "SURV-Administrator",
			"time_spent_seconds": 90,  # 90s for 6 questions (Normal)
			"items": [
				{"question_code": f"Q_{i}", "question_label": f"Question {i}", "value": f"Ans {i}"}
				for i in range(1, 7)
			],
		}

		res = batch_push(submissions=[payload])
		doc_name = res["results"][0]["doc_name"]
		self.test_records.append(("OmniQuery Response", doc_name))

		audit_name = f"AUDIT-{doc_name}"
		self.assertFalse(
			frappe.db.exists("OmniQuery Supervisor Audit", audit_name),
			"Supervisor Audit was incorrectly created for normal submission."
		)

		resp_doc = frappe.get_doc("OmniQuery Response", doc_name)
		self.assertEqual(resp_doc.is_outlier_flagged, 0)
		self.assertEqual(resp_doc.survey_status, "Submitted")

	def test_manager_has_create_and_write_permissions_on_supervisor_audit(self):
		"""
		Issue #59 Invariant: OmniQuery Manager role must have create and write DocPerms
		on OmniQuery Supervisor Audit.
		"""
		manager_email = "oq.manager.test@example.com"
		frappe.set_user(manager_email)
		self.assertTrue(
			frappe.has_permission("OmniQuery Supervisor Audit", "read"),
			"OmniQuery Manager must have read permission on OmniQuery Supervisor Audit"
		)
		self.assertTrue(
			frappe.has_permission("OmniQuery Supervisor Audit", "create"),
			"OmniQuery Manager must have create permission on OmniQuery Supervisor Audit"
		)
		self.assertTrue(
			frappe.has_permission("OmniQuery Supervisor Audit", "write"),
			"OmniQuery Manager must have write permission on OmniQuery Supervisor Audit"
		)

	def test_supervisor_audit_created_by_manager_records_manager_identity(self):
		"""
		Identity Invariant: When an OmniQuery Manager creates a Supervisor Audit,
		the supervisor field must reflect the authenticated manager, not Administrator or surveyor.
		"""
		manager_email = "oq.manager.test@example.com"
		key = f"TEST-MANUAL-{uuid.uuid4().hex[:6]}"
		payload = {
			"idempotency_key": key,
			"survey_template": self.tmpl,
			"template_version": 1,
			"surveyor": "SURV-Administrator",
			"time_spent_seconds": 90,
			"items": [{"question_code": "Q_1", "question_label": "Q1", "value": "A1"}],
		}
		res = batch_push(submissions=[payload])
		doc_name = res["results"][0]["doc_name"]
		self.test_records.append(("OmniQuery Response", doc_name))

		frappe.set_user(manager_email)
		audit_doc = frappe.get_doc({
			"doctype": "OmniQuery Supervisor Audit",
			"survey_response": doc_name,
			"audit_verdict": "Verified",
			"audit_remarks": "Manually verified by field operations manager.",
		}).insert()
		self.test_records.append(("OmniQuery Supervisor Audit", audit_doc.name))

		self.assertEqual(audit_doc.supervisor, manager_email)

	def test_thresholds_configured_in_settings(self):
		"""
		Configuration Invariant: Outlier thresholds must be configurable in OmniQuery Settings,
		not hard-coded in python modules.
		"""
		settings = frappe.get_doc("OmniQuery Settings")
		self.assertTrue(
			hasattr(settings, "speed_threshold_sec_per_question"),
			"OmniQuery Settings is missing speed_threshold_sec_per_question field"
		)
		self.assertTrue(
			hasattr(settings, "min_questions_for_speed_check"),
			"OmniQuery Settings is missing min_questions_for_speed_check field"
		)
		self.assertTrue(
			hasattr(settings, "gps_distance_threshold_m"),
			"OmniQuery Settings is missing gps_distance_threshold_m field"
		)

	def test_surveyor_user_uniqueness(self):
		"""
		Data Correctness Invariant: An OmniQuery Surveyor record's linked Frappe User
		must be unique to prevent multi-surveyor identity collisions.
		"""
		field = frappe.get_meta("OmniQuery Surveyor").get_field("user")
		self.assertTrue(
			bool(field.unique),
			"OmniQuery Surveyor 'user' field must be unique."
		)
