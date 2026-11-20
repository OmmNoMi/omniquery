import unittest.mock
import uuid
import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.api.sync import batch_push
from omniquery.tests.utils import delete_test_docs, sync_records_of


class TestSyncConcurrency(FrappeTestCase):
	def setUp(self):
		self.project_name = "PROJ-Test Sync Concurrency"
		if not frappe.db.exists("OmniQuery Project", self.project_name):
			frappe.get_doc({
				"doctype": "OmniQuery Project",
				"project_name": "Test Sync Concurrency",
				"grantor_organization": "State Livelihoods Mission",
				"status": "Active",
			}).insert(ignore_permissions=True)

		self.test_template_name = "TEST-TMPL-SYNC-CONC"
		if not frappe.db.exists("OmniQuery Template", self.test_template_name):
			doc = frappe.get_doc({
				"doctype": "OmniQuery Template",
				"title": "Sync Concurrency Test",
				"project": self.project_name,
				"status": "Draft",
			})
			doc.insert(ignore_permissions=True)
			doc.submit()
			self.test_template_name = doc.name

	def tearDown(self):
		frappe.set_user("Administrator")
		delete_test_docs([
			*sync_records_of(self.test_template_name),
			("OmniQuery Response", {"name": "TEMP_SP_003"}),
			("OmniQuery Template", {"name": self.test_template_name}),
		])
		# batch_push commits, so the test rollback would bring back a delete left uncommitted here
		frappe.db.commit()

	def test_duplicate_submission_is_skipped(self):
		idempotency_key = str(uuid.uuid4())
		sub = {
			"idempotency_key": idempotency_key,
			"survey_template": self.test_template_name,
			"template_version": 1,
			"items": [
				{"question_code": "q1", "value": "Initial Value"}
			],
		}

		# First submission
		res1 = batch_push([sub])
		items1 = res1.get("results", []) if isinstance(res1, dict) else res1
		self.assertEqual(len(items1), 1)
		self.assertEqual(items1[0]["status"], "SUCCESS")

		# Second identical submission
		res2 = batch_push([sub])
		items2 = res2.get("results", []) if isinstance(res2, dict) else res2
		self.assertEqual(len(items2), 1)
		self.assertEqual(items2[0]["status"], "DUPLICATE_SKIPPED")

		# Confirm only 1 response exists in database
		count = frappe.db.count("OmniQuery Response", {"idempotency_key": idempotency_key})
		self.assertEqual(count, 1)

	def test_concurrent_duplicate_burst(self):
		idempotency_key = str(uuid.uuid4())
		sub = {
			"idempotency_key": idempotency_key,
			"survey_template": self.test_template_name,
			"template_version": 1,
			"items": [
				{"question_code": "q1", "value": "Burst Invariant"}
			],
		}

		# Simulate 10 rapid repeated pushes with identical token
		results = []
		for _ in range(10):
			res = batch_push([sub])
			items = res.get("results", []) if isinstance(res, dict) else res
			results.append(items[0]["status"])

		# Invariant: exactly 1 SUCCESS, all subsequent 9 DUPLICATE_SKIPPED
		self.assertEqual(results[0], "SUCCESS")
		self.assertEqual(results[1:], ["DUPLICATE_SKIPPED"] * 9)

		# Database count invariant: exactly 1 response record exists
		count = frappe.db.count("OmniQuery Response", {"idempotency_key": idempotency_key})
		self.assertEqual(count, 1)

		# Clean up test artifact
		delete_test_docs([("OmniQuery Response", {"idempotency_key": idempotency_key}),
			("OmniQuery Sync Audit Log", {"idempotency_key": idempotency_key})])
		frappe.db.commit()

	def test_batch_push_multiple_submissions(self):
		keys = [str(uuid.uuid4()) for _ in range(3)]
		submissions = [
			{
				"idempotency_key": keys[i],
				"survey_template": self.test_template_name,
				"template_version": 1,
				"items": [{"question_code": "score", "value": i * 10}],
			}
			for i in range(3)
		]

		res = batch_push(submissions)
		results = res.get("results", []) if isinstance(res, dict) else res
		self.assertEqual(len(results), 3)
		for r in results:
			self.assertEqual(r["status"], "SUCCESS")

		for key in keys:
			self.assertTrue(frappe.db.exists("OmniQuery Response", {"idempotency_key": key}))

	def test_batch_push_empty_payload(self):
		res = batch_push([])
		results = res.get("results", []) if isinstance(res, dict) else res
		self.assertEqual(results, [])

	def test_raw_payload_and_iso_datetime(self):
		import os
		idempotency_key = str(uuid.uuid4())
		iso_time = "2026-09-30T10:22:52.738Z"
		sub = {
			"idempotency_key": idempotency_key,
			"survey_template": self.test_template_name,
			"template_version": 1,
			"captured_at_local": iso_time,
			"items": [
				{"question_code": "q_iso", "value": "Valid ISO Datetime Response"}
			],
		}

		res = batch_push([sub])
		results = res.get("results", []) if isinstance(res, dict) else res
		self.assertEqual(len(results), 1)
		self.assertEqual(results[0]["status"], "SUCCESS")

		# 1. Verify OmniQuery Response saved captured_at_local cleanly without MariaDB 1292 error
		resp_doc = frappe.get_doc("OmniQuery Response", results[0]["doc_name"])
		self.assertIsNotNone(resp_doc.captured_at_local)

		# 2. Verify OmniQuery Sync Audit Log captured the raw_payload dump
		audit_name = frappe.db.get_value("OmniQuery Sync Audit Log", {"idempotency_key": idempotency_key}, "name")
		self.assertIsNotNone(audit_name)
		audit_doc = frappe.get_doc("OmniQuery Sync Audit Log", audit_name)
		self.assertEqual(audit_doc.sync_status, "SUCCESS")
		self.assertIn("Valid ISO Datetime Response", audit_doc.raw_payload)

		# 3. Verify server-side dump file exists on disk
		dump_file = os.path.join(frappe.get_site_path("logs"), "omniquery_payloads_dump.jsonl")
		self.assertTrue(os.path.exists(dump_file))

	def test_phone_validation_rejects_non_numeric(self):
		idempotency_key = "TEST-CONC-PHONE-FAIL-001"
		sub = {
			"idempotency_key": idempotency_key,
			"survey_template": self.test_template_name,
			"template_version": 1,
			"items": [
				{"question_code": "q_phone_number", "field_type": "Phone", "value": "12abc"}
			],
		}
		res = batch_push([sub])
		results = res.get("results", []) if isinstance(res, dict) else res
		self.assertEqual(len(results), 1)
		self.assertEqual(results[0]["status"], "FAILED")
		self.assertFalse(frappe.db.exists("OmniQuery Response", idempotency_key))

	def test_guest_batch_push_rejected(self):
		orig_user = frappe.session.user
		try:
			frappe.set_user("Guest")
			subs = [
				{"idempotency_key": str(uuid.uuid4()), "survey_template": self.test_template_name, "items": []},
				{"idempotency_key": str(uuid.uuid4()), "survey_template": self.test_template_name, "items": []},
			]
			res = batch_push(subs)
			results = res.get("results", []) if isinstance(res, dict) else res
			self.assertEqual(len(results), 2)
			self.assertEqual(results[0]["status"], "REJECTED")
			self.assertIn("Batch push not permitted", results[0]["error"])
		finally:
			frappe.set_user(orig_user)

	def test_guest_private_template_rejected(self):
		orig_user = frappe.session.user
		try:
			frappe.set_user("Guest")
			# test_template_name is not public
			sub = {
				"idempotency_key": str(uuid.uuid4()),
				"survey_template": self.test_template_name,
				"items": [{"question_code": "q1", "value": "test"}],
			}
			res = batch_push([sub])
			results = res.get("results", []) if isinstance(res, dict) else res
			self.assertEqual(len(results), 1)
			self.assertEqual(results[0]["status"], "REJECTED")
			self.assertIn("Guest access not permitted", results[0]["error"])
		finally:
			frappe.set_user(orig_user)

	def test_xss_payload_is_stripped(self):
		idempotency_key = str(uuid.uuid4())
		xss_val = "<script>alert('pwned')</script>Harmless Text"
		sub = {
			"idempotency_key": idempotency_key,
			"survey_template": self.test_template_name,
			"template_version": 1,
			"items": [{"question_code": "q_xss", "value": xss_val}],
		}
		res = batch_push([sub])
		results = res.get("results", []) if isinstance(res, dict) else res
		self.assertEqual(results[0]["status"], "SUCCESS")

		resp_doc = frappe.get_doc("OmniQuery Response", results[0]["doc_name"])
		saved_item = next(it for it in resp_doc.items if it.question_code == "q_xss")
		self.assertNotIn("<script>", saved_item.value_text)
		self.assertIn("Harmless Text", saved_item.value_text)

	def test_batch_push_savepoint_partial_failure_isolation(self):
		sp_keys = [str(uuid.uuid4()) for _ in range(5)]
		batch = [
			{
				"idempotency_key": sp_keys[i],
				"survey_template": self.test_template_name,
				"template_version": 1,
				"items": [{"question_code": "q1", "value": f"Response {i + 1}"}],
			}
			for i in range(5)
		]

		failed_key = sp_keys[2]
		orig_insert = frappe.model.document.Document.insert

		def flaky_insert(doc, *args, **kwargs):
			if doc.doctype == "OmniQuery Response" and getattr(doc, "idempotency_key", "") == failed_key:
				frappe.db.sql(
					"INSERT INTO `tabOmniQuery Response` (name, idempotency_key, survey_template, creation, modified, modified_by, owner) VALUES ('TEMP_SP_003', 'TEMP_SP_003', 'TEST', NOW(), NOW(), 'Administrator', 'Administrator')"
				)
				raise frappe.ValidationError("Simulated unexpected MariaDB write fault on record #3")
			return orig_insert(doc, *args, **kwargs)

		with unittest.mock.patch("frappe.model.document.Document.insert", side_effect=flaky_insert, autospec=True):
			res = batch_push(batch)

		results = res.get("results", []) if isinstance(res, dict) else res
		self.assertEqual(len(results), 5)

		# Submissions 0, 1, 3, 4 must succeed
		self.assertEqual(results[0]["status"], "SUCCESS")
		self.assertEqual(results[1]["status"], "SUCCESS")
		self.assertEqual(results[3]["status"], "SUCCESS")
		self.assertEqual(results[4]["status"], "SUCCESS")

		# Submission 2 must be isolated and marked FAILED
		self.assertEqual(results[2]["status"], "FAILED")
		self.assertIn("Simulated unexpected MariaDB write fault", results[2]["error"])

		# Database state verification:
		# 1. Successful documents exist in MariaDB
		for i in [0, 1, 3, 4]:
			self.assertTrue(frappe.db.exists("OmniQuery Response", sp_keys[i]))

		# 2. Failed document and uncommitted changes within savepoint are rolled back
		self.assertFalse(frappe.db.exists("OmniQuery Response", failed_key))
		self.assertFalse(frappe.db.exists("OmniQuery Response", "TEMP_SP_003"))

		# 3. Field error log created for administrative inspection
		field_err = frappe.db.get_value(
			"OmniQuery Field Error Log",
			{"question_code": failed_key},
			["name", "error_message"],
			as_dict=True,
		)
		self.assertIsNotNone(field_err)
		self.assertIn("Simulated unexpected MariaDB write fault", field_err.error_message)

		# 4. Sync Audit Log statuses are accurate
		for i in [0, 1, 3, 4]:
			status = frappe.db.get_value(
				"OmniQuery Sync Audit Log",
				{"idempotency_key": sp_keys[i]},
				"sync_status",
			)
			self.assertEqual(status, "SUCCESS")

		failed_audit_status = frappe.db.get_value(
			"OmniQuery Sync Audit Log",
			{"idempotency_key": failed_key},
			"sync_status",
		)
		self.assertEqual(failed_audit_status, "FAILED")

	def test_non_uuid_idempotency_key_is_rejected(self):
		invalid_key = "NOT-A-UUID-12345"
		payload = {
			"idempotency_key": invalid_key,
			"survey_template": self.test_template_name,
			"template_version": 1,
			"items": [{"question_code": "q1", "value": "Test Value"}],
		}
		res = batch_push([payload])
		results = res.get("results", []) if isinstance(res, dict) else res
		self.assertEqual(len(results), 1)
		self.assertEqual(results[0]["status"], "REJECTED")
		self.assertIn("UUID", results[0]["error"])

	def test_synced_final_response_has_docstatus_1_and_locked(self):
		idempotency_key = str(uuid.uuid4())
		sub = {
			"idempotency_key": idempotency_key,
			"survey_template": self.test_template_name,
			"template_version": 1,
			"items": [],
		}
		res = batch_push([sub])
		results = res.get("results", []) if isinstance(res, dict) else res
		self.assertEqual(results[0]["status"], "SUCCESS")

		doc_name = results[0]["doc_name"]
		resp_doc = frappe.get_doc("OmniQuery Response", doc_name)
		self.assertEqual(resp_doc.docstatus, 1)

		resp_doc.template_version = 99
		with self.assertRaises(frappe.UpdateAfterSubmitError):
			resp_doc.save()

	def test_template_with_status_published_requires_docstatus_1(self):
		tmpl = frappe.new_doc("OmniQuery Template")
		tmpl.title = "Test Published Docstatus Requirement"
		tmpl.project = self.project_name
		tmpl.status = "Published"
		# the message, not just the class: a MandatoryError is a ValidationError too
		with self.assertRaisesRegex(frappe.ValidationError, "must have docstatus 1"):
			tmpl.insert(ignore_permissions=True)

	def test_parse_local_datetime_converts_offsets_to_the_site_timezone(self):
		from omniquery.api.sync import parse_local_datetime

		cases = [
			("Asia/Kolkata", "2026-10-09T06:30:00Z", "2026-10-09 12:00:00"),
			("Asia/Kolkata", "2026-10-09T06:30:00.123Z", "2026-10-09 12:00:00"),
			("America/New_York", "2026-10-09T06:30:00Z", "2026-10-09 02:30:00"),
			("UTC", "2026-10-09T12:00:00+05:30", "2026-10-09 06:30:00"),
			# No offset means the device already sent local time: keep it as is.
			("America/New_York", "2026-10-09 06:30:00", "2026-10-09 06:30:00"),
		]
		for tz, raw, expected in cases:
			with self.subTest(tz=tz, raw=raw), unittest.mock.patch(
				"frappe.utils.data.get_system_timezone", return_value=tz
			):
				self.assertEqual(parse_local_datetime(raw), expected)

	def test_parse_local_datetime_missing_means_now_and_unreadable_means_none(self):
		from frappe.utils import get_datetime
		from omniquery.api.sync import parse_local_datetime

		for missing in (None, "", "   "):
			with self.subTest(missing=missing):
				result = parse_local_datetime(missing)
				self.assertIsNotNone(result)
				self.assertIsNotNone(get_datetime(result))

		for unreadable in ("garbage", "2026-13-45T99:00:00Z", 12345):
			with self.subTest(unreadable=unreadable):
				self.assertIsNone(parse_local_datetime(unreadable))

	def _bad_timestamp_error_logs(self, key):
		return frappe.get_all(
			"Error Log",
			filters={"reference_doctype": "OmniQuery Response", "reference_name": key},
			pluck="name",
		)

	def test_batch_push_keeps_answers_when_captured_at_is_unreadable(self):
		key = str(uuid.uuid4())
		self.addCleanup(lambda: frappe.db.delete("Error Log", {"reference_name": key}))
		sub = {
			"idempotency_key": key,
			"survey_template": self.test_template_name,
			"template_version": 1,
			"captured_at_local": "garbage",
			"items": [{"question_code": "q1", "value": "kept"}],
		}

		res = batch_push([sub])
		items = res.get("results", []) if isinstance(res, dict) else res
		self.assertEqual(items[0]["status"], "SUCCESS")

		doc = frappe.get_doc("OmniQuery Response", key)
		self.assertIsNone(doc.captured_at_local)
		self.assertEqual([i.value_text for i in doc.items], ["kept"])
		self.assertEqual(len(self._bad_timestamp_error_logs(key)), 1)

	def test_sync_draft_saves_when_captured_at_is_unreadable(self):
		from omniquery.api.sync import sync_draft

		key = str(uuid.uuid4())
		res = sync_draft(
			{
				"idempotency_key": key,
				"survey_template": self.test_template_name,
				"template_version": 1,
				"captured_at_local": "garbage",
				"items": [{"question_code": "q1", "value": "draft"}],
			}
		)

		self.assertEqual(res["status"], "SUCCESS")
		doc = frappe.get_doc("OmniQuery Response", key)
		self.assertIsNone(doc.captured_at_local)
		self.assertEqual([i.value_text for i in doc.items], ["draft"])

	def test_a_retry_cannot_reopen_a_reviewed_response(self):
		# every status but Draft is final, including any added later, so a retried payload is skipped
		sub = {"idempotency_key": str(uuid.uuid4()), "survey_template": self.test_template_name, "items": []}
		name = batch_push([sub])["results"][0]["doc_name"]
		for status in frappe.get_meta("OmniQuery Response").get_options("survey_status").split("\n")[1:]:
			frappe.db.set_value("OmniQuery Response", name, "survey_status", status)
			self.assertEqual(batch_push([sub])["results"][0]["status"], "DUPLICATE_SKIPPED", status)
			self.assertEqual(frappe.db.get_value("OmniQuery Response", name, "survey_status"), status)

	def test_patch_submits_only_final_legacy_documents(self):
		from omniquery.patches.v1_0.submit_final_documents import execute

		names = {status: self.legacy_response(status) for status in ("Approved", "Draft")}
		frappe.db.set_value("OmniQuery Template", self.test_template_name, "docstatus", 0)  # Published, as before #28
		execute()
		self.assertEqual(frappe.db.get_value("OmniQuery Template", self.test_template_name, "docstatus"), 1)
		self.assertEqual(frappe.db.get_value("OmniQuery Response", names["Approved"], "docstatus"), 1)
		self.assertEqual(frappe.db.get_value("OmniQuery Response", names["Draft"], "docstatus"), 0)

	def legacy_response(self, status):
		"""A response as sync stored it before #28: docstatus 0 whatever its status."""
		sub = {"idempotency_key": str(uuid.uuid4()), "survey_template": self.test_template_name, "items": []}
		name = batch_push([sub])["results"][0]["doc_name"]
		frappe.db.set_value("OmniQuery Response", name, {"docstatus": 0, "survey_status": status})
		return name
