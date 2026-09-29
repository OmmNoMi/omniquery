import json
import time
import unittest
import uuid

import frappe
from frappe.utils.fixtures import sync_fixtures

from omniquery.api.survey import get_bootstrap_data, get_schema, list_active_templates
from omniquery.api.sync import batch_push

RAJIVIKA_TEMPLATE = "OQS-001-001-001"
RAJIVIKA_PROJECT = "OQP-001-001"


class TestRajivikaBenchmark(unittest.TestCase):
	@classmethod
	def setUpClass(cls):
		sync_fixtures("omniquery")
		if not frappe.db.exists("OmniQuery Surveyor", "SURV-Administrator"):
			frappe.get_doc(
				{
					"doctype": "OmniQuery Surveyor",
					"surveyor_name": "Administrator",
					"user": "Administrator",
					"status": "Active",
				}
			).insert(ignore_permissions=True)
			frappe.db.commit()

	def test_01_fixture_presence_and_metadata(self):
		project = frappe.get_doc("OmniQuery Project", RAJIVIKA_PROJECT)
		self.assertEqual(project.status, "Active")
		self.assertIn("RGAVP", project.grantor_organization)

		tmpl = frappe.get_doc("OmniQuery Template", RAJIVIKA_TEMPLATE)
		self.assertEqual(tmpl.status, "Published")
		self.assertEqual(tmpl.project, RAJIVIKA_PROJECT)
		self.assertEqual(len(tmpl.sections), 9)
		self.assertEqual(len(tmpl.questions), 101)

	def test_02_section_hierarchy_and_codes(self):
		tmpl = frappe.get_doc("OmniQuery Template", RAJIVIKA_TEMPLATE)
		expected_codes = [f"SEC_{letter}" for letter in "ABCDEFGHI"]
		actual_codes = [s.section_code for s in tmpl.sections]
		self.assertEqual(actual_codes, expected_codes)

		for idx, section in enumerate(tmpl.sections, 1):
			self.assertEqual(section.display_order, idx)
			self.assertTrue(section.section_title)

	def test_03_question_controls_and_validation(self):
		tmpl = frappe.get_doc("OmniQuery Template", RAJIVIKA_TEMPLATE)
		q_map = {q.question_code: q for q in tmpl.questions}

		self.assertEqual(q_map["years_of_shg_membership"].field_type, "Range (Slider)")
		self.assertEqual(q_map["business_type"].field_type, "Multiple Choice (Checkbox)")
		self.assertEqual(q_map["activity_involvements"].field_type, "Dynamic Grid")
		self.assertEqual(q_map["seasonal_turnovers"].field_type, "Dynamic Grid")
		self.assertEqual(q_map["loan_usages"].field_type, "Dynamic Grid")

	def test_04_schema_compilation_benchmark(self):
		tmpl = frappe.get_doc("OmniQuery Template", RAJIVIKA_TEMPLATE)
		start_time = time.perf_counter()
		tmpl.before_save()
		elapsed_ms = (time.perf_counter() - start_time) * 1000

		self.assertLess(elapsed_ms, 50.0, f"Compilation took {elapsed_ms:.2f}ms (>50ms limit)")
		self.assertEqual(len(tmpl.schema_hash_sha256), 64)
		schema_obj = json.loads(tmpl.compiled_schema_json)
		self.assertEqual(len(schema_obj["questions"]), 101)

	def test_05_api_endpoints_benchmark(self):
		frappe.set_user("Administrator")
		start_time = time.perf_counter()
		schema_resp = get_schema(RAJIVIKA_TEMPLATE)
		elapsed_ms = (time.perf_counter() - start_time) * 1000

		self.assertLess(elapsed_ms, 100.0, f"get_schema took {elapsed_ms:.2f}ms (>100ms limit)")
		self.assertEqual(schema_resp["template_name"], RAJIVIKA_TEMPLATE)
		self.assertEqual(len(schema_resp["schema"]["questions"]), 101)

		bootstrap = get_bootstrap_data()
		tmpl_names = [t["name"] for t in bootstrap.get("templates", [])]
		self.assertIn(RAJIVIKA_TEMPLATE, tmpl_names)

	def test_06_e2e_idempotent_sync_benchmark(self):
		test_uuid = str(uuid.uuid4())
		payload = self._build_survey_submission_payload(test_uuid)

		start_time = time.perf_counter()
		resp1 = batch_push(submissions=[payload])
		elapsed_ms = (time.perf_counter() - start_time) * 1000

		self.assertLess(elapsed_ms, 600.0, f"Sync took {elapsed_ms:.2f}ms (>600ms limit)")
		self.assertEqual(resp1["results"][0]["status"], "SUCCESS")
		self._verify_and_cleanup_submission(test_uuid, resp1["results"][0]["doc_name"], payload)

	def _build_survey_submission_payload(self, test_uuid):
		return {
			"idempotency_key": test_uuid,
			"survey_template": RAJIVIKA_TEMPLATE,
			"template_version": 2,
			"surveyor": "SURV-Administrator",
			"gps_latitude": 25.1324,
			"gps_longitude": 76.5132,
			"gps_accuracy": 3.2,
			"items": [
				{"question_code": "district", "question_label": "Q1. District", "value": "Baran"},
				{"question_code": "block", "question_label": "Q2. Block", "value": "Chhipabarod"},
				{
					"question_code": "respondent_name",
					"question_label": "Q4. Respondent Name",
					"value": "Benchmark Tester",
				},
				{"question_code": "years_of_shg_membership", "question_label": "Q9. Years", "value": 4},
				{
					"question_code": "business_type",
					"question_label": "Q16. Type",
					"value": ["Trading", "Servicing"],
				},
			],
		}

	def _verify_and_cleanup_submission(self, test_uuid, doc_name, payload):
		try:
			self.assertTrue(frappe.db.exists("OmniQuery Response", doc_name))
			resp2 = batch_push(submissions=[payload])
			self.assertEqual(resp2["results"][0]["status"], "DUPLICATE_SKIPPED")
			self.assertEqual(frappe.db.count("OmniQuery Response", {"idempotency_key": test_uuid}), 1)
		finally:
			frappe.db.delete("OmniQuery Response Item", {"parent": doc_name})
			frappe.db.delete("OmniQuery Response", {"name": doc_name})
			frappe.db.delete("OmniQuery Sync Audit Log", {"name": f"SYNC-{test_uuid}"})
			frappe.db.commit()
