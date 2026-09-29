import hashlib
import json
import uuid

import frappe
from frappe import _
from frappe.utils import now_datetime

from .survey import resolve_template_name, user_has_template_permission


def resolve_surveyor(user_or_name=None):
	"""
	Safely resolves an OmniQuery Surveyor document name.
	Guaranteed to return an existing record name in `tabOmniQuery Surveyor`
	so Link field validation never throws an error.
	"""
	if not user_or_name:
		user_or_name = frappe.session.user or "Administrator"

	user_str = str(user_or_name).strip()

	# 1. Exact match on OmniQuery Surveyor name
	if frappe.db.exists("OmniQuery Surveyor", user_str):
		return user_str

	# 2. Check formatted as format:SURV-{surveyor_name}
	if frappe.db.exists("OmniQuery Surveyor", f"SURV-{user_str}"):
		return f"SURV-{user_str}"

	# 3. Match by user field
	surveyor = frappe.db.get_value("OmniQuery Surveyor", {"user": user_str}, "name")
	if surveyor:
		return surveyor

	# 4. Match by surveyor_name field
	surveyor = frappe.db.get_value("OmniQuery Surveyor", {"surveyor_name": user_str}, "name")
	if surveyor:
		return surveyor

	# 5. Any active surveyor as fallback
	active = frappe.db.get_value("OmniQuery Surveyor", {"status": "Active"}, "name")
	if active:
		return active

	# 6. Any surveyor at all
	any_surv = frappe.db.get_value("OmniQuery Surveyor", {}, "name")
	if any_surv:
		return any_surv

	# 7. Auto-provision if none exists
	try:
		user_name = user_str if frappe.db.exists("User", user_str) else "Administrator"
		doc = frappe.get_doc({
			"doctype": "OmniQuery Surveyor",
			"surveyor_name": user_str if user_str != "Guest" else "Administrator",
			"user": user_name,
			"status": "Active",
		})
		doc.insert(ignore_permissions=True)
		return doc.name
	except Exception as e:
		frappe.log_error(f"Auto-create surveyor error for {user_str}", str(e))
		fallback = frappe.db.get_value("OmniQuery Surveyor", {}, "name")
		return fallback or "SURV-Administrator"


