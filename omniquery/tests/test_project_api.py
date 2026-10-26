import unittest
import frappe
from omniquery.api.survey import get_project_details


class TestProjectAPI(unittest.TestCase):
	def setUp(self):
		self._cleanup_test_records()

		frappe.get_doc(
			{
				"doctype": "OmniQuery Project",
				"project_name": "Rajasthan Livelihood Project",
				"grantor_organization": "RGAVP / State Mission",
				"description": "Comprehensive socio-economic study on SHG micro-enterprises.",
				"status": "Active",
			}
		).insert(ignore_permissions=True)

	def test_get_project_details_returns_metadata_and_training(self):
		proj_name = frappe.db.get_value("OmniQuery Project", {"project_name": "Rajasthan Livelihood Project"}, "name")
		self.assertTrue(proj_name)

		# Create a template associated with this project
		template = frappe.get_doc(
			{
				"doctype": "OmniQuery Template",
				"title": "SHG Test Survey Unit",
				"project": proj_name,
				"version": 1,
				"status": "Published",
				"sections": [{"section_code": "SEC_1", "section_title": "Basic Section"}],
				"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Question 1"}],
			}
		).insert(ignore_permissions=True)

		details = get_project_details(proj_name)
		self.assertIn("project", details)
		self.assertEqual(details["project"]["project_name"], "Rajasthan Livelihood Project")
		self.assertEqual(details["project"]["grantor_organization"], "RGAVP / State Mission")
		self.assertIn("training_modules", details)
		self.assertTrue(len(details["training_modules"]) >= 1)
		self.assertIn("helpline", details)

	def test_get_project_details_fallback(self):
		details = get_project_details("NON_EXISTENT_PROJECT_XYZ")
		self.assertIn("project", details)
		self.assertEqual(details["project"]["name"], "NON_EXISTENT_PROJECT_XYZ")
		self.assertIn("training_modules", details)

	def tearDown(self):
		self._cleanup_test_records()

	def _cleanup_test_records(self):
		for dt, filter_dict in [
			("OmniQuery Template", {"title": "SHG Test Survey Unit"}),
			("OmniQuery Project", {"project_name": "Rajasthan Livelihood Project"}),
		]:
			for name in frappe.get_all(dt, filters=filter_dict, pluck="name"):
				try:
					doc = frappe.get_doc(dt, name)
					if getattr(doc, "docstatus", 0) == 1:
						doc.cancel()
					frappe.delete_doc(dt, name, force=True, ignore_permissions=True)
				except Exception:
					pass
		frappe.db.commit()
