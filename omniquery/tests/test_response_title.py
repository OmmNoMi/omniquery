import json
import os
import uuid

import frappe
from frappe.tests.utils import FrappeTestCase
from frappe.utils import formatdate

from omniquery.patches.v1_0 import backfill_response_titles
from omniquery.services.response_title import resolve_response_title
from omniquery.services.schema_compiler import compile_template_schema, build_schema_dictionary
from omniquery.tests.utils import delete_test_docs

VECTORS = os.path.join(frappe.get_app_path("omniquery"), "..", "test", "fixtures", "response_titles.json")
TITLE_USER = "test_title_surveyor@example.com"


class TestResponseTitleConfig(FrappeTestCase):
	def setUp(self):
		self.project_name = "PROJ-Test Response Title"
		if not frappe.db.exists("OmniQuery Project", self.project_name):
			frappe.get_doc({
				"doctype": "OmniQuery Project",
				"project_name": "Test Response Title",
				"grantor_organization": "State Livelihoods Mission",
				"status": "Active",
			}).insert(ignore_permissions=True)

		self.test_template_name = "TEST-TMPL-TITLE-001"
		if frappe.db.exists("OmniQuery Template", self.test_template_name):
			frappe.delete_doc("OmniQuery Template", self.test_template_name, force=True)

	def tearDown(self):
		if hasattr(self, "test_template_name") and frappe.db.exists("OmniQuery Template", self.test_template_name):
			frappe.delete_doc("OmniQuery Template", self.test_template_name, force=True)

	def test_default_response_title_format_when_not_specified(self):
		doc = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Test Title Default",
			"project": self.project_name,
			"status": "Draft",
		})
		doc.insert(ignore_permissions=True)
		self.test_template_name = doc.name

		schema = build_schema_dictionary(doc)
		self.assertEqual(
			schema.get("response_title_format"),
			"{respondent_name} - {village_gp} ({enterprise_name})"
		)

	def test_custom_response_title_format_compilation(self):
		doc = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Test Custom Title",
			"project": self.project_name,
			"status": "Draft",
			"response_title_format": "{artisan_name} | {cluster_name} [{state}]",
		})
		doc.insert(ignore_permissions=True)
		self.test_template_name = doc.name

		compiled = compile_template_schema(doc)
		self.assertEqual(
			compiled.get("response_title_format"),
			"{artisan_name} | {cluster_name} [{state}]"
		)
		self.assertIn("response_title_format", doc.compiled_schema_json)
		self.assertIn("{artisan_name}", doc.compiled_schema_json)

	def test_unicode_and_hindi_tokens_in_response_title_format(self):
		hindi_format = "{उद्यमी_का_नाम} - {गाँव} ({व्यवसाय})"
		doc = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Test Hindi Title Format",
			"project": self.project_name,
			"status": "Draft",
			"response_title_format": hindi_format,
		})
		doc.insert(ignore_permissions=True)
		self.test_template_name = doc.name

		compiled = compile_template_schema(doc)
		self.assertEqual(compiled.get("response_title_format"), hindi_format)
		self.assertIsNotNone(doc.schema_hash_sha256)


class TestResponseTitleResolver(FrappeTestCase):
	def test_shared_cases_match_the_js_resolver(self):
		# src/utils/__tests__/responseTitle.spec.js runs the same file
		with open(VECTORS) as f:
			cases = json.load(f)["cases"]
		for case in cases:
			with self.subTest(title=case["title"]):
				self.assertEqual(
					resolve_response_title(case["answers"], case["format"], case.get("fallback", "")),
					case["title"],
				)


class TestResponseTitleOnSave(FrappeTestCase):
	"""#54: a response's title comes from its answers and the template's response_title_format."""

	def setUp(self):
		frappe.set_user("Administrator")
		if not frappe.db.exists("OmniQuery Project", "PROJ-Test Response Title"):
			frappe.get_doc({
				"doctype": "OmniQuery Project",
				"project_name": "Test Response Title",
				"grantor_organization": "State Livelihoods Mission",
				"status": "Active",
			}).insert(ignore_permissions=True)
		self.template = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": f"Title Test {uuid.uuid4().hex[:6]}",
			"project": "PROJ-Test Response Title",
			"status": "Draft",
			"response_title_format": "{respondent_name} - {village_gp} ({household_size})",
		}).insert(ignore_permissions=True)
		if not frappe.db.exists("User", TITLE_USER):
			frappe.get_doc({
				"doctype": "User",
				"email": TITLE_USER,
				"first_name": "Title Surveyor",
				"roles": [{"role": "OmniQuery User"}],
			}).insert(ignore_permissions=True)
		self.surveyor = frappe.db.get_value("OmniQuery Surveyor", {"user": TITLE_USER}) or frappe.get_doc({
			"doctype": "OmniQuery Surveyor",
			"surveyor_name": "Title Surveyor",
			"user": TITLE_USER,
			"status": "Active",
		}).insert(ignore_permissions=True).name

	def tearDown(self):
		delete_test_docs([
			("OmniQuery Response", {"survey_template": self.template.name}),
			("OmniQuery Template", {"name": self.template.name}),
			("OmniQuery Surveyor", {"user": TITLE_USER}),
			("User", {"name": TITLE_USER}),
		])

	def new_response(self, items, **fields):
		return frappe.get_doc({
			"doctype": "OmniQuery Response",
			"idempotency_key": f"OQS-TITLE-{uuid.uuid4().hex[:8]}",
			"survey_template": self.template.name,
			"template_version": 1,
			"surveyor": self.surveyor,
			"survey_status": "Draft",
			"items": [{"question_code": code, **value} for code, value in items.items()],
			**fields,
		}).insert(ignore_permissions=True)

	def test_doctype_shows_the_title(self):
		meta = frappe.get_meta("OmniQuery Response")
		self.assertEqual(meta.title_field, "title")
		self.assertTrue(meta.show_title_field_in_link)

	def test_title_follows_answers_from_draft_to_submit(self):
		resp = self.new_response({"respondent_name": {"value_text": "Meera Devi"}})
		self.assertEqual(resp.title, "Meera Devi")

		# sync loads the live draft and submits it with a plain save at docstatus 1, which skips before_save
		resp = frappe.get_doc("OmniQuery Response", resp.name)
		resp.append("items", {"question_code": "village_gp", "value_text": "Kotkhai"})
		resp.docstatus = 1
		resp.save(ignore_permissions=True)
		self.assertEqual(frappe.db.get_value("OmniQuery Response", resp.name, "title"), "Meera Devi - Kotkhai")

	def test_a_zero_answer_is_kept(self):
		resp = self.new_response({
			"respondent_name": {"value_text": "Lata"},
			"village_gp": {"value_text": "Rampur"},
			"household_size": {"value_numeric": 0},
		})
		self.assertEqual(resp.title, "Lata - Rampur (0)")

	def test_no_answers_falls_back_to_template_and_date(self):
		resp = self.new_response({"q1": {"value_text": "yes"}}, captured_at_local="2026-11-13 09:30:00")
		self.assertEqual(resp.title, f"{self.template.title}, {formatdate('2026-11-13')}")
		self.assertNotIn(resp.name, resp.title)

	def test_backfill_titles_older_responses(self):
		resp = self.new_response({"respondent_name": {"value_text": "Kavita"}})
		frappe.db.set_value("OmniQuery Response", resp.name, "title", None, update_modified=False)

		backfill_response_titles.execute()
		self.assertEqual(frappe.db.get_value("OmniQuery Response", resp.name, "title"), "Kavita")
