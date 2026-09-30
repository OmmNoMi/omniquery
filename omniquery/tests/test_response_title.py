import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.services.schema_compiler import compile_template_schema, build_schema_dictionary


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
