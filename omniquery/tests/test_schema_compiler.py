import json
import unittest

import frappe


class TestSchemaCompiler(unittest.TestCase):
	def setUp(self):
		frappe.db.delete("OmniQuery Template", {"title": "Test Women Dairy Assessment 2026"})
		frappe.db.delete("OmniQuery Project", {"project_name": "Test Dairy Initiative"})

		frappe.get_doc(
			{
				"doctype": "OmniQuery Project",
				"project_name": "Test Dairy Initiative",
				"grantor_organization": "State Livestock Board",
				"status": "Active",
			}
		).insert(ignore_permissions=True)

	def test_template_auto_compilation_and_hashing(self):
		template = frappe.get_doc(
			{
				"doctype": "OmniQuery Template",
				"title": "Test Women Dairy Assessment 2026",
				"project": "PROJ-Test Dairy Initiative",
				"version": 1,
				"status": "Published",
				"sections": [
					{
						"section_code": "SEC_GENERAL",
						"section_title": "General Household Details",
						"display_order": 1,
					},
					{
						"section_code": "SEC_REVENUE",
						"section_title": "Enterprise Revenue & Dairy Output",
						"display_order": 2,
					},
				],
				"questions": [
					{
						"section_code": "SEC_GENERAL",
						"question_code": "Q_HERD_COUNT",
						"label_en": "Total number of milch cattle?",
						"field_type": "Integer",
						"is_mandatory": 1,
						"validation_rules_json": json.dumps({"min": 1, "max": 100}),
					},
					{
						"section_code": "SEC_REVENUE",
						"question_code": "Q_DAILY_MILK_LITERS",
						"label_en": "Average daily milk output (Liters)?",
						"field_type": "Decimal",
						"is_mandatory": 1,
						"conditional_logic_json": json.dumps(
							{"depends_on": "Q_HERD_COUNT", "operator": ">", "value": 0}
						),
					},
				],
			}
		)
		template.insert(ignore_permissions=True)

		self.assertTrue(template.compiled_schema_json)
		self.assertTrue(template.schema_hash_sha256)

		schema_obj = json.loads(template.compiled_schema_json)
		self.assertEqual(len(schema_obj["sections"]), 2)
		self.assertEqual(len(schema_obj["questions"]), 2)
		self.assertEqual(schema_obj["questions"][0]["question_code"], "Q_HERD_COUNT")
		self.assertEqual(schema_obj["questions"][1]["conditional_logic"]["depends_on"], "Q_HERD_COUNT")

	def test_linked_question_enrichment(self):
		question_master = self._create_test_rating_question()
		template = self._create_test_template_with_question(question_master.name)
		schema_obj = json.loads(template.compiled_schema_json)
		compiled_q = schema_obj["questions"][0]
		self.assertEqual(compiled_q["control_variant"], "Rating")
		self.assertEqual(compiled_q["rating_icon"], "Star")
		self.assertEqual(compiled_q["rating_max"], 5)

	def _create_test_rating_question(self):
		return frappe.get_doc({
			"doctype": "OmniQuery Question",
			"scope": "Platform",
			"label_en": "Satisfaction Rating",
			"field_category": "Choice (Single)",
			"control_variant": "Rating",
			"rating_icon": "Star",
			"rating_max": 5,
			"rating_step": 1.0,
			"status": "Active",
		}).insert(ignore_permissions=True)

	def _create_test_template_with_question(self, question_name):
		return frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Test Women Dairy Assessment 2026",
			"project": "PROJ-Test Dairy Initiative",
			"version": 1,
			"status": "Draft",
			"sections": [{"section_code": "SEC_1", "section_title": "Section 1"}],
			"questions": [{"section_code": "SEC_1", "question_code": "Q_SATISFACTION", "question": question_name, "is_mandatory": 0}],
		}).insert(ignore_permissions=True)

	def tearDown(self):
		frappe.db.delete("OmniQuery Question", {"label_en": "Satisfaction Rating"})
		frappe.db.delete("OmniQuery Template", {"title": "Test Women Dairy Assessment 2026"})
		frappe.db.delete("OmniQuery Project", {"project_name": "Test Dairy Initiative"})
		frappe.db.commit()
