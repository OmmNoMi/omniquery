import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.api.sync import AUDIT_THRESHOLD_DEFAULTS, audit_thresholds, batch_push, gps_reason, speedrun_reason
from omniquery.patches.v1_0 import dedupe_surveyor_users, remove_machine_supervisor_audits
from omniquery.tests.utils import delete_test_docs

# batch_push commits mid-request, so the FrappeTestCase rollback cannot undo it: tearDownClass deletes
# everything these tests create, matched by this prefix.
PREFIX = f"TEST-AUDIT-{frappe.generate_hash(length=6)}"
AUDIT = "OmniQuery Supervisor Audit"
SETTINGS = "OmniQuery Settings"


def make_user(suffix, role):
	return frappe.get_doc({"doctype": "User", "email": f"{PREFIX.lower()}-{suffix}@example.com", "first_name": PREFIX,
		"send_welcome_email": 0, "roles": [{"role": role}]}).insert(ignore_permissions=True).name


class TestSupervisorAuditIntegrity(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls.manager, cls.other_manager = make_user("manager", "OmniQuery Manager"), make_user("manager2", "OmniQuery Manager")
		cls.field_user = make_user("field", "OmniQuery User")
		cls.surveyor = frappe.get_doc({"doctype": "OmniQuery Surveyor", "surveyor_name": PREFIX,
			"user": cls.field_user, "status": "Active"}).insert(ignore_permissions=True).name
		project = frappe.get_doc({"doctype": "OmniQuery Project", "project_name": PREFIX,
			"grantor_organization": "Test", "status": "Active"}).insert(ignore_permissions=True)
		cls.template = frappe.get_doc({"doctype": "OmniQuery Template", "title": PREFIX, "project": project.name,
			"version": 1, "status": "Published"}).insert(ignore_permissions=True).name
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		responses = frappe.get_all("OmniQuery Response", filters={"survey_template": cls.template}, pluck="name")
		delete_test_docs([
			(AUDIT, {"survey_response": ["in", responses or [""]]}),
			("OmniQuery Response", {"name": ["in", responses or [""]]}),
			("OmniQuery Sync Audit Log", {"idempotency_key": ["like", f"{PREFIX}%"]}),
			("OmniQuery Field Error Log", {"question_code": ["like", f"{PREFIX}%"]}),
			("OmniQuery Template", {"name": cls.template}),
			("OmniQuery Project", {"project_name": PREFIX}),
			("OmniQuery Surveyor", {"surveyor_name": ["like", f"{PREFIX}%"]}),
			("User", {"name": ["in", [cls.manager, cls.other_manager, cls.field_user]]}),
		])
		frappe.db.commit()
		super().tearDownClass()

	def tearDown(self):
		frappe.set_user("Administrator")

	def push(self, key, questions=6, **extra):
		payload = {"idempotency_key": f"{PREFIX}-{key}", "survey_template": self.template, "template_version": 1,
			"surveyor": self.surveyor, **extra,
			"items": [{"question_code": f"Q_{i}", "question_label": f"Q {i}", "value": f"A {i}"} for i in range(questions)]}
		result = batch_push(submissions=[payload])["results"][0]
		self.assertEqual(result["status"], "SUCCESS", result)
		return frappe.get_doc("OmniQuery Response", result["doc_name"])

	def with_settings(self, values):
		"""Set threshold fields for one test and put the saved values (or their absence) back after it."""
		saved = frappe.db.get_singles_dict(SETTINGS)
		for field, value in values.items():
			frappe.db.set_single_value(SETTINGS, field, value)
		self.addCleanup(self.restore_settings, {field: saved.get(field) for field in values})

	def restore_settings(self, saved):
		for field, value in saved.items():
			if value is None:
				frappe.db.delete("Singles", {"doctype": SETTINGS, "field": field})
			else:
				frappe.db.set_single_value(SETTINGS, field, value)
		frappe.db.commit()

	# sync records signals on the Response, never an audit

	def test_speedrun_is_flagged_on_the_response_and_no_audit_is_made(self):
		self.with_settings(AUDIT_THRESHOLD_DEFAULTS)
		doc = self.push("SPEED", time_spent_seconds=5)
		self.assertFalse(frappe.db.exists(AUDIT, {"survey_response": doc.name}))
		self.assertEqual((doc.is_outlier_flagged, doc.time_spent_seconds, doc.survey_status), (1, 5, "Audit Flagged"))
		self.assertIn("Speedrun detected: 5s for 6 questions", doc.outlier_reasons)

	def test_normal_sync_is_not_flagged(self):
		self.with_settings(AUDIT_THRESHOLD_DEFAULTS)
		doc = self.push("NORMAL", time_spent_seconds=90)
		self.assertFalse(frappe.db.exists(AUDIT, {"survey_response": doc.name}))
		self.assertEqual((doc.is_outlier_flagged, doc.outlier_reasons, doc.survey_status), (0, None, "Submitted"))

	def test_unmeasured_telemetry_is_zero_and_hidden(self):
		doc = self.push("UNKNOWN")
		self.assertEqual((doc.time_spent_seconds, doc.gps_distance_variance_meters, doc.is_outlier_flagged), (0, 0, 0))
		meta = frappe.get_meta("OmniQuery Response")
		for field in ("time_spent_seconds", "gps_distance_variance_meters"):
			self.assertEqual(meta.get_field(field).depends_on, f"eval:doc.{field}")

	# thresholds come from OmniQuery Settings

	def test_settings_thresholds_drive_the_sync(self):
		self.with_settings({"speed_threshold_sec_per_question": 20, "min_questions_for_speed_check": 5})
		self.assertEqual(self.push("STRICT", time_spent_seconds=90).is_outlier_flagged, 1, "90s < 6 x 20s")
		self.with_settings({"speed_threshold_sec_per_question": 3, "min_questions_for_speed_check": 10})
		self.assertEqual(self.push("FEW", time_spent_seconds=5).is_outlier_flagged, 0, "6 questions < 10 minimum")

	def test_zero_thresholds_are_honoured_and_unsaved_ones_default(self):
		self.with_settings({**AUDIT_THRESHOLD_DEFAULTS, "speed_threshold_sec_per_question": 0, "gps_distance_threshold_m": 0})
		thresholds = audit_thresholds()
		self.assertIsNone(speedrun_reason(6, 1, thresholds), "a 0s-per-question limit flags nothing")
		self.assertIn("GPS variance high", gps_reason(1, thresholds), "a 0m limit flags any distance")
		frappe.db.delete("Singles", {"doctype": SETTINGS, "field": ["in", list(AUDIT_THRESHOLD_DEFAULTS)]})
		self.assertEqual(audit_thresholds(), AUDIT_THRESHOLD_DEFAULTS)

	# an audit is signed by the person who records it

	def test_audit_is_signed_by_the_manager_who_records_it(self):
		response = self.push("SIGN", time_spent_seconds=90).name
		frappe.set_user(self.manager)
		audit = frappe.get_doc({"doctype": AUDIT, "survey_response": response, "supervisor": self.other_manager,
			"audit_verdict": "Verified", "audit_remarks": "Checked by phone."}).insert()
		self.assertEqual(audit.supervisor, self.manager, "a manager cannot sign an audit as someone else")

	def test_system_manager_may_record_an_audit_for_a_supervisor(self):
		response = self.push("BEHALF", time_spent_seconds=90).name
		audit = frappe.get_doc({"doctype": AUDIT, "survey_response": response, "supervisor": self.manager,
			"audit_verdict": "Verified"}).insert()
		self.assertEqual(audit.supervisor, self.manager)

	def test_editing_an_audit_does_not_re_sign_it(self):
		response = self.push("EDIT", time_spent_seconds=90).name
		frappe.set_user(self.manager)
		name = frappe.get_doc({"doctype": AUDIT, "survey_response": response, "audit_verdict": "Verified"}).insert().name
		frappe.set_user(self.other_manager)
		audit = frappe.get_doc(AUDIT, name)
		audit.audit_remarks = "Second look."
		audit.save()
		self.assertEqual(frappe.db.get_value(AUDIT, name, "supervisor"), self.manager)
		audit.supervisor = self.other_manager
		self.assertRaises(frappe.CannotChangeConstantError, audit.save)

	def test_quality_signals_cannot_be_edited_by_a_reviewer(self):
		name = self.push("GUARD", time_spent_seconds=5).name
		frappe.set_user(self.manager)
		doc = frappe.get_doc("OmniQuery Response", name)
		doc.is_outlier_flagged, doc.outlier_reasons = 0, None
		self.assertRaises(frappe.ValidationError, doc.save)
		frappe.set_user("Administrator")
		self.assertEqual(frappe.db.get_value("OmniQuery Response", name, "is_outlier_flagged"), 1)

	# migration patches

	def test_cleanup_patch_moves_machine_signals_and_keeps_human_audits(self):
		machine, human = self.push("OLD-MACHINE").name, self.push("OLD-HUMAN").name
		self.insert_audit(machine, "Flagged for Re-Survey", "Speedrun detected: 4s for 6 questions (min threshold: 18s)",
			time_spent_seconds=4, is_outlier_flagged=1)
		kept = self.insert_audit(human, "Verified", "Visited the household.")
		remove_machine_supervisor_audits.execute()
		self.assertFalse(frappe.db.exists(AUDIT, {"survey_response": machine}))
		self.assertTrue(frappe.db.exists(AUDIT, kept))
		signals = frappe.db.get_value("OmniQuery Response", machine, ["time_spent_seconds", "is_outlier_flagged",
			"outlier_reasons"], as_dict=True)
		self.assertEqual((signals.time_spent_seconds, signals.is_outlier_flagged), (4, 1))
		self.assertTrue(signals.outlier_reasons.startswith("Speedrun detected"))

	def test_cleanup_patch_removes_verified_machine_audits(self):
		response = self.push("OLD-VERIFIED").name
		self.insert_audit(response, "Verified", remove_machine_supervisor_audits.VERIFIED_REMARK, time_spent_seconds=60)
		remove_machine_supervisor_audits.execute()
		self.assertFalse(frappe.db.exists(AUDIT, {"survey_response": response}))
		self.assertEqual(frappe.db.get_value("OmniQuery Response", response, "time_spent_seconds"), 60)

	def test_dedupe_patch_detaches_a_surveyor_and_says_why(self):
		# the unique index stops a second link being made, so the detach step is tested on its own
		user = make_user("dup", "OmniQuery User")
		self.addCleanup(frappe.delete_doc, "User", user, force=True, ignore_permissions=True)
		name = frappe.get_doc({"doctype": "OmniQuery Surveyor", "surveyor_name": f"{PREFIX}-DUP", "user": user,
			"status": "Active"}).insert(ignore_permissions=True).name
		self.assertNotIn(user, dedupe_surveyor_users.duplicate_users())
		dedupe_surveyor_users.detach(name, user)
		self.assertEqual(frappe.db.get_value("OmniQuery Surveyor", name, ["user", "status"]), (None, "Inactive"))
		self.assertTrue(frappe.db.exists("Comment", {"reference_name": name, "content": ["like", f"%{user}%"]}))

	def test_surveyor_user_is_unique(self):
		self.assertTrue(frappe.get_meta("OmniQuery Surveyor").get_field("user").unique)
		self.assertRaises(frappe.UniqueValidationError, frappe.get_doc({"doctype": "OmniQuery Surveyor",
			"surveyor_name": f"{PREFIX}-TWIN", "user": self.field_user, "status": "Active"}).insert, ignore_permissions=True)

	def insert_audit(self, response, verdict, remarks, **signals):
		"""An audit as the old sync wrote it, with the signals cleared from its Response as they were then."""
		frappe.db.set_value("OmniQuery Response", response, {"time_spent_seconds": 0, "is_outlier_flagged": 0,
			"outlier_reasons": None})
		return frappe.get_doc({"doctype": AUDIT, "survey_response": response, "audit_verdict": verdict,
			"audit_remarks": remarks, **signals}).insert(ignore_permissions=True).name
