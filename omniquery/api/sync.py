import hashlib
import json
import uuid

import frappe
from frappe import _
from frappe.utils import now_datetime

from .survey import resolve_template_name, user_has_template_permission


def resolve_surveyor(user_or_name=None):
	"""Resolves linked OmniQuery Surveyor or defaults to SURV-Administrator."""
	user = str(user_or_name or frappe.session.user or "Administrator").strip()
	if frappe.db.exists("OmniQuery Surveyor", user):
		return user
	s = (
		frappe.db.get_value("OmniQuery Surveyor", {"user": user}, "name")
		or frappe.db.get_value("OmniQuery Surveyor", {"surveyor_name": user}, "name")
		or frappe.db.get_value("OmniQuery Surveyor", {"status": "Active"}, "name")
	)
	return s or "SURV-Administrator"


def resolve_respondent(val):
	"""Returns respondent docname only if it exists in OmniQuery Respondent, otherwise None."""
	if val and frappe.db.exists("OmniQuery Respondent", str(val).strip()):
		return str(val).strip()
	return None


def set_field_value(doc, q, val):
	if not doc.meta.has_field(q) or val is None:
		return
	df = doc.meta.get_field(q)
	if df.fieldtype == "Table" and isinstance(val, list):
		for row in val:
			if isinstance(row, dict):
				doc.append(q, row)
	elif df.fieldtype == "Check":
		doc.set(q, 1 if val else 0)
	elif df.fieldtype in ["Int", "Float", "Currency"]:
		try:
			doc.set(q, float(val) if df.fieldtype != "Int" else int(val))
		except Exception:
			pass
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
def sync_draft(data=None):
	"""
	Lightweight in-flight live draft save handler.
	Upserts OmniQuery Response in 'Draft' status with ID OQS-{surveyID}-{randomstring}.
	"""
	if data is None:
		raw_data = None
		if hasattr(frappe.local, "request") and frappe.local.request:
			try:
				raw_data = frappe.request.get_data(as_text=True)
			except Exception:
				pass
		if not raw_data and hasattr(frappe.local, "form_dict") and frappe.local.form_dict:
			raw_data = frappe.local.form_dict.get("data")
		data = json.loads(raw_data) if isinstance(raw_data, str) else (raw_data or {})

	sub = data.get("draft") if isinstance(data, dict) and "draft" in data else data
	if not isinstance(sub, dict):
		return {"status": "REJECTED", "error": "Invalid draft payload"}

	template_name = resolve_template_name(sub.get("survey_template"))
	idempotency_key = sub.get("idempotency_key")
	if not idempotency_key:
		clean_tmpl = (template_name or "SURVEY").replace("OQS-", "")
		idempotency_key = f"OQS-{clean_tmpl}-{uuid.uuid4().hex[:6]}"

	current_user = frappe.session.user
	doc_name = (
		frappe.db.get_value("OmniQuery Response", {"idempotency_key": idempotency_key}, "name")
		or (idempotency_key if frappe.db.exists("OmniQuery Response", idempotency_key) else None)
	)

	if doc_name:
		resp_doc = frappe.get_doc("OmniQuery Response", doc_name)
		if resp_doc.survey_status != "Draft":
			return {"status": "ALREADY_SUBMITTED", "doc_name": resp_doc.name}
	else:
		resp_doc = frappe.new_doc("OmniQuery Response")
		resp_doc.name = idempotency_key
		resp_doc.idempotency_key = idempotency_key
		resp_doc.survey_template = template_name
		resp_doc.survey_status = "Draft"
		resp_doc.surveyor = resolve_surveyor(sub.get("surveyor") or current_user)

	resp_doc.template_version = sub.get("template_version") or 1
	resp_doc.respondent = resolve_respondent(sub.get("respondent"))
	resp_doc.gps_latitude = sub.get("gps_latitude")
	resp_doc.gps_longitude = sub.get("gps_longitude")
	resp_doc.gps_accuracy = sub.get("gps_accuracy")
	resp_doc.captured_at_local = sub.get("captured_at_local") or now_datetime()
	resp_doc.synced_at = now_datetime()
	resp_doc.response_payload = json.dumps(sub, separators=(",", ":"))

	resp_doc.set("items", [])
	for item in sub.get("items", []):
		val_raw = item.get("value")
		val_num = float(val_raw) if isinstance(val_raw, (int, float)) else None
		val_text = str(val_raw) if val_raw is not None and not isinstance(val_raw, (dict, list)) else None
		val_json = json.dumps(val_raw) if isinstance(val_raw, (dict, list)) else None
		resp_doc.append(
			"items",
			{
				"question_code": item.get("question_code"),
				"question_label": item.get("question_label"),
				"value_text": val_text,
				"value_numeric": val_num,
				"value_json": val_json,
				"attachment_file": item.get("attachment_file"),
			},
		)

	if doc_name:
		resp_doc.save(ignore_permissions=True)
	else:
		resp_doc.insert(ignore_permissions=True)
	frappe.db.commit()

	return {"status": "SUCCESS", "doc_name": resp_doc.name, "survey_status": "Draft"}


