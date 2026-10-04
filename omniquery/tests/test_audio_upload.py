import base64
import uuid
import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.api.sync import upload_response_audio


class TestAudioUpload(FrappeTestCase):
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

	def test_audio_upload_links_to_response_and_creates_file(self):
		frappe.set_user("Administrator")

		# 1. Create a test OmniQuery Response
		rand_id = uuid.uuid4().hex[:6]
		test_name = f"OQS-TESTAUDIO-{rand_id}"

		template = frappe.db.get_value("OmniQuery Template", {"status": "Published"}, "name")
		if not template:
			template = frappe.db.get_value("OmniQuery Template", {}, "name")
		if not template:
			# Create a minimal template
			tmpl = frappe.get_doc({
				"doctype": "OmniQuery Template",
				"title": f"Test Template Audio {rand_id}",
				"version": 1,
				"status": "Published"
			}).insert(ignore_permissions=True)
			template = tmpl.name
			self.test_records.append(("OmniQuery Template", template))

		resp = frappe.get_doc({
			"doctype": "OmniQuery Response",
			"name": test_name,
			"idempotency_key": test_name,
			"survey_template": template,
			"template_version": 1,
			"surveyor": "SURV-Administrator",
			"survey_status": "Submitted",
		})
		resp.insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Response", test_name))

		# 2. Upload dummy audio bytes via upload_response_audio
		dummy_audio_bytes = b"OggS\x00\x02\x00\x00\x00\x00\x00\x00\x00\x00mockopusdatastream"
		b64_audio = base64.b64encode(dummy_audio_bytes).decode("utf-8")

		frappe.local.form_dict = frappe._dict({
			"response_name": test_name,
			"file_base64": b64_audio,
			"filename": f"test_interview_{rand_id}.webm",
		})

		res = upload_response_audio(response_name=test_name)
		self.assertEqual(res["status"], "SUCCESS")
		self.assertEqual(res["doc_name"], test_name)
		self.assertTrue(res["file_url"].startswith("/private/files/"))

		# 3. Verify doc.audio_recording is updated
		resp.reload()
		self.assertEqual(resp.audio_recording, res["file_url"])

		# 4. Verify Frappe File record exists and is linked as attachment
		file_name = frappe.db.get_value("File", {
			"attached_to_doctype": "OmniQuery Response",
			"attached_to_name": test_name,
			"attached_to_field": "audio_recording",
		}, "name")
		self.assertTrue(file_name)
		self.test_records.append(("File", file_name))
