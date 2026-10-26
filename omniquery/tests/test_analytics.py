# Copyright (c) 2026, OmmNoMi Automation LLP and contributors
# For license information, please see license.txt

import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.api.analytics import get_project_analytics
from omniquery.api.survey import get_surveyor_kpis


class TestAnalytics(FrappeTestCase):
	def setUp(self):
		self.orig_user = frappe.session.user

	def tearDown(self):
		frappe.set_user(self.orig_user)

	def test_get_project_analytics_returns_counts_equal_to_db(self):
		frappe.set_user("Administrator")
		res = get_project_analytics()
		self.assertIsInstance(res, dict)
		self.assertIn("total_responses", res)
		self.assertIn("approved_count", res)
		self.assertIn("flagged_count", res)
		self.assertIn("daily_velocity", res)
		self.assertIn("leaderboard", res)

		db_total = frappe.db.count("OmniQuery Response", {"survey_status": ["!=", "Draft"]})
		db_approved = frappe.db.count("OmniQuery Response", {"survey_status": "Approved"})
		db_flagged = frappe.db.count("OmniQuery Response", {"survey_status": "Audit Flagged"})

		self.assertEqual(res["total_responses"], db_total)
		self.assertEqual(res["approved_count"], db_approved)
		self.assertEqual(res["flagged_count"], db_flagged)

	def test_get_surveyor_kpis_as_administrator_returns_submitted_ten(self):
		frappe.set_user("Administrator")
		kpis = get_surveyor_kpis()
		self.assertIsInstance(kpis, dict)
		self.assertIn("total_count", kpis)
		self.assertIn("approved_count", kpis)
		self.assertIn("today_count", kpis)
		self.assertIn("week_count", kpis)

		# The benchmark fixture has 10 responses for Administrator
		self.assertEqual(kpis["total_count"], 10)

	def test_get_surveyor_kpis_as_guest(self):
		frappe.set_user("Guest")
		kpis = get_surveyor_kpis()
		self.assertIsInstance(kpis, dict)
		self.assertEqual(kpis["today_count"], 0)
		self.assertEqual(kpis["week_count"], 0)
		self.assertEqual(kpis["total_count"], 0)
		self.assertEqual(kpis["approved_count"], 0)
		self.assertEqual(kpis["daily_target"], 10)

	def test_get_project_analytics_scoped_to_project(self):
		# Create test project
		project = frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Test Analytics Scoped Project",
			"grantor_organization": "Test Grantor Org",
			"status": "Active",
		}).insert(ignore_permissions=True)

		project_out = frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Test Analytics Out Project",
			"grantor_organization": "Test Grantor Org 2",
			"status": "Active",
		}).insert(ignore_permissions=True)

		# Create templates: one in project, one outside
		tmpl_in = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Tmpl In Analytics Project",
			"project": project.name,
			"version": 1,
			"status": "Published",
			"sections": [{"section_code": "SEC_1", "section_title": "Section 1"}],
			"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Q1"}],
		}).insert(ignore_permissions=True)

		tmpl_out = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Tmpl Out Analytics Project",
			"project": project_out.name,
			"version": 1,
			"status": "Published",
			"sections": [{"section_code": "SEC_1", "section_title": "Section 1"}],
			"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Q1"}],
		}).insert(ignore_permissions=True)

		# Create surveyor
		surv = frappe.get_doc({
			"doctype": "OmniQuery Surveyor",
			"surveyor_name": "Test Analytics Surveyor",
			"user": "Administrator",
			"status": "Active",
		}).insert(ignore_permissions=True)

		# Create responses
		r_in_1 = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"survey_template": tmpl_in.name,
			"template_version": 1,
			"surveyor": surv.name,
			"survey_status": "Approved",
			"idempotency_key": "IDEM-TEST-IN-1",
		}).insert(ignore_permissions=True)

		r_in_2 = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"survey_template": tmpl_in.name,
			"template_version": 1,
			"surveyor": surv.name,
			"survey_status": "Audit Flagged",
			"idempotency_key": "IDEM-TEST-IN-2",
		}).insert(ignore_permissions=True)

		r_out = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"survey_template": tmpl_out.name,
			"template_version": 1,
			"surveyor": surv.name,
			"survey_status": "Approved",
			"idempotency_key": "IDEM-TEST-OUT",
		}).insert(ignore_permissions=True)

		try:
			data = get_project_analytics(project_id=project.name)
			self.assertEqual(data["total_responses"], 2)
			self.assertEqual(data["approved_count"], 1)
			self.assertEqual(data["flagged_count"], 1)

			# Leaderboard for this surveyor in this project should have total=2, approved=1, flagged=1
			surv_lb = next((s for s in data["leaderboard"] if s["surveyor"] == surv.name), None)
			self.assertIsNotNone(surv_lb)
			self.assertEqual(surv_lb["total_responses"], 2)
			self.assertEqual(surv_lb["approved"], 1)
			self.assertEqual(surv_lb["flagged"], 1)
			self.assertEqual(surv_lb["quality_score"], 50.0)
		finally:
			r_in_1.delete()
			r_in_2.delete()
			r_out.delete()
			surv.delete()
			tmpl_in.delete()
			tmpl_out.delete()
			project.delete()
			project_out.delete()
			frappe.db.commit()

	def test_get_surveyor_kpis_resolves_linked_surveyor_by_user(self):
		user_email = "test.surveyor.kpis@example.com"
		if not frappe.db.exists("User", user_email):
			user = frappe.get_doc({
				"doctype": "User",
				"email": user_email,
				"first_name": "Test Surveyor User",
			}).insert(ignore_permissions=True)
		else:
			user = frappe.get_doc("User", user_email)

		surv = frappe.get_doc({
			"doctype": "OmniQuery Surveyor",
			"surveyor_name": "Test Link Surveyor",
			"user": user_email,
			"status": "Active",
		}).insert(ignore_permissions=True)

		proj = frappe.get_doc({
			"doctype": "OmniQuery Project",
			"project_name": "Test Link Project",
			"grantor_organization": "Test Grantor",
			"status": "Active",
		}).insert(ignore_permissions=True)

		tmpl = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Tmpl Surveyor Link Test",
			"project": proj.name,
			"version": 1,
			"status": "Published",
			"sections": [{"section_code": "SEC_1", "section_title": "Section 1"}],
			"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Q1"}],
		}).insert(ignore_permissions=True)

		resp = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"survey_template": tmpl.name,
			"template_version": 1,
			"surveyor": surv.name,
			"owner": "Guest",
			"survey_status": "Approved",
			"idempotency_key": "IDEM-TEST-LINKED-SURV",
		}).insert(ignore_permissions=True)

		try:
			frappe.set_user(user_email)
			kpis = get_surveyor_kpis()
			self.assertGreaterEqual(kpis["total_count"], 1)
			self.assertGreaterEqual(kpis["approved_count"], 1)
		finally:
			frappe.set_user("Administrator")
			resp.delete()
			surv.delete()
			tmpl.delete()
			proj.delete()
			user.delete()
			frappe.db.commit()