@frappe.whitelist(allow_guest=True)
def batch_push(submissions=None):
	"""
	Lightweight Zero-Loss Sync Handler.
	Sets document name directly to OQS-{surveyID}-{randomstring}.
	"""
	if submissions is None:
		raw_data = None
		if hasattr(frappe.local, "request") and frappe.local.request:
			try:
				raw_data = frappe.request.get_data(as_text=True)
			except Exception:
				pass
		if not raw_data and hasattr(frappe.local, "form_dict") and frappe.local.form_dict:
			raw_data = frappe.local.form_dict.get("data")

		payload = json.loads(raw_data) if isinstance(raw_data, str) else (raw_data or {})
		submissions = payload.get("submissions", [])
		if isinstance(payload, list):
			submissions = payload
		elif not submissions and "idempotency_key" in payload:
			submissions = [payload]

	results = []
	client_ip = getattr(frappe.local, "request_ip", "127.0.0.1")
	current_user = frappe.session.user

	for sub in submissions:
		template_name = resolve_template_name(sub.get("survey_template"))
		idempotency_key = sub.get("idempotency_key")
		if not idempotency_key:
			clean_tmpl = (template_name or "SURVEY").replace("OQS-", "")
			idempotency_key = f"OQS-{clean_tmpl}-{uuid.uuid4().hex[:6]}"

		# Check existing document
		doc_name = (
			frappe.db.get_value("OmniQuery Response", {"idempotency_key": idempotency_key}, "name")
			or (idempotency_key if frappe.db.exists("OmniQuery Response", idempotency_key) else None)
		)

		if doc_name:
			existing_status = frappe.db.get_value("OmniQuery Response", doc_name, "survey_status")
			if existing_status in ["Submitted", "Supervisor Verified", "Audit Flagged", "Approved"]:
				results.append({
					"idempotency_key": idempotency_key,
					"status": "DUPLICATE_SKIPPED",
					"doc_name": doc_name,
				})
				continue

		savepoint = f"sp_sync_{idempotency_key.replace('-', '_')}"
		try:
			frappe.db.savepoint(savepoint)
			raw_payload_str = json.dumps(sub, separators=(",", ":"))
			payload_hash = hashlib.sha256(raw_payload_str.encode("utf-8")).hexdigest()

			if doc_name:
				resp_doc = frappe.get_doc("OmniQuery Response", doc_name)
			else:
				resp_doc = frappe.new_doc("OmniQuery Response")
				resp_doc.name = idempotency_key
				resp_doc.idempotency_key = idempotency_key
				resp_doc.survey_template = template_name

			resp_doc.template_version = sub.get("template_version") or 1
			resp_doc.survey_status = "Submitted"
			resp_doc.surveyor = resolve_surveyor(sub.get("surveyor") or current_user)
			resp_doc.respondent = resolve_respondent(sub.get("respondent"))
			resp_doc.gps_latitude = sub.get("gps_latitude")
			resp_doc.gps_longitude = sub.get("gps_longitude")
			resp_doc.gps_accuracy = sub.get("gps_accuracy")
			resp_doc.captured_at_local = sub.get("captured_at_local") or now_datetime()
			resp_doc.synced_at = now_datetime()
			resp_doc.response_payload = raw_payload_str

			resp_doc.set("items", [])
			for item in sub.get("items", []):
				val_raw = item.get("value")
				val_num = float(val_raw) if isinstance(val_raw, (int, float)) else None
				val_text = str(val_raw) if val_raw is not None and not isinstance(val_raw, (dict, list)) else None
				val_json = json.dumps(val_raw) if isinstance(val_raw, (dict, list)) else None
				resp_doc.append(
					"items",
					{
						"question_code": item.get("question_code"),
						"question_label": item.get("question_label"),
						"value_text": val_text,
						"value_numeric": val_num,
						"value_json": val_json,
						"attachment_file": item.get("attachment_file"),
					},
				)

			if doc_name:
				resp_doc.save(ignore_permissions=True)
			else:
				resp_doc.insert(ignore_permissions=True)

			map_to_native_survey(sub)

			# Record Audit
			existing_audit = frappe.db.get_value(
				"OmniQuery Sync Audit Log", {"idempotency_key": idempotency_key}, "name"
			)
			if existing_audit:
				audit = frappe.get_doc("OmniQuery Sync Audit Log", existing_audit)
			else:
				audit = frappe.new_doc("OmniQuery Sync Audit Log")
				audit.idempotency_key = idempotency_key

			audit.survey_response = resp_doc.name
			audit.surveyor = resp_doc.surveyor
			audit.sync_status = "SUCCESS"
			audit.client_ip = client_ip
			audit.payload_hash_sha256 = payload_hash
			audit.processed_at = now_datetime()
			audit.error_message = None
			if existing_audit:
				audit.save(ignore_permissions=True)
			else:
				audit.insert(ignore_permissions=True)

			results.append({
				"idempotency_key": idempotency_key,
				"status": "SUCCESS",
				"doc_name": resp_doc.name,
				"synced_at": str(resp_doc.synced_at),
			})
		except Exception as e:
			frappe.db.rollback(save_point=savepoint)
			frappe.log_error(f"OmniQuery Sync Error for {idempotency_key}", str(e))
			results.append({"idempotency_key": idempotency_key, "status": "FAILED", "error": str(e)})

	frappe.db.commit()
	return {"results": results}
