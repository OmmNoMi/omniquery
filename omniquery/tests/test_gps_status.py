"""Whether a response or respondent has a location, and why not when it has none (#27).

Frappe stores an empty Float as 0, so 0,0 cannot say "no location" by itself: gps_status does.
"""

import uuid

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.api.export import export_flattened_responses
from omniquery.api.sync import batch_push, sync_draft, telemetry_gps_variance
from omniquery.patches.v1_0 import backfill_gps_status
from omniquery.tests.utils import delete_test_docs

PREFIX = "Test Issue27"
KEY_PREFIX = f"OQS-{PREFIX.replace(' ', '')}-"
UID_PREFIX = "ISSUE27-"
FIX = {"gps_latitude": 26.9124, "gps_longitude": 75.7873, "gps_accuracy": 8}


class TestGPSStatus(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		_cleanup()
		project = frappe.get_doc({
			"doctype": "OmniQuery Project", "project_name": f"{PREFIX} Project", "grantor_organization": "State Mission", "status": "Active",
		}).insert(ignore_permissions=True).name
		template = frappe.get_doc({
			"doctype": "OmniQuery Template", "title": f"{PREFIX} Survey", "project": project, "version": 1,
			"sections": [{"section_code": "SEC_1", "section_title": "Basic Section"}],
			"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "District"}],
		}).insert(ignore_permissions=True)
		template.submit()
		cls.template = template.name
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		_cleanup()
		frappe.db.commit()
		super().tearDownClass()

	def test_a_response_without_a_location_says_not_captured(self):
		doc = self._submit()
		self.assertEqual(doc.gps_status, "Not captured")
		self.assertFalse(doc.gps_latitude)
		self.assertEqual(self._submit(gps_latitude=0, gps_longitude=0).gps_status, "Not captured", "0,0 is what an empty Float holds")

	def test_the_reason_the_device_gave_is_stored(self):
		self.assertEqual(self._submit(gps_status="Denied").gps_status, "Denied")
		self.assertEqual(self._submit(gps_status="Timed out").gps_status, "Timed out")
		self.assertEqual(self._submit(gps_status="Made up").gps_status, "Not captured", "only the statuses a device reports")

	def test_a_fix_is_captured_with_its_accuracy(self):
		doc = self._submit(**FIX, gps_status="Denied")
		self.assertEqual(doc.gps_status, "Captured", "coordinates outrank a stale reason")
		self.assertEqual((doc.gps_latitude, doc.gps_longitude, doc.gps_accuracy), (26.9124, 75.7873, 8))

	def test_a_zero_coordinate_is_a_real_place(self):
		doc = self._submit(gps_latitude=0, gps_longitude=32.5, gps_accuracy=0)
		self.assertEqual(doc.gps_status, "Captured")
		self.assertEqual(doc.gps_longitude, 32.5)

	def test_a_draft_sync_without_a_fix_keeps_the_fix_already_stored(self):
		payload = self._payload(**FIX, gps_status="Captured")
		sync_draft(data={"draft": payload})
		# the background draft sync sends no location at all
		sync_draft(data={"draft": {k: v for k, v in payload.items() if not k.startswith("gps_")}})
		doc = frappe.get_doc("OmniQuery Response", payload["idempotency_key"])
		self.assertEqual((doc.gps_status, doc.gps_latitude, doc.gps_accuracy), ("Captured", 26.9124, 8))

	def test_variance_is_measured_only_between_two_fixes(self):
		home = self._respondent(**FIX)
		near = frappe.get_doc({"doctype": "OmniQuery Response", "respondent": home.name, "gps_status": "Captured", "gps_latitude": 26.9125, "gps_longitude": 75.7873})
		self.assertIsNotNone(telemetry_gps_variance(near))
		# a stored response without a fix reads back as 0,0
		nowhere = frappe.get_doc({"doctype": "OmniQuery Response", "respondent": home.name, "gps_status": "Denied", "gps_latitude": 0, "gps_longitude": 0})
		self.assertIsNone(telemetry_gps_variance(nowhere), "0,0 is not where the interview happened")
		homeless = self._respondent()
		self.assertIsNone(telemetry_gps_variance(frappe.get_doc({**near.as_dict(), "respondent": homeless.name})))

	def test_a_respondent_entered_on_the_desk_gets_its_status(self):
		self.assertEqual(self._respondent(**FIX).gps_status, "Captured")
		self.assertEqual(self._respondent().gps_status, "Not captured")

	def test_export_leaves_the_gps_columns_blank_without_a_fix(self):
		self._submit(**FIX)
		self._submit(gps_status="Denied")
		result = export_flattened_responses(template_name=self.template, format="json")
		h = result["headers"]
		rows = {row[h.index("GPS Status")]: row for row in result["rows"]}
		self.assertEqual(rows["Denied"][h.index("Latitude")], "", "not 0, which is a real place")
		self.assertEqual(rows["Denied"][h.index("GPS Accuracy")], "")
		self.assertEqual(rows["Captured"][h.index("Latitude")], 26.9124)

	def test_the_backfill_derives_old_rows_and_keeps_a_reported_reason(self):
		old_fix, old_empty, denied = self._submit(**FIX), self._submit(), self._submit(gps_status="Denied")
		for name in (old_fix.name, old_empty.name):
			frappe.db.set_value("OmniQuery Response", name, "gps_status", None, update_modified=False)
		backfill_gps_status.execute()
		status = lambda doc: frappe.db.get_value("OmniQuery Response", doc.name, "gps_status")  # noqa: E731
		self.assertEqual(status(old_fix), "Captured")
		self.assertEqual(status(old_empty), "Not captured")
		self.assertEqual(status(denied), "Denied", "running it again never wipes what a device reported")

	def _payload(self, **extra):
		return {"idempotency_key": f"{KEY_PREFIX}{uuid.uuid4().hex[:6]}", "survey_template": self.template, "template_version": 1,
			"items": [{"question_code": "q1", "value": "Jaipur"}], **extra}

	def _submit(self, **extra):
		result = batch_push(submissions=[self._payload(**extra)])["results"][0]
		self.assertEqual(result["status"], "SUCCESS", result)
		return frappe.get_doc("OmniQuery Response", result["doc_name"])

	def _respondent(self, **gps):
		return frappe.get_doc({"doctype": "OmniQuery Respondent", "respondent_uid": f"{UID_PREFIX}{uuid.uuid4().hex[:6]}",
			"primary_name": f"{PREFIX} Person", "respondent_type": "Individual", **gps}).insert(ignore_permissions=True)


def _cleanup():
	key = ["like", f"{KEY_PREFIX}%"]
	delete_test_docs([
		("OmniQuery Response", {"idempotency_key": key}),
		("OmniQuery Sync Audit Log", {"idempotency_key": key}),
		("OmniQuery Respondent", {"respondent_uid": ["like", f"{UID_PREFIX}%"]}),
		("OmniQuery Template", {"title": ["like", f"{PREFIX} %"]}),
		("OmniQuery Project", {"project_name": ["like", f"{PREFIX} %"]}),
	])
