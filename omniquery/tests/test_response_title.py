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

	def test_response_doctype_has_title_field_and_populates_from_format(self):
		meta = frappe.get_meta("OmniQuery Response")
		self.assertEqual(meta.title_field, "title")
		self.assertEqual(meta.show_title_field_in_link, 1)

		tmpl = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": "Title Generator Test Template",
			"project": self.project_name,
			"status": "Draft",
			"response_title_format": "{respondent_name} - {village_gp} ({enterprise_name})",
		}).insert(ignore_permissions=True)
		self.test_template_name = tmpl.name

		surv_name = "SURV-TitleTest"
		if not frappe.db.exists("OmniQuery Surveyor", surv_name):
			surv = frappe.get_doc({
				"doctype": "OmniQuery Surveyor",
				"surveyor_name": "TitleTest",
				"user": "Administrator",
			}).insert(ignore_permissions=True)
			surv_name = surv.name

		import json
		resp = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"idempotency_key": "OQS-RESP-TEST-001",
			"survey_template": tmpl.name,
			"template_version": 1,
			"surveyor": surv_name,
			"survey_status": "Submitted",
			"response_payload": json.dumps({
				"responses": {
					"respondent_name": "Meera Devi",
					"village_gp": "Kotkhai",
					"enterprise_name": "Meera Weaving",
				}
			}),
		}).insert(ignore_permissions=True)

		self.assertEqual(resp.title, "Meera Devi - Kotkhai (Meera Weaving)")
		frappe.delete_doc("OmniQuery Response", resp.name, force=True)

	def test_resolve_response_title_service_edge_cases(self):
		from omniquery.services.response_title import resolve_response_title

		# Empty / missing format falls back to standard
		title1 = resolve_response_title(
			{"respondent_name": "Kavita", "village_gp": "Rohru", "enterprise_name": "Woolens"},
			"",
		)
		self.assertEqual(title1, "Kavita - Rohru (Woolens)")

		# Partial answers cleans dangling artifacts
		title2 = resolve_response_title(
			{"respondent_name": "Kavita"},
			"{respondent_name} - {village_gp} ({enterprise_name})",
		)
		self.assertEqual(title2, "Kavita")

		# Custom format with Hindi tokens
		title3 = resolve_response_title(
			{"कारीगर": "मोहन", "गाँव": "मंडी"},
			"{कारीगर} - {गाँव}",
		)
		self.assertEqual(title3, "मोहन - मंडी")

		# Fallback when no tokens match
		title4 = resolve_response_title({}, "", fallback_title="Fallback Title")
		self.assertEqual(title4, "Fallback Title")
