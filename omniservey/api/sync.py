import frappe, json, hashlib
from frappe import _
from frappe.utils import now_datetime
from omniservey.api.survey import user_has_template_permission

def resolve_surveyor(user):
	surveyor = frappe.db.get_value("OmniServey Surveyor", {"user": user}, "name")
	if not surveyor:
		surveyor = frappe.db.get_value("OmniServey Surveyor", {"surveyor_name": user}, "name")
	if not surveyor:
		surveyor = frappe.db.get_value("OmniServey Surveyor", {}, "name")
	return surveyor or "SURV-Administrator"

def set_field_value(doc, q, val):
	if not doc.meta.has_field(q) or val is None:
		return
	df = doc.meta.get_field(q)
	if df.fieldtype == "Table" and isinstance(val, list):
		for row in val:
			if isinstance(row, dict): doc.append(q, row)
	elif df.fieldtype == "Check":
		doc.set(q, 1 if val else 0)
	elif df.fieldtype in ["Int", "Float", "Currency"]:
		try: doc.set(q, float(val) if df.fieldtype != "Int" else int(val))
		except Exception: pass
	else:
		doc.set(q, ", ".join(str(v) for v in val) if isinstance(val, list) else str(val))

def map_to_native_survey(sub):
	tmpl = sub.get("survey_template") or ""
	if "SHG" not in tmpl and "Women Entrepreneur" not in tmpl:
		return None
	try:
		doc = frappe.new_doc("SHG Women Entrepreneur Survey")
		for item in sub.get("items", []):
			set_field_value(doc, item.get("question_code"), item.get("value"))
		doc.insert(ignore_permissions=True)
		return doc.name
	except Exception as e:
		frappe.log_error("Native survey sync map error", str(e))
		return None

@frappe.whitelist(allow_guest=True)
def batch_push():

	"""
	Zero-Loss Idempotent Sync Handler.
	Accepts a JSON payload with a list of submissions from the offline PWA.
	Enforces atomic MariaDB transaction savepoints and UUIDv4 deduplication.
	"""
	data = frappe.request.get_data(as_text=True)
	if not data:
		data = frappe.form_dict.get("data")
		
	if isinstance(data, str):
		try:
			payload = json.loads(data)
		except Exception:
			frappe.throw(_("Invalid JSON payload"), frappe.ValidationError)
	elif isinstance(data, dict):
		payload = data
	else:
		frappe.throw(_("No data provided"), frappe.ValidationError)
		
	submissions = payload.get("submissions", [])
	if isinstance(payload, list):
		submissions = payload
	elif not submissions and "idempotency_key" in payload:
		submissions = [payload]
		
	results = []
	client_ip = frappe.local.request_ip if hasattr(frappe.local, "request_ip") else "127.0.0.1"
	current_user = frappe.session.user
	
	# Resolve surveyor linked to current user safely
	surveyor_name = resolve_surveyor(current_user)
	
	for sub in submissions:
		idempotency_key = sub.get("idempotency_key")
		if not idempotency_key:
			results.append({
				"status": "REJECTED",
				"error": "Missing mandatory idempotency_key (UUIDv4)"
			})
			continue
			
		# 1. Check Idempotency Cache
		existing_audit = frappe.db.get_value(
			"OmniServey Sync Audit Log",
			{"idempotency_key": idempotency_key},
			["name", "survey_response", "sync_status"],
			as_dict=True
		)
		
		if existing_audit:
			results.append({
				"idempotency_key": idempotency_key,
				"status": "DUPLICATE_SKIPPED",
				"doc_name": existing_audit.survey_response,
				"message": "Submission already processed safely."
			})
			continue

		# 1.5 Verify Survey Template Permission
		template_name = sub.get("survey_template")
		if not user_has_template_permission(template_name, current_user):
			results.append({
				"idempotency_key": idempotency_key,
				"status": "REJECTED",
				"error": f"Access denied: No permission to submit responses for template '{template_name}'"
			})
			continue

		# 2. Atomic Ingestion
		savepoint = f"sp_sync_{idempotency_key.replace('-', '_')}"
		try:
			frappe.db.savepoint(savepoint)
			
			raw_payload_str = json.dumps(sub, separators=(",", ":"))
			payload_hash = hashlib.sha256(raw_payload_str.encode("utf-8")).hexdigest()
			
			resp_doc = frappe.new_doc("OmniServey Response")
			resp_doc.idempotency_key = idempotency_key
			resp_doc.survey_template = sub.get("survey_template")
			resp_doc.template_version = sub.get("template_version") or 1
			resp_doc.respondent = sub.get("respondent") or sub.get("entrepreneur")
			resp_doc.surveyor = sub.get("surveyor") or surveyor_name or current_user
			resp_doc.survey_status = "Submitted"
			resp_doc.gps_latitude = sub.get("gps_latitude")
			resp_doc.gps_longitude = sub.get("gps_longitude")
			resp_doc.gps_accuracy = sub.get("gps_accuracy")
			resp_doc.captured_at_local = sub.get("captured_at_local") or now_datetime()
			resp_doc.synced_at = now_datetime()
			resp_doc.response_payload = raw_payload_str
			
			# Unroll normalized items
			for item in sub.get("items", []):
				val_num = None
				val_raw = item.get("value")
				val_text = None
				val_json = None
				
				if isinstance(val_raw, (int, float)):
					val_num = float(val_raw)
					val_text = str(val_raw)
				elif isinstance(val_raw, (dict, list)):
					val_json = json.dumps(val_raw, separators=(",", ":"))
				elif val_raw is not None:
					val_text = str(val_raw)
					
				resp_doc.append("items", {
					"question_code": item.get("question_code"),
					"question_label": item.get("question_label"),
					"value_text": val_text,
					"value_numeric": val_num,
					"value_json": val_json,
					"attachment_file": item.get("attachment_file")
				})
				
			resp_doc.insert(ignore_permissions=True)
			map_to_native_survey(sub)
			
			# Create Sync Audit Log
			audit = frappe.new_doc("OmniServey Sync Audit Log")
			audit.idempotency_key = idempotency_key
			audit.survey_response = resp_doc.name
			audit.surveyor = resp_doc.surveyor
			audit.sync_status = "SUCCESS"
			audit.client_ip = client_ip
			audit.payload_hash_sha256 = payload_hash
			audit.processed_at = now_datetime()
			audit.insert(ignore_permissions=True)
			
			results.append({
				"idempotency_key": idempotency_key,
				"status": "SUCCESS",
				"doc_name": resp_doc.name,
				"synced_at": str(resp_doc.synced_at)
			})
		except Exception as e:
			frappe.db.rollback(save_point=savepoint)
			frappe.log_error(f"OmniServey Sync Error for {idempotency_key}", str(e))
			
			# Log Failure Audit
			try:
				fail_audit = frappe.new_doc("OmniServey Sync Audit Log")
				fail_audit.idempotency_key = idempotency_key
				fail_audit.sync_status = "FAILED"
				fail_audit.client_ip = client_ip
				fail_audit.error_message = str(e)[:140]
				fail_audit.processed_at = now_datetime()
				fail_audit.insert(ignore_permissions=True)
			except Exception:
				pass
				
			results.append({
				"idempotency_key": idempotency_key,
				"status": "FAILED",
				"error": str(e)
			})

			
	frappe.db.commit()
	return {"results": results}
