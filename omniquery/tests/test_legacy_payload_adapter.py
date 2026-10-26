import json
import unittest
import uuid
import frappe
from omniquery.api.sync import batch_push


class TestLegacyPayloadAdapter(unittest.TestCase):
	def setUp(self):
		self.test_records = []
		self.test_template_name = "OQS-001-001-001"
		if not frappe.db.exists("OmniQuery Template", self.test_template_name):
			tmpl = frappe.get_doc({
				"doctype": "OmniQuery Template",
				"name": self.test_template_name,
				"title": "Legacy Test Template",
				"version": 1,
				"status": "Draft",
			}).insert(ignore_permissions=True)
			tmpl.submit()
			self.test_records.append(("OmniQuery Template", self.test_template_name))

	def tearDown(self):
		for dt, dn in reversed(self.test_records):
			try:
				if frappe.db.exists(dt, dn):
					doc = frappe.get_doc(dt, dn)
					if getattr(doc, "docstatus", 0) == 1:
						doc.cancel()
					frappe.delete_doc(dt, dn, force=True, ignore_permissions=True)
			except Exception:
				pass
		frappe.db.commit()

	def test_legacy_shaped_payload_is_mapped_and_stored(self):
		"""
		Server Invariant: A legacy-shaped WAL payload {template_name, responses, gps_coordinates, saved_at}
		is transparently adapted, normalized, and stored as an OmniQuery Response.
		"""
		test_key = f"TEST-LEGACY-{uuid.uuid4().hex[:6]}"
		payload = {
			"idempotency_key": test_key,
			"template_name": self.test_template_name,
			"responses": {
				"block": "Sujangarh",
				"district": "Churu",
			},
			"gps_coordinates": {"latitude": 27.8124, "longitude": 74.4573, "accuracy": 12.5},
			"saved_at": "2026-09-29T13:40:40.634Z",
		}

		res = batch_push(submissions=[payload])
		self.assertEqual(len(res.get("results", [])), 1)
		result = res["results"][0]
		self.assertEqual(result.get("status"), "SUCCESS")

		doc_name = result.get("doc_name")
		self.assertTrue(doc_name)
		self.test_records.append(("OmniQuery Response", doc_name))
		self.test_records.append(("OmniQuery Sync Audit Log", f"SYNC-{test_key}"))

		doc = frappe.get_doc("OmniQuery Response", doc_name)
		self.assertEqual(doc.survey_template, self.test_template_name)
		self.assertAlmostEqual(float(doc.gps_latitude), 27.8124, places=4)
		self.assertAlmostEqual(float(doc.gps_longitude), 74.4573, places=4)
		self.assertAlmostEqual(float(doc.gps_accuracy), 12.5, places=1)
		self.assertEqual(len(doc.items), 2)
		items_dict = {item.question_code: item.value_text for item in doc.items}
		self.assertEqual(items_dict.get("block"), "Sujangarh")
		self.assertEqual(items_dict.get("district"), "Churu")

	def test_unknown_shape_returns_terminal_invalid_shape_and_dedups_errors(self):
		"""
		Server Invariant: An unrecognizable payload shape returns terminal INVALID_SHAPE once,
		and repeated sync retries with the same idempotency key do not add duplicate Field Error Log rows.
		"""
		bad_key = f"TEST-UNKNOWN-{uuid.uuid4().hex[:6]}"
		bad_payload = {
			"idempotency_key": bad_key,
			"unexpected_field": "unparseable payload without template",
		}

		# First push
		res1 = batch_push(submissions=[bad_payload])
		self.assertEqual(len(res1.get("results", [])), 1)
		self.assertEqual(res1["results"][0].get("status"), "INVALID_SHAPE")
		self.test_records.append(("OmniQuery Sync Audit Log", f"SYNC-{bad_key}"))

		err_count1 = frappe.db.count("OmniQuery Field Error Log", {"question_code": bad_key})
		self.assertEqual(err_count1, 1)

		# Second push (client retry)
		res2 = batch_push(submissions=[bad_payload])
		self.assertEqual(len(res2.get("results", [])), 1)
		self.assertEqual(res2["results"][0].get("status"), "INVALID_SHAPE")

		err_count2 = frappe.db.count("OmniQuery Field Error Log", {"question_code": bad_key})
		self.assertEqual(err_count2, 1, "Retry must dedup and not add a second Field Error Log row")

		# Clean up error log record
		for err_name in frappe.get_all("OmniQuery Field Error Log", filters={"question_code": bad_key}, pluck="name"):
			frappe.delete_doc("OmniQuery Field Error Log", err_name, force=True, ignore_permissions=True)

	def test_replay_failed_sync_audit_log(self):
		"""
		Desk Action Invariant: Replaying a FAILED Sync Audit Log parses raw_payload,
		processes the submission, links the created response, and marks sync_status as SUCCESS.
		"""
		test_key = f"TEST-REPLAY-{uuid.uuid4().hex[:6]}"
		raw_data = {
			"idempotency_key": test_key,
			"template_name": self.test_template_name,
			"responses": {"q1": "val1"},
			"saved_at": "2026-09-29T14:00:00.000Z",
		}

		audit = frappe.new_doc("OmniQuery Sync Audit Log")
		audit.idempotency_key = test_key
		audit.sync_status = "FAILED"
		audit.error_message = "MandatoryError: survey_template"
		audit.raw_payload = json.dumps(raw_data)
		audit.insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Sync Audit Log", audit.name))

		res = audit.replay()
		self.assertEqual(res.get("status"), "SUCCESS")

		audit.reload()
		self.assertEqual(audit.sync_status, "SUCCESS")
		self.assertTrue(audit.survey_response)
		self.test_records.append(("OmniQuery Response", audit.survey_response))