def resolve_respondent(val):
	"""
	Safely resolves or creates an OmniQuery Respondent document name.
	Returns None if val is empty or generic placeholder, so Link field validation
	is omitted cleanly without error.
	"""
	if not val or not str(val).strip():
		return None

	val_str = str(val).strip()
	if val_str.lower() in ["none", "null", "respondent", "undefined", "n/a", "na"]:
		return None

	# 1. Exact match on OmniQuery Respondent name
	if frappe.db.exists("OmniQuery Respondent", val_str):
		return val_str

	# 2. Match by primary_name
	existing = frappe.db.get_value("OmniQuery Respondent", {"primary_name": val_str}, "name")
	if existing:
		return existing

	# 3. Auto-provision respondent record
	try:
		uid = f"resp-{uuid.uuid4().hex[:8]}"
		doc = frappe.get_doc({
			"doctype": "OmniQuery Respondent",
			"respondent_uid": uid,
			"primary_name": val_str,
			"respondent_type": "Individual",
		})
		doc.insert(ignore_permissions=True)
		return doc.name
	except Exception as e:
		frappe.log_error(f"Auto-create respondent error for {val_str}", str(e))
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
	In-Flight Live Draft Sync Handler.
	Accepts partial survey progress, upserting OmniQuery Response in 'Draft' status
	without requiring mandatory question validation.
	Enables real-time supervisor monitoring and prevents field data loss.
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

		if isinstance(raw_data, str):
			try:
				data = json.loads(raw_data)
			except Exception:
				frappe.throw(_("Invalid JSON payload"), frappe.ValidationError)
		elif isinstance(raw_data, dict):
			data = raw_data
		else:
			frappe.throw(_("No data provided"), frappe.ValidationError)

	sub = data.get("draft") if isinstance(data, dict) and "draft" in data else data
	if not isinstance(sub, dict):
		frappe.throw(_("Draft payload must be a JSON object"), frappe.ValidationError)

	idempotency_key = sub.get("idempotency_key")
	if not idempotency_key:
		frappe.throw(_("Missing mandatory idempotency_key"), frappe.ValidationError)

	current_user = frappe.session.user
	template_name = resolve_template_name(sub.get("survey_template"))

	# Verify permission
	if not user_has_template_permission(template_name, current_user):
		return {
			"status": "REJECTED",
			"error": f"Access denied: No permission for template '{template_name}'",
		}

	# Check if Response document exists
	existing_resp_name = frappe.db.get_value(
		"OmniQuery Response",
		{"idempotency_key": idempotency_key},
		"name",
	)

	surveyor_link = resolve_surveyor(sub.get("surveyor") or current_user)
	respondent_link = resolve_respondent(sub.get("respondent") or sub.get("entrepreneur"))
	raw_payload_str = json.dumps(sub, separators=(",", ":"))

	if existing_resp_name:
		resp_doc = frappe.get_doc("OmniQuery Response", existing_resp_name)
		if resp_doc.survey_status != "Draft":
			return {
				"status": "ALREADY_SUBMITTED",
				"doc_name": resp_doc.name,
				"survey_status": resp_doc.survey_status,
			}

		resp_doc.template_version = sub.get("template_version") or resp_doc.template_version or 1
		if respondent_link:
			resp_doc.respondent = respondent_link
		if surveyor_link:
			resp_doc.surveyor = surveyor_link
		resp_doc.gps_latitude = sub.get("gps_latitude") or resp_doc.gps_latitude
		resp_doc.gps_longitude = sub.get("gps_longitude") or resp_doc.gps_longitude
		resp_doc.gps_accuracy = sub.get("gps_accuracy") or resp_doc.gps_accuracy
		resp_doc.synced_at = now_datetime()
		resp_doc.response_payload = raw_payload_str

		resp_doc.set("items", [])
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

		resp_doc.save(ignore_permissions=True)
		frappe.db.commit()
		return {
			"status": "SUCCESS",
			"doc_name": resp_doc.name,
			"survey_status": "Draft",
			"synced_at": str(resp_doc.synced_at),
		}
	else:
		resp_doc = frappe.new_doc("OmniQuery Response")
		resp_doc.idempotency_key = idempotency_key
		resp_doc.survey_template = template_name
		resp_doc.template_version = sub.get("template_version") or 1
		resp_doc.respondent = respondent_link
		resp_doc.surveyor = surveyor_link
		resp_doc.survey_status = "Draft"
		resp_doc.gps_latitude = sub.get("gps_latitude")
		resp_doc.gps_longitude = sub.get("gps_longitude")
		resp_doc.gps_accuracy = sub.get("gps_accuracy")
		resp_doc.captured_at_local = sub.get("captured_at_local") or now_datetime()
		resp_doc.synced_at = now_datetime()
		resp_doc.response_payload = raw_payload_str

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

		resp_doc.insert(ignore_permissions=True)
		frappe.db.commit()
		return {
			"status": "SUCCESS",
			"doc_name": resp_doc.name,
			"survey_status": "Draft",
			"synced_at": str(resp_doc.synced_at),
		}


