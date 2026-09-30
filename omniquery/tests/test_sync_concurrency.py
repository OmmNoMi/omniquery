import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.api.sync import batch_push


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
				"status": "Published",
			})
			doc.insert(ignore_permissions=True)
			self.test_template_name = doc.name

	def tearDown(self):
		# Clean up any test responses
		responses = frappe.get_all(
			"OmniQuery Response",
			filters={"idempotency_key": ["like", "TEST-CONC-%"]},
			pluck="name"
		)
		for r in responses:
			frappe.delete_doc("OmniQuery Response", r, force=True)

		if frappe.db.exists("OmniQuery Template", self.test_template_name):
			frappe.delete_doc("OmniQuery Template", self.test_template_name, force=True)

	def test_duplicate_submission_is_skipped(self):
		idempotency_key = "TEST-CONC-001"
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

	def test_batch_push_multiple_submissions(self):
		submissions = [
			{
				"idempotency_key": f"TEST-CONC-BATCH-{i}",
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

		for i in range(3):
			key = f"TEST-CONC-BATCH-{i}"
			self.assertTrue(frappe.db.exists("OmniQuery Response", {"idempotency_key": key}))

	def test_batch_push_empty_payload(self):
		res = batch_push([])
		results = res.get("results", []) if isinstance(res, dict) else res
		self.assertEqual(results, [])
