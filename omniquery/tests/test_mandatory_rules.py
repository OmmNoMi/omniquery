import json
import unittest

import frappe


class TestMandatoryRules(unittest.TestCase):
	def setUp(self):
		self._cleanup_test_records()
		self._create_prerequisites()

	def tearDown(self):
		self._cleanup_test_records()

	def _cleanup_test_records(self):
		for t in frappe.get_all(
			"OmniQuery Template", filters={"title": ["like", "Test Mandatory Survey%"]}, pluck="name"
		):
			doc = frappe.get_doc("OmniQuery Template", t)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("OmniQuery Template", t, force=True, ignore_permissions=True)
		for q in frappe.get_all(
			"OmniQuery Question", filters={"question_code": "t_mand_phone"}, pluck="name"
		):
			if frappe.db.get_value("OmniQuery Question", q, "docstatus") == 1:
				frappe.db.set_value("OmniQuery Question", q, "docstatus", 2)
			frappe.delete_doc("OmniQuery Question", q, force=True, ignore_permissions=True)
		if frappe.db.exists("OmniQuery Project", "PROJ-Mandatory Test Project"):
			frappe.delete_doc(
				"OmniQuery Project", "PROJ-Mandatory Test Project", force=True, ignore_permissions=True
			)
		frappe.db.commit()

	def _create_prerequisites(self):
		frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Mandatory Test Project",
			"grantor_organization": "Mandatory Board",
			"status": "Active",
		}).insert(ignore_permissions=True)
		q = frappe.get_doc({
			"doctype": "OmniQuery Question",
			"question_code": "t_mand_phone",
			"label_en": "Mobile Phone Number",
			"scope": "Platform",
			"field_category": "Text Input",
			"control_variant": "Text",
		}).insert(ignore_permissions=True)
		q.submit()

	def test_per_survey_version_mandatory_override(self):
		q_name = frappe.db.get_value("OmniQuery Question", {"question_code": "t_mand_phone"}, "name")
		v1 = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Test Mandatory Survey",
			"project": "PROJ-Mandatory Test Project",
			"version": 1,
			"sections": [
				{"section_code": "SEC_1", "section_title": "Contact Details", "display_order": 1}
			],
			"questions": [
				{
					"question": q_name,
					"section_code": "SEC_1",
					"question_code": "t_mand_phone",
					"is_mandatory": 1,
					"display_order": 1,
				}
			],
		}).insert(ignore_permissions=True)
		v1.submit()
		s1 = json.loads(v1.compiled_schema_json)
		self.assertTrue(s1["questions"][0]["is_mandatory"])

		v2 = frappe.copy_doc(v1)
		v2.docstatus = 0
		v2.amended_from = v1.name
		v2.questions[0].is_mandatory = 0
		v2.insert(ignore_permissions=True)
		v2.submit()
		s2 = json.loads(v2.compiled_schema_json)
		self.assertFalse(s2["questions"][0]["is_mandatory"])
