import frappe, unittest, json

class TestSchemaCompiler(unittest.TestCase):
	def setUp(self):
		frappe.db.delete("OmniServey Template", {"title": "Test Women Dairy Assessment 2026"})
		frappe.db.delete("OmniServey Project", {"project_name": "Test Dairy Initiative"})
		
		proj = frappe.get_doc({
			"doctype": "OmniServey Project",
			"project_name": "Test Dairy Initiative",
			"grantor_organization": "State Livestock Board",
			"status": "Active"
		}).insert(ignore_permissions=True)
		
	def test_template_auto_compilation_and_hashing(self):
		template = frappe.get_doc({
			"doctype": "OmniServey Template",
			"title": "Test Women Dairy Assessment 2026",
			"project": "PROJ-Test Dairy Initiative",
			"version": 1,
			"status": "Published",
			"sections": [
				{
					"section_code": "SEC_GENERAL",
					"section_title": "General Household Details",
					"display_order": 1
				},
				{
					"section_code": "SEC_REVENUE",
					"section_title": "Enterprise Revenue & Dairy Output",
					"display_order": 2
				}
			],
			"questions": [
				{
					"section_code": "SEC_GENERAL",
					"question_code": "Q_HERD_COUNT",
					"label_en": "Total number of milch cattle?",
					"field_type": "Integer",
					"is_mandatory": 1,
					"validation_rules_json": json.dumps({"min": 1, "max": 100})
				},
				{
					"section_code": "SEC_REVENUE",
					"question_code": "Q_DAILY_MILK_LITERS",
					"label_en": "Average daily milk output (Liters)?",
					"field_type": "Decimal",
					"is_mandatory": 1,
					"conditional_logic_json": json.dumps({"depends_on": "Q_HERD_COUNT", "operator": ">", "value": 0})
				}
			]
		})
		template.insert(ignore_permissions=True)
		
		self.assertTrue(template.compiled_schema_json)
		self.assertTrue(template.schema_hash_sha256)
		
		schema_obj = json.loads(template.compiled_schema_json)
		self.assertEqual(len(schema_obj["sections"]), 2)
		self.assertEqual(len(schema_obj["questions"]), 2)
		self.assertEqual(schema_obj["questions"][0]["question_code"], "Q_HERD_COUNT")
		self.assertEqual(schema_obj["questions"][1]["conditional_logic"]["depends_on"], "Q_HERD_COUNT")
