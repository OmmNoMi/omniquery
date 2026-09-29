import json
import uuid
import frappe
from frappe.tests.utils import FrappeTestCase
from omniquery.api.sync import sync_draft, batch_push, resolve_surveyor, resolve_respondent


def run_test():
	frappe.set_user("Administrator")
	print("\n=== STARTING OMNIQUERY LIFECYCLE VERIFICATION ===")

	# 1. Test Surveyor Resolution
	surv = resolve_surveyor("Administrator")
	assert surv.startswith("SURV-"), f"Expected SURV-* surveyor, got {surv}"
	print(f"✓ Surveyor resolved: {surv}")

	# 2. Test Respondent Resolution (no extra table bloat, returns None if not registered)
	assert resolve_respondent("Respondent") is None, "Expected None for generic placeholder"
	assert resolve_respondent("NonExistentPerson") is None, "Expected None for unregistered text"
	print("✓ Respondent resolution verified: returns None safely without database bloat")

	# 3. Get an active template
	template = frappe.db.get_value("OmniQuery Template", {}, "name")
	if not template:
		print("No template found, skipping sync_draft template test")
		return
	print(f"✓ Active template found: {template}")

	# 4. Generate Survey ID with OQS-{surveyID}-{randomstring}
	clean_tmpl = template.replace("OQS-", "")
	rand_str = uuid.uuid4().hex[:6]
	survey_id = f"OQS-{clean_tmpl}-{rand_str}"
	print(f"✓ Generated Survey ID: {survey_id}")

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
	print(f"✓ sync_draft result: {draft_result}")
	assert draft_result.get("status") == "SUCCESS", f"Draft save failed: {draft_result}"
	doc_name = draft_result.get("doc_name")
	assert doc_name == survey_id, f"Expected doc_name to match {survey_id}, got {doc_name}"

	resp_doc = frappe.get_doc("OmniQuery Response", doc_name)
	assert resp_doc.name == survey_id, f"Expected doc.name == {survey_id}, got {resp_doc.name}"
	assert resp_doc.survey_status == "Draft", f"Expected Draft, got {resp_doc.survey_status}"
	assert len(resp_doc.items) == 2, f"Expected 2 items, got {len(resp_doc.items)}"
	print(f"✓ Draft record verified in MariaDB: {doc_name} with status=Draft, items={len(resp_doc.items)}")

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
	print(f"✓ batch_push result: {push_result}")
	assert push_result["results"][0]["status"] == "SUCCESS", f"Push failed: {push_result}"
	assert push_result["results"][0]["doc_name"] == survey_id

	resp_doc.reload()
	assert resp_doc.survey_status == "Submitted", f"Expected Submitted, got {resp_doc.survey_status}"
	print(f"✓ Draft successfully promoted to Submitted with exact ID {doc_name}")

	# Clean up test doc
	frappe.delete_doc("OmniQuery Response", doc_name, force=True)
	audit_name = frappe.db.get_value("OmniQuery Sync Audit Log", {"idempotency_key": survey_id}, "name")
	if audit_name:
		frappe.delete_doc("OmniQuery Sync Audit Log", audit_name, force=True)

	print("\n=== ALL LIFECYCLE TESTS PASSED PERFECTLY ===")
