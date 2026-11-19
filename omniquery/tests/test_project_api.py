import unittest

import frappe

from omniquery.api.survey import get_bootstrap_data, get_project_details, list_active_templates
from omniquery.tests.utils import delete_test_docs

PROJECT = "Sample Enterprise Project"
TEMPLATE = "Sample Test Survey Unit"
SOP = "<p>Introduce yourself before the first question.</p>"


class TestProjectAPI(unittest.TestCase):
	def setUp(self):
		self._cleanup_test_records()
		self.project = (
			frappe.get_doc(
				{
					"doctype": "OmniQuery Project",
					"project_name": PROJECT,
					"grantor_organization": "Sample Grantor",
					"support_email": "helpdesk@example.org",
					"helpline_phone": "+91 1800 000 111",
					"sop_sections": SOP,
					"description": "A study of micro-enterprises.",
					"status": "Active",
				}
			)
			.insert(ignore_permissions=True)
			.name
		)

	def test_get_project_details_returns_the_projects_own_help(self):
		details = get_project_details(self.project)
		project = details["project"]
		self.assertEqual(project["project_name"], PROJECT)
		self.assertEqual(project["grantor_organization"], "Sample Grantor")
		# the helpline and SOPs are the project's own, not invented ones (#14, #51)
		self.assertEqual(project["support_email"], "helpdesk@example.org")
		self.assertEqual(project["helpline_phone"], "+91 1800 000 111")
		self.assertEqual(project["sop_sections"], SOP)
		# no made-up supervisor, hours or training modules ride along any more (#14)
		self.assertEqual(set(details), {"project"})

	def test_a_project_without_help_gives_empty_strings(self):
		frappe.db.set_value("OmniQuery Project", self.project, {"support_email": None, "helpline_phone": None, "sop_sections": None})
		project = get_project_details(self.project)["project"]
		self.assertEqual((project["support_email"], project["helpline_phone"], project["sop_sections"]), ("", "", ""))

	def test_sops_are_sanitized_even_when_saved_around_the_form(self):
		# db_set skips the Text Editor sanitizing a form save does, and the PWA renders this as HTML
		frappe.db.set_value("OmniQuery Project", self.project, "sop_sections", '<p>Hi</p><img src=x onerror="alert(1)"><script>alert(2)</script>')
		self._submit_template()
		for sop in (get_project_details(self.project)["project"]["sop_sections"], self._listed_template()["sop_sections"]):
			self.assertIn("<p>Hi</p>", sop)
			self.assertNotIn("onerror", sop)
			self.assertNotIn("<script", sop)

	def test_the_template_list_carries_the_help_so_it_works_offline(self):
		# the PWA caches templates, not get_project_details, so the help must ride on each template (#14)
		self._submit_template()
		for template in (self._listed_template(), self._bootstrap_template()):
			self.assertEqual(template["support_email"], "helpdesk@example.org")
			self.assertEqual(template["helpline_phone"], "+91 1800 000 111")
			self.assertEqual(template["sop_sections"], SOP)

	def test_unknown_project_gives_nothing_not_a_made_up_one(self):
		# #57: the endpoint once invented a project and a grantor for any id it did not know
		self.assertEqual(get_project_details("NON_EXISTENT_PROJECT_XYZ"), {})
		self.assertEqual(get_project_details(), {})

	def tearDown(self):
		self._cleanup_test_records()

	def _submit_template(self):
		frappe.get_doc(
			{
				"doctype": "OmniQuery Template",
				"title": TEMPLATE,
				"project": self.project,
				"version": 1,
				"sections": [{"section_code": "SEC_1", "section_title": "Basic Section"}],
				"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Question 1"}],
			}
		).insert(ignore_permissions=True).submit()

	def _listed_template(self):
		return next(t for t in list_active_templates(self.project) if t["title"] == TEMPLATE)

	def _bootstrap_template(self):
		return next(t for t in get_bootstrap_data()["templates"] if t["title"] == TEMPLATE)

	def _cleanup_test_records(self):
		delete_test_docs(
			[
				("OmniQuery Template", {"title": TEMPLATE}),
				("OmniQuery Project", {"project_name": PROJECT}),
			]
		)
		frappe.db.commit()
