import unittest
import frappe
from omniquery.api.survey import get_project_details


class TestProjectAPI(unittest.TestCase):
	def setUp(self):
		frappe.db.delete("OmniQuery Template", {"title": "Sample Test Survey Unit"})
		frappe.db.delete("OmniQuery Project", {"project_name": "Sample Enterprise Project"})

		frappe.get_doc(
			{
				"doctype": "OmniQuery Project",
				"project_name": "Sample Enterprise Project",
				"grantor_organization": "State Mission Agency",
				"description": "Comprehensive socio-economic study on micro-enterprises.",
				"status": "Active",
				"helpline_phone": "+91 1800 000 111",
				"helpline_email": "support@sampleagency.org",
				"sop_sections": "<p>Standard Operating Procedures content.</p>",
			}
		).insert(ignore_permissions=True)

	def test_get_project_details_returns_metadata_and_training(self):
		proj_name = frappe.db.get_value("OmniQuery Project", {"project_name": "Sample Enterprise Project"}, "name")
		self.assertTrue(proj_name)

		# Create a template associated with this project
		template = frappe.get_doc(
			{
				"doctype": "OmniQuery Template",
				"title": "Sample Test Survey Unit",
				"project": proj_name,
				"version": 1,
				"status": "Published",
				"sections": [{"section_code": "SEC_1", "section_title": "Basic Section"}],
				"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Question 1"}],
			}
		).insert(ignore_permissions=True)

		details = get_project_details(proj_name)
		self.assertIn("project", details)
		self.assertEqual(details["project"]["project_name"], "Sample Enterprise Project")
		self.assertEqual(details["project"]["grantor_organization"], "State Mission Agency")
		self.assertEqual(details["project"]["helpline_phone"], "+91 1800 000 111")
		self.assertIn("training_modules", details)
		self.assertTrue(len(details["training_modules"]) >= 1)
		self.assertIn("helpline", details)
		self.assertEqual(details["helpline"]["phone"], "+91 1800 000 111")

	def test_get_project_details_fallback(self):
		details = get_project_details("NON_EXISTENT_PROJECT_XYZ")
		self.assertIn("project", details)
		self.assertEqual(details["project"]["name"], "NON_EXISTENT_PROJECT_XYZ")
		self.assertIsNone(details["project"]["grantor_organization"])
		self.assertEqual(details["helpline"], {})

	def tearDown(self):
		frappe.db.delete("OmniQuery Template", {"title": "Sample Test Survey Unit"})
		frappe.db.delete("OmniQuery Project", {"project_name": "Sample Enterprise Project"})
		frappe.db.commit()
