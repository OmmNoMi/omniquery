import uuid
import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.api.sync import sync_draft, batch_push, resolve_surveyor, resolve_respondent


class TestInFlightAndSubmit(FrappeTestCase):
	def test_draft_and_submit_lifecycle(self):
		frappe.set_user("Administrator")

		# 1. Test Surveyor Resolution
		surv = resolve_surveyor("Administrator")
		self.assertTrue(surv.startswith("SURV-"), f"Expected SURV-* surveyor, got {surv}")

		# 2. Test Respondent Resolution (no extra table bloat, returns None if not registered)
		self.assertIsNone(resolve_respondent("Respondent"))
		self.assertIsNone(resolve_respondent("NonExistentPerson"))

		# 3. Get an active template
		template = frappe.db.get_value("OmniQuery Template", {"status": "Published"}, "name")
		if not template:
			template = frappe.db.get_value("OmniQuery Template", {}, "name")
		if not template:
			return

		# 4. Generate Survey ID with OQS-{surveyID}-{randomstring}
		clean_tmpl = template.replace("OQS-", "")
		rand_str = uuid.uuid4().hex[:6]
		survey_id = f"OQS-{clean_tmpl}-{rand_str}"

		# 5. Test In-Flight Live Draft Sync
		draft_payload = {
			"idempotency_key": survey_id,
			"survey_template": template,
			"template_version": 1,
			"respondent": "Br",
			"surveyor": "Administrator",
			"items": [
				{"question_code": "entrepreneur_name", "value": "Br"},
				{"question_code": "district", "value": "Jaipur"}
			]
		}

		draft_result = sync_draft(data={"draft": draft_payload})
		self.assertEqual(draft_result.get("status"), "SUCCESS")
		doc_name = draft_result.get("doc_name")
		self.assertEqual(doc_name, survey_id)

		resp_doc = frappe.get_doc("OmniQuery Response", doc_name)
		self.assertEqual(resp_doc.name, survey_id)
		self.assertEqual(resp_doc.survey_status, "Draft")
		self.assertEqual(len(resp_doc.items), 2)

		# 6. Test Form Submission Promotion
		sub_payload = {
			"idempotency_key": survey_id,
			"survey_template": template,
			"template_version": 1,
			"respondent": "Br",
			"surveyor": "Administrator",
			"items": draft_payload["items"]
		}

		push_result = batch_push(submissions=[sub_payload])
		self.assertEqual(push_result["results"][0]["status"], "SUCCESS")
		self.assertEqual(push_result["results"][0]["doc_name"], survey_id)

		resp_doc.reload()
		self.assertEqual(resp_doc.survey_status, "Submitted")

		# Clean up test doc
		frappe.delete_doc("OmniQuery Response", doc_name, force=True)
		audit_name = frappe.db.get_value("OmniQuery Sync Audit Log", {"idempotency_key": survey_id}, "name")
		if audit_name:
			frappe.delete_doc("OmniQuery Sync Audit Log", audit_name, force=True)
		frappe.db.commit()
