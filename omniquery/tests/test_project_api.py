import unittest

import frappe

from omniquery.api.survey import get_bootstrap_data, get_project_details, list_active_templates, workspace_title
from omniquery.tests.utils import delete_test_docs

PROJECT = "Sample Enterprise Project"
TEMPLATE = "Sample Test Survey Unit"
WORKSPACE = "Sample Workspace Unit"
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

	def test_the_description_reaches_the_pwa_as_plain_text(self):
		# a Desk save wraps the Text Editor in HTML, and the PWA shows it as text (#18)
		frappe.db.set_value("OmniQuery Project", self.project, "description", '<div class="ql-editor read-mode"><p>A study of <strong>micro-enterprises</strong> &amp; SHGs.</p></div>')
		self._submit_template()
		descriptions = [get_project_details(self.project)["project"]["description"]]
		descriptions += [t["project_description"] for t in (self._listed_template(), self._bootstrap_template())]
		for description in descriptions:
			# Frappe's html_to_plain_text puts a space either side of an inline tag; the PWA collapses it
			self.assertEqual(" ".join(description.split()), "A study of micro-enterprises & SHGs.")

	def test_unknown_project_gives_nothing_not_a_made_up_one(self):
		# #57: the endpoint once invented a project and a grantor for any id it did not know
		self.assertEqual(get_project_details("NON_EXISTENT_PROJECT_XYZ"), {})
		self.assertEqual(get_project_details(), {})

	def test_details_and_templates_carry_the_projects_own_status(self):
		# the project page header shows this before its details load, so both must agree (#16)
		frappe.db.set_value("OmniQuery Project", self.project, "status", "Completed")
		self._submit_template()
		self.assertEqual(get_project_details(self.project)["project"]["status"], "Completed")
		for template in (self._listed_template(), self._bootstrap_template()):
			self.assertEqual(template["project_status"], "Completed")

	def test_the_workspace_is_named_by_its_title_or_name_never_its_id(self):
		# #16: a workspace with no title showed its raw id in the project header
		workspace = frappe.get_doc(
			{"doctype": "OmniQuery Workspace", "workspace_name": WORKSPACE, "workspace_admin": "Administrator"}
		).insert(ignore_permissions=True)
		frappe.db.set_value("OmniQuery Project", self.project, "workspace", workspace.name)
		self._submit_template()
		for project_or_template in self._project_and_templates():
			self.assertEqual(project_or_template["workspace_title"], WORKSPACE)

		workspace.db_set("workspace_title", "Sample Workspace Title")
		for project_or_template in self._project_and_templates():
			self.assertEqual(project_or_template["workspace_title"], "Sample Workspace Title")

		# with neither, nothing to show rather than the id
		self.assertEqual(workspace_title({"name": workspace.name, "workspace_name": "", "workspace_title": ""}), "")
		self.assertEqual(workspace_title(None), "")

	def test_a_project_without_a_workspace_has_no_workspace_title(self):
		self._submit_template()
		for project_or_template in self._project_and_templates():
			self.assertEqual(project_or_template["workspace_title"], "")

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

	def _project_and_templates(self):
		return get_project_details(self.project)["project"], self._listed_template(), self._bootstrap_template()

	def _cleanup_test_records(self):
		delete_test_docs(
			[
				("OmniQuery Template", {"title": TEMPLATE}),
				("OmniQuery Project", {"project_name": PROJECT}),
				("OmniQuery Workspace", {"workspace_name": WORKSPACE}),
			]
		)
		frappe.db.commit()
