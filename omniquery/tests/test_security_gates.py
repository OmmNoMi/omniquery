import ast
import base64
import glob
import os
import uuid
import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.api.sync import upload_response_audio, sync_draft


class TestSecurityGates(FrappeTestCase):
	def setUp(self):
		self.test_records = []

	def tearDown(self):
		frappe.set_user("Administrator")
		for dt, dn in reversed(self.test_records):
			try:
				if frappe.db.exists(dt, dn):
					frappe.delete_doc(dt, dn, force=True)
			except Exception:
				pass
		frappe.db.commit()

	def _get_or_create_project(self):
		proj = frappe.db.get_value("OmniQuery Project", {"status": "Active"}, "name")
		if not proj:
			doc = frappe.get_doc({
				"doctype": "OmniQuery Project",
				"project_name": "Test Sec Project",
				"status": "Active",
			}).insert(ignore_permissions=True)
			proj = doc.name
			self.test_records.append(("OmniQuery Project", proj))
		return proj

	def test_zero_raw_sql_in_api_modules(self):
		"""AST Analysis: Enforces 0 raw SQL (frappe.db.sql) calls across all omniquery/api/*.py files."""
		api_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "api"))
		py_files = glob.glob(os.path.join(api_dir, "*.py"))
		self.assertTrue(len(py_files) > 0, "No API python files discovered")

		raw_sql_violations = []

		for fpath in py_files:
			with open(fpath, "r", encoding="utf-8") as f:
				tree = ast.parse(f.read(), filename=fpath)

			for node in ast.walk(tree):
				if isinstance(node, ast.Call):
					func = node.func
					# Match frappe.db.sql(...)
					if (
						isinstance(func, ast.Attribute)
						and func.attr == "sql"
						and isinstance(func.value, ast.Attribute)
						and func.value.attr == "db"
						and isinstance(func.value.value, ast.Name)
						and func.value.value.id == "frappe"
					):
						raw_sql_violations.append(f"{os.path.basename(fpath)}:line {node.lineno}")

		self.assertEqual(
			raw_sql_violations,
			[],
			f"Security Violation: raw frappe.db.sql detected in API modules: {raw_sql_violations}",
		)

	def test_audio_upload_rejects_unauthorized_guest_on_private_survey(self):
		"""Security Gate: Anonymous guests cannot upload audio to private staff surveys."""
		rand_id = uuid.uuid4().hex[:6]
		test_name = f"OQS-PRIVTEST-{rand_id}"

		proj = self._get_or_create_project()
		tmpl = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": f"Private Staff Survey {rand_id}",
			"project": proj,
			"version": 1,
			"status": "Published",
			"is_public_citizen_link": 0,
			"is_public": 0,
		}).insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Template", tmpl.name))

		resp = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"name": test_name,
			"idempotency_key": test_name,
			"survey_template": tmpl.name,
			"template_version": 1,
			"surveyor": "SURV-Administrator",
			"survey_status": "Submitted",
		}).insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Response", test_name))

		# Attempt upload as Guest
		frappe.set_user("Guest")
		frappe.local.form_dict = frappe._dict({
			"response_name": test_name,
			"file_base64": base64.b64encode(b"dummyopusaudio").decode("utf-8"),
			"filename": "interview.webm",
		})

		with self.assertRaises(frappe.PermissionError) as cm:
			upload_response_audio(response_name=test_name)

		self.assertIn("Unauthorized audio upload on private survey", str(cm.exception))

	def test_audio_upload_rejects_invalid_file_extension(self):
		"""Security Gate: Rejects executable and non-audio extensions (.py, .sh, .html, etc.)."""
		frappe.set_user("Administrator")
		rand_id = uuid.uuid4().hex[:6]
		test_name = f"OQS-EXTTEST-{rand_id}"

		proj = self._get_or_create_project()
		tmpl = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": f"Test Ext Template {rand_id}",
			"project": proj,
			"version": 1,
			"status": "Published",
		}).insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Template", tmpl.name))

		resp = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"name": test_name,
			"idempotency_key": test_name,
			"survey_template": tmpl.name,
			"template_version": 1,
			"surveyor": "SURV-Administrator",
			"survey_status": "Submitted",
		}).insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Response", test_name))

		frappe.local.form_dict = frappe._dict({
			"response_name": test_name,
			"file_base64": base64.b64encode(b"malicious script").decode("utf-8"),
			"filename": "exploit.sh",
		})

		with self.assertRaises(frappe.ValidationError):
			upload_response_audio(response_name=test_name)

	def test_audio_upload_rejects_oversized_audio(self):
		"""Security Gate: Rejects audio payloads exceeding 50MB."""
		frappe.set_user("Administrator")
		rand_id = uuid.uuid4().hex[:6]
		test_name = f"OQS-SIZETEST-{rand_id}"

		proj = self._get_or_create_project()
		tmpl = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": f"Test Size Template {rand_id}",
			"project": proj,
			"version": 1,
			"status": "Published",
		}).insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Template", tmpl.name))

		resp = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"name": test_name,
			"idempotency_key": test_name,
			"survey_template": tmpl.name,
			"template_version": 1,
			"surveyor": "SURV-Administrator",
			"survey_status": "Submitted",
		}).insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Response", test_name))

		# Generate payload > 50MB
		oversized_bytes = b"0" * (50 * 1024 * 1024 + 100)
		frappe.local.form_dict = frappe._dict({
			"response_name": test_name,
			"file_base64": base64.b64encode(oversized_bytes).decode("utf-8"),
			"filename": "giant_audio.webm",
		})

		with self.assertRaises(frappe.ValidationError):
			upload_response_audio(response_name=test_name)

	def test_draft_sync_strips_xss_tags(self):
		"""Security Gate: Stored XSS tags are stripped in in-flight draft sync."""
		frappe.set_user("Administrator")
		rand_id = uuid.uuid4().hex[:6]
		draft_id = f"OQS-XSSTEST-{rand_id}"

		proj = self._get_or_create_project()
		tmpl = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": f"Test XSS Template {rand_id}",
			"project": proj,
			"version": 1,
			"status": "Published",
		}).insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Template", tmpl.name))

		payload = {
			"idempotency_key": draft_id,
			"survey_template": tmpl.name,
			"template_version": 1,
			"surveyor": "SURV-Administrator",
			"items": [
				{
					"question_code": "Q_XSS",
					"question_label": "Question",
					"value": "<script>alert('pwned')</script>SafeText",
				}
			],
		}

		res = sync_draft(data={"draft": payload})
		self.assertEqual(res.get("status"), "SUCCESS")
		self.test_records.append(("OmniQuery Response", draft_id))

		doc = frappe.get_doc("OmniQuery Response", draft_id)
		self.assertEqual(len(doc.items), 1)
		self.assertEqual(doc.items[0].value_text, "SafeText")