@frappe.whitelist(allow_guest=True)
def batch_push(submissions=None):
	"""
	Zero-Loss Idempotent Sync Handler.
	Accepts a JSON payload with a list of submissions from the offline PWA.
	Enforces atomic MariaDB transaction savepoints, UUIDv4 deduplication,
	and safe promotion of in-flight Drafts to Submitted status.
	"""
	if submissions is None:
		data = None
		if hasattr(frappe.local, "request") and frappe.local.request:
			try:
				data = frappe.request.get_data(as_text=True)
			except Exception:
				pass
		if not data and hasattr(frappe.local, "form_dict") and frappe.local.form_dict:
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
	client_ip = getattr(frappe.local, "request_ip", "127.0.0.1")
	current_user = frappe.session.user

	for sub in submissions:
		idempotency_key = sub.get("idempotency_key")
		if not idempotency_key:
			results.append({"status": "REJECTED", "error": "Missing mandatory idempotency_key (UUIDv4)"})
			continue

		# 1. Check Idempotency & Existing Response
		existing_resp = frappe.db.get_value(
			"OmniQuery Response",
			{"idempotency_key": idempotency_key},
			["name", "survey_status"],
			as_dict=True,
		)

		if existing_resp and existing_resp.survey_status in ["Submitted", "Supervisor Verified", "Audit Flagged", "Approved"]:
			results.append(
				{
					"idempotency_key": idempotency_key,
					"status": "DUPLICATE_SKIPPED",
					"doc_name": existing_resp.name,
					"message": "Submission already processed safely.",
				}
			)
			continue

		existing_audit = frappe.db.get_value(
			"OmniQuery Sync Audit Log",
			{"idempotency_key": idempotency_key},
			["name", "survey_response", "sync_status"],
			as_dict=True,
		)

		if existing_audit and existing_audit.sync_status == "SUCCESS" and (not existing_resp or existing_resp.survey_status != "Draft"):
			results.append(
				{
					"idempotency_key": idempotency_key,
					"status": "DUPLICATE_SKIPPED",
					"doc_name": existing_audit.survey_response,
					"message": "Submission already processed safely.",
				}
			)
			continue

		# 1.5 Verify Survey Template Permission
		template_name = resolve_template_name(sub.get("survey_template"))
		if not user_has_template_permission(template_name, current_user):
			results.append(
				{
					"idempotency_key": idempotency_key,
					"status": "REJECTED",
					"error": f"Access denied: No permission to submit responses for template '{template_name}'",
				}
			)
			continue

		# 2. Atomic Ingestion / Promotion
		savepoint = f"sp_sync_{idempotency_key.replace('-', '_')}"
		try:
			frappe.db.savepoint(savepoint)

			surveyor_link = resolve_surveyor(sub.get("surveyor") or current_user)
			respondent_link = resolve_respondent(sub.get("respondent") or sub.get("entrepreneur"))
			raw_payload_str = json.dumps(sub, separators=(",", ":"))
			payload_hash = hashlib.sha256(raw_payload_str.encode("utf-8")).hexdigest()

			if existing_resp and existing_resp.survey_status == "Draft":
				resp_doc = frappe.get_doc("OmniQuery Response", existing_resp.name)
				resp_doc.template_version = sub.get("template_version") or resp_doc.template_version or 1
				resp_doc.respondent = respondent_link
				resp_doc.surveyor = surveyor_link
				resp_doc.survey_status = "Submitted"
				resp_doc.gps_latitude = sub.get("gps_latitude") or resp_doc.gps_latitude
				resp_doc.gps_longitude = sub.get("gps_longitude") or resp_doc.gps_longitude
				resp_doc.gps_accuracy = sub.get("gps_accuracy") or resp_doc.gps_accuracy
				resp_doc.captured_at_local = sub.get("captured_at_local") or resp_doc.captured_at_local or now_datetime()
				resp_doc.synced_at = now_datetime()
				resp_doc.response_payload = raw_payload_str

				resp_doc.set("items", [])
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

				resp_doc.save(ignore_permissions=True)
			else:
				resp_doc = frappe.new_doc("OmniQuery Response")
				resp_doc.idempotency_key = idempotency_key
				resp_doc.survey_template = template_name
				resp_doc.template_version = sub.get("template_version") or 1
				resp_doc.respondent = respondent_link
				resp_doc.surveyor = surveyor_link
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

				resp_doc.insert(ignore_permissions=True)

			map_to_native_survey(sub)

			# Create or update Sync Audit Log
			if existing_audit:
				audit = frappe.get_doc("OmniQuery Sync Audit Log", existing_audit.name)
				audit.survey_response = resp_doc.name
				audit.surveyor = resp_doc.surveyor
				audit.sync_status = "SUCCESS"
				audit.client_ip = client_ip
				audit.payload_hash_sha256 = payload_hash
				audit.processed_at = now_datetime()
				audit.error_message = None
				audit.save(ignore_permissions=True)
			else:
				audit = frappe.new_doc("OmniQuery Sync Audit Log")
				audit.idempotency_key = idempotency_key
				audit.survey_response = resp_doc.name
				audit.surveyor = resp_doc.surveyor
				audit.sync_status = "SUCCESS"
				audit.client_ip = client_ip
				audit.payload_hash_sha256 = payload_hash
				audit.processed_at = now_datetime()
				audit.insert(ignore_permissions=True)

			results.append(
				{
					"idempotency_key": idempotency_key,
					"status": "SUCCESS",
					"doc_name": resp_doc.name,
					"synced_at": str(resp_doc.synced_at),
				}
			)
		except Exception as e:
			frappe.db.rollback(save_point=savepoint)
			frappe.log_error(f"OmniQuery Sync Error for {idempotency_key}", str(e))

			# Log Failure Audit
			try:
				if existing_audit:
					fail_audit = frappe.get_doc("OmniQuery Sync Audit Log", existing_audit.name)
					fail_audit.sync_status = "FAILED"
					fail_audit.client_ip = client_ip
					fail_audit.error_message = str(e)[:140]
					fail_audit.processed_at = now_datetime()
					fail_audit.save(ignore_permissions=True)
				else:
					fail_audit = frappe.new_doc("OmniQuery Sync Audit Log")
					fail_audit.idempotency_key = idempotency_key
					fail_audit.sync_status = "FAILED"
					fail_audit.client_ip = client_ip
					fail_audit.error_message = str(e)[:140]
					fail_audit.processed_at = now_datetime()
					fail_audit.insert(ignore_permissions=True)
			except Exception:
				pass

			results.append({"idempotency_key": idempotency_key, "status": "FAILED", "error": str(e)})

	frappe.db.commit()
	return {"results": results}
