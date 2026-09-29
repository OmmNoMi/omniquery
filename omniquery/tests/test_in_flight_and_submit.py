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

	# 2. Test Respondent Resolution
	assert resolve_respondent("Respondent") is None, "Expected None for generic placeholder"
	resp_name = resolve_respondent("Sita Devi")
	assert resp_name and resp_name.startswith("RESP-"), f"Expected RESP-*, got {resp_name}"
	print(f"✓ Respondent resolved: {resp_name}")

	# 3. Get an active template
	template = frappe.db.get_value("OmniQuery Template", {}, "name")
	if not template:
		print("No template found, skipping sync_draft template test")
		return
	print(f"✓ Active template found: {template}")

	# 4. Test In-Flight Live Draft Sync
	draft_id = f"OQ-TEST-{uuid.uuid4().hex[:10]}"
	draft_payload = {
		"idempotency_key": draft_id,
		"survey_template": template,
		"template_version": 1,
		"respondent": "Sita Devi",
		"surveyor": "Administrator",
		"items": [
			{"question_code": "entrepreneur_name", "value": "Sita Devi"},
			{"question_code": "district", "value": "Jaipur"}
		]
	}

	draft_result = sync_draft(data={"draft": draft_payload})
	print(f"✓ sync_draft result: {draft_result}")
	assert draft_result.get("status") == "SUCCESS", f"Draft save failed: {draft_result}"
	doc_name = draft_result.get("doc_name")
	assert doc_name, "No doc_name returned"

	resp_doc = frappe.get_doc("OmniQuery Response", doc_name)
	assert resp_doc.survey_status == "Draft", f"Expected Draft, got {resp_doc.survey_status}"
	assert len(resp_doc.items) == 2, f"Expected 2 items, got {len(resp_doc.items)}"
	print(f"✓ Draft record verified in MariaDB: {doc_name} with status={resp_doc.survey_status}, items={len(resp_doc.items)}")

	# 5. Test Draft Partial Update (adding another item)
	draft_payload["items"].append({"question_code": "village", "value": "Amer"})
	update_result = sync_draft(data={"draft": draft_payload})
	assert update_result.get("status") == "SUCCESS"
	resp_doc.reload()
	assert len(resp_doc.items) == 3, f"Expected 3 items after update, got {len(resp_doc.items)}"
	print(f"✓ Draft partial update verified: {len(resp_doc.items)} items in {doc_name}")

	# 6. Test Form Submission Promotion (batch_push promotes Draft to Submitted)
	sub_payload = {
		"idempotency_key": draft_id,
		"survey_template": template,
		"template_version": 1,
		"respondent": "Sita Devi",
		"surveyor": "Administrator",
		"items": draft_payload["items"]
	}

	push_result = batch_push(submissions=[sub_payload])
	print(f"✓ batch_push result: {push_result}")
	assert push_result["results"][0]["status"] == "SUCCESS", f"Push failed: {push_result}"

	resp_doc.reload()
	assert resp_doc.survey_status == "Submitted", f"Expected Submitted, got {resp_doc.survey_status}"
	print(f"✓ Draft successfully promoted to Submitted: status={resp_doc.survey_status}")

	# 7. Test Idempotent Duplicate Skipped
	dup_result = batch_push(submissions=[sub_payload])
	assert dup_result["results"][0]["status"] == "DUPLICATE_SKIPPED"
	print(f"✓ Idempotency verified: duplicate submission safely skipped")

	# Clean up test doc
	frappe.delete_doc("OmniQuery Response", doc_name, force=True)
	audit_name = frappe.db.get_value("OmniQuery Sync Audit Log", {"idempotency_key": draft_id}, "name")
	if audit_name:
		frappe.delete_doc("OmniQuery Sync Audit Log", audit_name, force=True)

	print("\n=== ALL LIFECYCLE TESTS PASSED PERFECTLY ===")
