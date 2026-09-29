import unittest

import frappe

from omniquery.omniquery.doctype.omniquery_question.omniquery_question import (
	_extract_project_sequence,
	_extract_survey_sequence,
	_extract_workspace_sequence,
	elevate_question,
)


class TestQuestionScope(unittest.TestCase):
	def setUp(self):
		self.test_records = []
		self._cleanup_test_records()
		self._create_test_hierarchy()

	def tearDown(self):
		self._cleanup_test_records()

	def _cleanup_test_records(self):
		for question_name in frappe.get_all(
			"OmniQuery Question",
			filters={"question_code": ["like", "t_scope_%"]},
			pluck="name",
		):
			docstatus = frappe.db.get_value("OmniQuery Question", question_name, "docstatus")
			if docstatus == 1:
				frappe.db.set_value("OmniQuery Question", question_name, "docstatus", 2)
			frappe.delete_doc("OmniQuery Question", question_name, force=True, ignore_permissions=True)

		for option_set in frappe.get_all(
			"OmniQuery Option Set", filters={"set_name": ["like", "Test Option Set%"]}, pluck="name"
		):
			frappe.delete_doc("OmniQuery Option Set", option_set, force=True, ignore_permissions=True)

		for template_name in frappe.get_all(
			"OmniQuery Template", filters={"title": ["like", "Test Scope Survey%"]}, pluck="name"
		):
			frappe.delete_doc("OmniQuery Template", template_name, force=True, ignore_permissions=True)

		for project_name in frappe.get_all(
			"OmniQuery Project", filters={"project_name": ["like", "%Scope Test Project%"]}, pluck="name"
		):
			frappe.delete_doc("OmniQuery Project", project_name, force=True, ignore_permissions=True)

		for workspace_name in frappe.get_all(
			"OmniQuery Workspace", filters={"workspace_name": ["like", "test-scope-%"]}, pluck="name"
		):
			frappe.delete_doc("OmniQuery Workspace", workspace_name, force=True, ignore_permissions=True)

		frappe.db.commit()

	def _create_test_hierarchy(self):
		self.workspace = frappe.get_doc({
			"doctype": "OmniQuery Workspace",
			"workspace_name": "test-scope-workspace",
			"workspace_admin": "Administrator",
		}).insert(ignore_permissions=True)

		self.project = frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Scope Test Project",
			"workspace": self.workspace.name,
			"grantor_organization": "Scope Board",
			"status": "Active",
		}).insert(ignore_permissions=True)

		self.survey_template = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Test Scope Survey",
			"project": self.project.name,
			"version": 1,
			"status": "Draft",
		}).insert(ignore_permissions=True)

	def test_platform_scope_requires_no_parent(self):
		platform_question = frappe.get_doc({
			"doctype": "OmniQuery Question",
			"question_code": "t_scope_platform",
			"label_en": "Platform Level Question",
			"scope": "Platform",
			"field_category": "Choice (Single)",
			"control_variant": "Radio",
			"status": "Draft",
		}).insert(ignore_permissions=True)
		self.assertEqual(platform_question.scope, "Platform")
		self.assertTrue(platform_question.name.startswith("OQQ-"))
		self.assertEqual(len(platform_question.name.split("-")[1]), 5)
		self.assertTrue(platform_question.name.split("-")[1].isdigit())
		platform_question.submit()
		self.assertEqual(platform_question.status, "Active")

	def test_scoped_question_naming_series(self):
		expected_workspace_seq = _extract_workspace_sequence(self.workspace.name)
		_, expected_project_seq = _extract_project_sequence(self.project.name, self.workspace.name)
		_, _, expected_survey_seq = _extract_survey_sequence(
			self.survey_template.name, self.project.name, self.workspace.name
		)

		# 1. Workspace scope: OQQ-{workspace}-0001
		workspace_question = frappe.get_doc({
			"doctype": "OmniQuery Question",
			"question_code": "t_scope_wsp_q",
			"label_en": "Workspace Scope Question",
			"scope": "Workspace",
			"workspace": self.workspace.name,
		}).insert(ignore_permissions=True)
		workspace_parts = workspace_question.name.split("-")
		self.assertEqual(workspace_parts[0], "OQQ")
		self.assertEqual(workspace_parts[1], expected_workspace_seq)
		self.assertEqual(len(workspace_parts[2]), 4)
		self.assertTrue(workspace_parts[2].isdigit())

		# 2. Project scope: OQQ-{workspace}-{project}-0001
		project_question = frappe.get_doc({
			"doctype": "OmniQuery Question",
			"question_code": "t_scope_pro_q",
			"label_en": "Project Scope Question",
			"scope": "Project",
			"project": self.project.name,
		}).insert(ignore_permissions=True)
		project_parts = project_question.name.split("-")
		self.assertEqual(project_parts[0], "OQQ")
		self.assertEqual(project_parts[1], expected_workspace_seq)
		self.assertEqual(project_parts[2], expected_project_seq)
		self.assertEqual(len(project_parts[3]), 4)
		self.assertTrue(project_parts[3].isdigit())

		# 3. Survey scope: OQQ-{workspace}-{project}-{survey}-0001
		survey_question = frappe.get_doc({
			"doctype": "OmniQuery Question",
			"question_code": "t_scope_svy_q",
			"label_en": "Survey Scope Question",
			"scope": "Survey",
			"survey_template": self.survey_template.name,
		}).insert(ignore_permissions=True)
		survey_parts = survey_question.name.split("-")
		self.assertEqual(survey_parts[0], "OQQ")
		self.assertEqual(survey_parts[1], expected_workspace_seq)
		self.assertEqual(survey_parts[2], expected_project_seq)
		self.assertEqual(survey_parts[3], expected_survey_seq)
		self.assertEqual(len(survey_parts[4]), 4)
		self.assertTrue(survey_parts[4].isdigit())

	def test_question_elevation_workflow(self):
		source_survey_question = frappe.get_doc({
			"doctype": "OmniQuery Question",
			"question_code": "t_scope_elevate_src",
			"label_en": "Source Survey Question",
			"scope": "Survey",
			"survey_template": self.survey_template.name,
		}).insert(ignore_permissions=True)
		expected_ws_seq = _extract_workspace_sequence(self.workspace.name)
		expected_pro_seq = _extract_project_sequence(self.project.name, self.workspace.name)[1]
		self.assertTrue(source_survey_question.name.startswith(f"OQQ-{expected_ws_seq}-{expected_pro_seq}-"))

		# Elevate to Project scope
		project_elevation_result = elevate_question(
			question_name=source_survey_question.name,
			target_scope="Project",
			target_workspace=self.workspace.name,
			target_project=self.project.name,
		)
		elevated_project_question = frappe.get_doc("OmniQuery Question", project_elevation_result["name"])
		self.assertEqual(elevated_project_question.scope, "Project")
		self.assertTrue(elevated_project_question.name.startswith(f"OQQ-{expected_ws_seq}-{expected_pro_seq}-"))
		self.assertEqual(len(elevated_project_question.name.split("-")), 4)

		# Elevate to Platform scope
		platform_elevation_result = elevate_question(
			question_name=source_survey_question.name,
			target_scope="Platform",
		)
		elevated_platform_question = frappe.get_doc("OmniQuery Question", platform_elevation_result["name"])
		self.assertEqual(elevated_platform_question.scope, "Platform")
		self.assertTrue(elevated_platform_question.name.startswith("OQQ-"))
		self.assertEqual(len(elevated_platform_question.name.split("-")), 2)
		self.assertEqual(len(elevated_platform_question.name.split("-")[1]), 5)

	def test_workspace_scope_validation(self):
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc({
				"doctype": "OmniQuery Question",
				"question_code": "t_scope_workspace_invalid",
				"label_en": "Missing Workspace Question",
				"scope": "Workspace",
			}).insert(ignore_permissions=True)

		valid_question = frappe.get_doc({
			"doctype": "OmniQuery Question",
			"question_code": "t_scope_workspace_valid",
			"label_en": "Valid Workspace Question",
			"scope": "Workspace",
			"workspace": self.workspace.name,
		}).insert(ignore_permissions=True)
		self.assertEqual(valid_question.workspace, self.workspace.name)

	def test_project_scope_validation(self):
		with self.assertRaises(frappe.ValidationError):
			frappe.get_doc({
				"doctype": "OmniQuery Question",
				"question_code": "t_scope_proj_invalid",
				"label_en": "Missing Project Question",
				"scope": "Project",
			}).insert(ignore_permissions=True)

		valid_question = frappe.get_doc({
			"doctype": "OmniQuery Question",
			"question_code": "t_scope_proj_valid",
			"label_en": "Valid Project Question",
			"scope": "Project",
			"project": self.project.name,
		}).insert(ignore_permissions=True)
		self.assertEqual(valid_question.project, self.project.name)

	def test_option_set_linkage_and_scoring(self):
		option_set = frappe.get_doc({
			"doctype": "OmniQuery Option Set",
			"set_name": "Test Option Set Agreement",
			"scope": "Platform",
			"options": [
				{
					"option_code": "agree",
					"label_text": "Strongly Agree",
					"score_weight": 5.0,
					"display_order": 1,
				},
				{
					"option_code": "disagree",
					"label_text": "Strongly Disagree",
					"score_weight": 1.0,
					"display_order": 2,
				},
			],
		}).insert(ignore_permissions=True)
		rating_question = frappe.get_doc({
			"doctype": "OmniQuery Question",
			"question_code": "t_scope_rating_q",
			"label_en": "Agreement level",
			"scope": "Platform",
			"field_category": "Choice (Single)",
			"control_variant": "Rating",
			"rating_icon": "Star",
			"rating_max": 5,
			"rating_step": 1.0,
			"options_set": option_set.name,
		}).insert(ignore_permissions=True)
		self.assertEqual(rating_question.options_set, option_set.name)
		self.assertEqual(len(option_set.options), 2)

	def test_frappe_native_question_amendment(self):
		initial_question = frappe.get_doc({
			"doctype": "OmniQuery Question",
			"question_code": "t_scope_amend_q",
			"label_en": "Initial Version Question",
			"scope": "Platform",
			"field_category": "Text Input",
			"control_variant": "Text",
		}).insert(ignore_permissions=True)
		self.assertTrue(initial_question.name.startswith("OQQ-"))
		self.assertEqual(initial_question.question_version, 1)

		initial_question.submit()
		self.assertEqual(initial_question.docstatus, 1)
		self.assertEqual(initial_question.status, "Active")

		# Native amendment 1
		amended_question_1 = frappe.copy_doc(initial_question)
		amended_question_1.amended_from = initial_question.name
		amended_question_1.label_en = "Amended Version Question"
		amended_question_1.insert(ignore_permissions=True)

		self.assertEqual(amended_question_1.name, f"{initial_question.name}-1")
		self.assertEqual(amended_question_1.question_version, 2)
		self.assertEqual(amended_question_1.amended_from, initial_question.name)
		amended_question_1.submit()
		self.assertEqual(amended_question_1.docstatus, 1)

		# Native amendment 2
		amended_question_2 = frappe.copy_doc(amended_question_1)
		amended_question_2.amended_from = amended_question_1.name
		amended_question_2.label_en = "Third Version Question"
		amended_question_2.insert(ignore_permissions=True)

		self.assertEqual(amended_question_2.name, f"{initial_question.name}-2")
		self.assertEqual(amended_question_2.question_version, 3)
		self.assertEqual(amended_question_2.amended_from, amended_question_1.name)
		amended_question_2.submit()
		self.assertEqual(amended_question_2.docstatus, 1)
