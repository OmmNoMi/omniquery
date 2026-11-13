import hashlib
import json
import uuid

import frappe
from frappe import _
from frappe.utils import (
	cint,
	flt,
	get_datetime,
	now_datetime,
)
from frappe.utils.data import convert_utc_to_system_timezone

from .survey import resolve_template_name, user_has_template_permission


def parse_local_datetime(val):
	"""Return `val` as a system-timezone "YYYY-MM-DD HH:MM:SS" string.

	The field app sends `new Date().toISOString()` (UTC, ending in "Z"), so values
	with an offset are converted to the site's timezone. A missing value means
	"captured now". A value that cannot be read returns None: the caller still
	saves the answers, leaves captured_at_local empty and logs the raw value,
	instead of inventing a time or rejecting the whole response.
	"""
	if isinstance(val, str):
		val = val.strip()
	if not val:
		return now_datetime().strftime("%Y-%m-%d %H:%M:%S")
	try:
		dt = get_datetime(val)
	except (ValueError, OverflowError, TypeError):
		dt = None
	if dt and dt.tzinfo:
		dt = convert_utc_to_system_timezone(dt)
	return dt.strftime("%Y-%m-%d %H:%M:%S") if dt else None


def log_invalid_captured_at(idempotency_key, raw_value):
	"""Record an unreadable captured_at_local against the response it belongs to.

	Safe inside the batch_push savepoint: Frappe stores Error Log as MyISAM, so a
	rollback of the response never removes this entry.
	"""
	frappe.log_error(
		title="OmniQuery: invalid captured_at_local",
		message=f"Saved the answers with captured_at_local empty. Received: {raw_value!r}",
		reference_doctype="OmniQuery Response",
		reference_name=idempotency_key,
	)


def log_raw_ingestion_dump(endpoint, raw_payload, client_ip=None, surveyor=None):
	"""
	Appends the raw unadulterated payload to a durable JSONL dump file on the server.
	This is completely decoupled from MariaDB transactions and will never fail.
	"""
	try:
		import os
		from frappe.utils import now
		log_dir = frappe.get_site_path("logs")
		os.makedirs(log_dir, exist_ok=True)
		dump_file = os.path.join(log_dir, "omniquery_payloads_dump.jsonl")
		payload_str = raw_payload if isinstance(raw_payload, str) else frappe.as_json(raw_payload)
		record = {
			"timestamp": now(),
			"endpoint": endpoint,
			"client_ip": client_ip or getattr(frappe.local, "request_ip", "127.0.0.1"),
			"surveyor": surveyor or frappe.session.user,
			"payload": payload_str,
		}
		with open(dump_file, "a", encoding="utf-8") as f:
			f.write(json.dumps(record, ensure_ascii=False) + "\n")
	except Exception:
		pass


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
	if s:
		return s
	try:
		doc = frappe.get_doc({
			"doctype": "OmniQuery Surveyor",
			"surveyor_name": user.split("@")[0] if "@" in user else user,
			"user": user if frappe.db.exists("User", user) else "Administrator",
			"status": "Active",
		})
		doc.insert(ignore_permissions=True)
		return doc.name
	except Exception:
		return "SURV-Administrator"


def resolve_respondent(val):
	"""Returns respondent docname only if it exists in OmniQuery Respondent, otherwise None."""
	if not val:
		return None
	val_str = str(val).strip()
	if frappe.db.exists("OmniQuery Respondent", val_str):
		return val_str
	matched = frappe.db.get_value("OmniQuery Respondent", {"primary_name": val_str}, "name")
	if matched:
		return matched
	return None


def sanitize_value_text(val_raw):
	if val_raw is None or isinstance(val_raw, (dict, list)):
		return None
	import re
	cleaned = re.sub(r"<script.*?>.*?</script>", "", str(val_raw), flags=re.IGNORECASE | re.DOTALL)
	cleaned = re.sub(r"<style.*?>.*?</style>", "", cleaned, flags=re.IGNORECASE | re.DOTALL)
	return frappe.utils.strip_html(cleaned)


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


def calculate_haversine_distance(lat1, lon1, lat2, lon2):
	"""Calculates distance between two GPS coordinates in meters using Haversine formula."""
	import math
	try:
		lat1, lon1, lat2, lon2 = map(float, [lat1, lon1, lat2, lon2])
		R = 6371000  # Radius of Earth in meters
		phi1, phi2 = math.radians(lat1), math.radians(lat2)
		delta_phi = math.radians(lat2 - lat1)
		delta_lambda = math.radians(lon2 - lon1)

		a = (
			math.sin(delta_phi / 2.0) ** 2
			+ math.cos(phi1) * math.cos(phi2) * math.sin(delta_lambda / 2.0) ** 2
		)
		c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
		return round(R * c, 1)
	except Exception:
		return None


def process_automated_audit(resp_doc, raw_sub):
	"""
	Analyzes field survey telemetry and records quality signals directly onto OmniQuery Response.
	Detects:
	1. Speedrunning: Total time spent < (question_count * speed_threshold_sec_per_question).
	2. GPS Variance: Distance from respondent or project centroid > gps_distance_threshold_m.

	Does NOT forge human Supervisor Audit records. Real Supervisor Audits must only be created
	by authorized human supervisors during review workflows.
	"""
	try:
		if not resp_doc or not resp_doc.name:
			return None

		items_count = len(resp_doc.items or [])
		time_spent_seconds = None

		# Calculate time spent if timing metadata is available
		if raw_sub.get("time_spent_seconds"):
			time_spent_seconds = int(raw_sub.get("time_spent_seconds"))
		elif resp_doc.captured_at_local and resp_doc.creation:
			t_local = get_datetime(resp_doc.captured_at_local)
			t_sync = get_datetime(resp_doc.synced_at or now_datetime())
			diff = abs((t_sync - t_local).total_seconds())
			# If local and sync happened within same hour, diff can approximate duration
			if 5 <= diff <= 14400:
				time_spent_seconds = int(diff)

		# GPS Variance Check
		gps_variance_m = None
		lat = resp_doc.gps_latitude
		lon = resp_doc.gps_longitude
		if lat and lon and resp_doc.respondent:
			resp_geo = frappe.db.get_value(
				"OmniQuery Respondent", resp_doc.respondent, ["gps_latitude", "gps_longitude"], as_dict=True
			)
			if resp_geo and resp_geo.gps_latitude and resp_geo.gps_longitude:
				gps_variance_m = calculate_haversine_distance(
					lat, lon, resp_geo.gps_latitude, resp_geo.gps_longitude
				)

		# Retrieve configurable thresholds from OmniQuery Settings
		speed_threshold_sec = 3
		min_questions = 5
		gps_threshold_m = 5000.0
		try:
			settings = frappe.get_cached_doc("OmniQuery Settings")
			if hasattr(settings, "speed_threshold_sec_per_question") and settings.speed_threshold_sec_per_question:
				speed_threshold_sec = int(settings.speed_threshold_sec_per_question)
			if hasattr(settings, "min_questions_for_speed_check") and settings.min_questions_for_speed_check:
				min_questions = int(settings.min_questions_for_speed_check)
			if hasattr(settings, "gps_distance_threshold_m") and settings.gps_distance_threshold_m:
				gps_threshold_m = float(settings.gps_distance_threshold_m)
		except Exception:
			pass

		# Evaluate Outlier Invariants
		is_outlier = 0
		remarks = []

		# Speedrun check: < speed_threshold_sec per question (min min_questions questions)
		if items_count >= min_questions and time_spent_seconds is not None:
			min_expected_sec = items_count * speed_threshold_sec
			if time_spent_seconds < min_expected_sec:
				is_outlier = 1
				remarks.append(f"Speedrun detected: {time_spent_seconds}s for {items_count} questions (min threshold: {min_expected_sec}s)")

		# GPS Outlier check: > gps_threshold_m from centroid
		if gps_variance_m is not None and gps_variance_m > gps_threshold_m:
			is_outlier = 1
			remarks.append(f"GPS variance high: {gps_variance_m}m from respondent centroid (>{gps_threshold_m}m)")

		outlier_reasons_str = "; ".join(remarks) if remarks else None

		# Store telemetry signals directly on OmniQuery Response
		updates = {
			"time_spent_seconds": int(time_spent_seconds or 0),
			"gps_distance_variance_meters": flt(gps_variance_m) if gps_variance_m is not None else 0.0,
			"is_outlier_flagged": is_outlier,
			"outlier_reasons": outlier_reasons_str,
		}

		if is_outlier and resp_doc.survey_status != "Approved":
			updates["survey_status"] = "Audit Flagged"

		frappe.db.set_value("OmniQuery Response", resp_doc.name, updates)
		frappe.db.commit()

		# Update resp_doc in-memory attributes
		resp_doc.time_spent_seconds = updates["time_spent_seconds"]
		resp_doc.gps_distance_variance_meters = updates["gps_distance_variance_meters"]
		resp_doc.is_outlier_flagged = updates["is_outlier_flagged"]
		resp_doc.outlier_reasons = updates["outlier_reasons"]
		if "survey_status" in updates:
			resp_doc.survey_status = updates["survey_status"]

		return None
	except Exception as e:
		frappe.log_error("Process automated audit error", frappe.get_traceback())
		return None


@frappe.whitelist(allow_guest=True)
def sync_draft(data=None):
	"""
	Lightweight in-flight live draft save handler.
	Upserts OmniQuery Response in 'Draft' status with ID OQS-{surveyID}-{randomstring}.
	"""
	raw_data = None
	if data is None:
		if hasattr(frappe.local, "request") and frappe.local.request:
			try:
				raw_data = frappe.request.get_data(as_text=True)
			except Exception:
				pass
		if not raw_data and hasattr(frappe.local, "form_dict") and frappe.local.form_dict:
			raw_data = frappe.local.form_dict.get("data")
		data = frappe.parse_json(raw_data) if isinstance(raw_data, str) else (raw_data or {})

	log_raw_ingestion_dump("sync_draft", raw_data or data, client_ip=getattr(frappe.local, "request_ip", "127.0.0.1"), surveyor=frappe.session.user)

	sub = data.get("draft") if isinstance(data, dict) and "draft" in data else data
	if not isinstance(sub, dict):
		return {"status": "REJECTED", "error": "Invalid draft payload"}

	template_name = resolve_template_name(sub.get("survey_template"))
	idempotency_key = sub.get("idempotency_key")
	if not idempotency_key:
		clean_tmpl = (template_name or "SURVEY").replace("OQS-", "")
		idempotency_key = f"OQS-{clean_tmpl}-{uuid.uuid4().hex[:6]}"

	current_user = frappe.session.user

	# Security: Strict template RBAC validation
	if not user_has_template_permission(template_name, user=current_user):
		err_msg = "Guest access not permitted for private survey template" if current_user == "Guest" else f"Permission denied for template {template_name}"
		return {"status": "REJECTED", "error": err_msg}

	doc_name = (
		frappe.db.get_value("OmniQuery Response", {"idempotency_key": idempotency_key}, "name")
		or (idempotency_key if frappe.db.exists("OmniQuery Response", idempotency_key) else None)
	)

	user_roles = set(frappe.get_roles(current_user))
	is_admin_or_mgr = "System Manager" in user_roles or "Administrator" in user_roles or current_user == "Administrator"

	if doc_name:
		existing_owner = frappe.db.get_value("OmniQuery Response", doc_name, "owner")
		if existing_owner and existing_owner != current_user and not is_admin_or_mgr:
			return {"status": "REJECTED", "error": "Unauthorized attempt to overwrite existing response owned by another user"}

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
	resp_doc.captured_at_local = parse_local_datetime(sub.get("captured_at_local"))
	resp_doc.synced_at = now_datetime()
	resp_doc.response_payload = frappe.as_json(sub)

	resp_doc.set("items", [])
	for item in sub.get("items", []):
		val_raw = item.get("value")
		val_num = flt(val_raw) if isinstance(val_raw, (int, float)) else None
		# Security: Strip HTML and script tags to eliminate stored XSS in Desk reports and print views
		val_text = sanitize_value_text(val_raw)
		val_json = frappe.as_json(val_raw) if isinstance(val_raw, (dict, list)) else None
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


def normalize_submission_payload(sub):
	"""Map a legacy offline WAL entry {template_name, responses, saved_at, gps_coordinates} onto the
	canonical batch_push fields. A canonical field the client already sent always wins. A non-dict gives {}."""
	if not isinstance(sub, dict):
		return {}
	gps = sub["gps_coordinates"] if isinstance(sub.get("gps_coordinates"), dict) else {}
	legacy = {
		"survey_template": sub.get("template_name"),
		"items": legacy_items(sub.get("responses")),
		"captured_at_local": sub.get("saved_at"),
		"gps_latitude": first_present(gps, "latitude", "lat"),
		"gps_longitude": first_present(gps, "longitude", "lng", "lon"),
		"gps_accuracy": gps.get("accuracy"),
	}
	return {**sub, **{k: v for k, v in legacy.items() if v is not None and sub.get(k) in (None, "", [])}}


def legacy_items(responses):
	"""Legacy WAL entries stored answers as {question_code: value}; a list is already item-shaped."""
	if isinstance(responses, dict):
		return [{"question_code": str(k), "value": v} for k, v in responses.items()]
	return responses if isinstance(responses, list) else None


def first_present(values, *keys):
	"""The first of keys that is set, so a 0 coordinate is kept rather than skipped as falsy."""
	return next((values[k] for k in keys if values.get(k) is not None), None)


def resolve_idempotency_key(sub, template_name, payload_hash):
	"""The client's key. Without one, a valid submission gets OQS-{template}-{random} as before, and an
	invalid one gets a key derived from its payload, so its retries share one audit log and error row."""
	if sub.get("idempotency_key"):
		return sub["idempotency_key"]
	if template_name:
		return f"OQS-{template_name.replace('OQS-', '')}-{uuid.uuid4().hex[:6]}"
	return f"OQS-INVALID-{payload_hash[:12]}"


def upsert_audit_log(idempotency_key, fields):
	"""Create or update the Sync Audit Log for a key and commit it. Returns its name; a failed
	write is logged, never raised, so one bad audit write does not stop the rest of the batch."""
	try:
		name = frappe.db.get_value("OmniQuery Sync Audit Log", {"idempotency_key": idempotency_key}, "name")
		audit = frappe.get_doc("OmniQuery Sync Audit Log", name) if name else frappe.new_doc("OmniQuery Sync Audit Log")
		audit.update({"idempotency_key": idempotency_key, "processed_at": now_datetime(), **fields})
		(audit.save if name else audit.insert)(ignore_permissions=True)
		frappe.db.commit()
		return audit.name
	except Exception:
		frappe.log_error(f"Sync Audit Log write failed for {idempotency_key}", frappe.get_traceback())


def log_field_error(idempotency_key, error_message, raw_payload_str, fields):
	"""Insert one Field Error Log per (idempotency key, error), so client retries do not add duplicates."""
	row = {"question_code": idempotency_key, "error_message": str(error_message)[:1000]}
	try:
		if frappe.db.exists("OmniQuery Field Error Log", row):
			return
		frappe.get_doc({"doctype": "OmniQuery Field Error Log", **row, **fields, "logged_at": now_datetime(),
			"device_info": raw_payload_str[:4000]}).insert(ignore_permissions=True)
		frappe.db.commit()
	except Exception:
		frappe.log_error(f"Field Error Log write failed for {idempotency_key}", frappe.get_traceback())


@frappe.whitelist(allow_guest=True)
def batch_push(submissions=None):
	"""
	Lightweight Zero-Loss Sync Handler.
	Sets document name directly to OQS-{surveyID}-{randomstring}.
	"""
	raw_data = None
	if submissions is None:
		if hasattr(frappe.local, "request") and frappe.local.request:
			try:
				raw_data = frappe.request.get_data(as_text=True)
			except Exception:
				pass
		if not raw_data and hasattr(frappe.local, "form_dict") and frappe.local.form_dict:
			raw_data = frappe.local.form_dict.get("data")

		payload = frappe.parse_json(raw_data) if isinstance(raw_data, str) else (raw_data or {})
		submissions = payload.get("submissions", [])
		if isinstance(payload, list):
			submissions = payload
		elif not submissions and "idempotency_key" in payload:
			submissions = [payload]

	client_ip = getattr(frappe.local, "request_ip", "127.0.0.1")
	current_user = frappe.session.user

	# Security: Guests are strictly limited to single-form submission (no batch processing)
	if current_user == "Guest" and len(submissions) > 1:
		return {
			"results": [
				{
					"idempotency_key": sub.get("idempotency_key", "UNKNOWN"),
					"status": "REJECTED",
					"error": "Batch push not permitted for Guest users",
				}
				for sub in submissions
			]
		}

	# Durable file-system dump: guaranteed never to fail even under DB lockouts
	log_raw_ingestion_dump("batch_push", raw_data if "raw_data" in locals() and raw_data else submissions, client_ip=client_ip, surveyor=current_user)

	results = []

	for raw_sub in submissions:
		sub = normalize_submission_payload(raw_sub)
		raw_payload_str = frappe.as_json(raw_sub)
		payload_hash = hashlib.sha256(raw_payload_str.encode("utf-8")).hexdigest()
		template_name = resolve_template_name(sub["survey_template"]) if sub.get("survey_template") else None
		idempotency_key = resolve_idempotency_key(sub, template_name, payload_hash)

		# Terminal: a payload with no template cannot become a Response, however often it is retried
		if not template_name:
			err_msg = "Unknown payload shape: missing survey_template"
			upsert_audit_log(idempotency_key, {
				"surveyor": resolve_surveyor(current_user), "sync_status": "FAILED", "client_ip": client_ip,
				"payload_hash_sha256": payload_hash, "raw_payload": raw_payload_str, "error_message": err_msg,
			})
			log_field_error(idempotency_key, err_msg, raw_payload_str, {"surveyor": str(current_user)})
			results.append({"idempotency_key": idempotency_key, "status": "INVALID_SHAPE", "error": err_msg})
			continue

		# Security: Strict template RBAC validation
		if not user_has_template_permission(template_name, user=current_user):
			err_msg = "Guest access not permitted for private survey template" if current_user == "Guest" else f"Permission denied for template {template_name}"
			upsert_audit_log(idempotency_key, {
				"surveyor": resolve_surveyor(sub.get("surveyor") or current_user), "sync_status": "REJECTED",
				"client_ip": client_ip, "raw_payload": raw_payload_str, "error_message": err_msg,
			})
			results.append({"idempotency_key": idempotency_key, "status": "REJECTED", "error": err_msg})
			continue

		# Check existing document
		doc_name = (
			frappe.db.get_value("OmniQuery Response", {"idempotency_key": idempotency_key}, "name")
			or (idempotency_key if frappe.db.exists("OmniQuery Response", idempotency_key) else None)
		)

		if doc_name:
			existing_owner = frappe.db.get_value("OmniQuery Response", doc_name, "owner")
			user_roles = set(frappe.get_roles(current_user))
			is_admin_or_mgr = "System Manager" in user_roles or "Administrator" in user_roles or current_user == "Administrator"
			if existing_owner and existing_owner != current_user and not is_admin_or_mgr:
				err_msg = "Unauthorized attempt to overwrite existing response owned by another user"
				results.append({"idempotency_key": idempotency_key, "status": "REJECTED", "error": err_msg})
				continue

			existing_status = frappe.db.get_value("OmniQuery Response", doc_name, "survey_status")
			if existing_status in ["Submitted", "Supervisor Verified", "Audit Flagged", "Approved"]:
				results.append({
					"idempotency_key": idempotency_key,
					"status": "DUPLICATE_SKIPPED",
					"doc_name": doc_name,
				})
				continue

		# Phase 1: Pre-save in OmniQuery Sync Audit Log with PENDING status and full raw JSON dump
		audit_doc_name = upsert_audit_log(idempotency_key, {
			"surveyor": resolve_surveyor(sub.get("surveyor") or current_user), "sync_status": "PENDING",
			"client_ip": client_ip, "payload_hash_sha256": payload_hash, "raw_payload": raw_payload_str,
			"error_message": None,
		})

		# Phase 2: Savepoint-protected Response Document Creation
		savepoint = f"sp_sync_{idempotency_key.replace('-', '_')}"
		try:
			frappe.db.savepoint(savepoint)

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
			resp_doc.captured_at_local = parse_local_datetime(sub.get("captured_at_local"))
			if resp_doc.captured_at_local is None:
				log_invalid_captured_at(idempotency_key, sub.get("captured_at_local"))
			resp_doc.synced_at = now_datetime()
			resp_doc.response_payload = raw_payload_str

			resp_doc.set("items", [])
			for item in sub.get("items", []):
				val_raw = item.get("value")
				val_num = flt(val_raw) if isinstance(val_raw, (int, float)) else None
				# Security: Strip HTML and script tags to eliminate stored XSS in Desk reports and print views
				val_text = sanitize_value_text(val_raw)
				val_json = frappe.as_json(val_raw) if isinstance(val_raw, (dict, list)) else None
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

			# Phase 3: Telemetry Analysis & Supervisor Audit Synthesis
			process_automated_audit(resp_doc, sub)

			# Phase 2b: Update Audit to SUCCESS
			if audit_doc_name:
				frappe.db.set_value(
					"OmniQuery Sync Audit Log",
					audit_doc_name,
					{
						"survey_response": resp_doc.name,
						"sync_status": "SUCCESS",
						"processed_at": now_datetime(),
						"error_message": None,
					},
				)
				frappe.db.commit()

			results.append({
				"idempotency_key": idempotency_key,
				"status": "SUCCESS",
				"doc_name": resp_doc.name,
				"synced_at": str(resp_doc.synced_at),
			})
		except Exception as e:
			frappe.db.rollback(save_point=savepoint)
			frappe.log_error(f"OmniQuery Sync Error for {idempotency_key}", frappe.get_traceback())

			# Phase 2c: Update Audit to FAILED
			if audit_doc_name:
				try:
					frappe.db.set_value(
						"OmniQuery Sync Audit Log",
						audit_doc_name,
						{
							"sync_status": "FAILED",
							"error_message": str(e)[:1000],
							"processed_at": now_datetime(),
						},
					)
					frappe.db.commit()
				except Exception:
					pass

			# Record Field Error Log so administrators can inspect failed submissions in Desk (Dedup on idempotency_key + error)
			log_field_error(idempotency_key, e, raw_payload_str, {
				"survey_template": template_name, "template_version": sub.get("template_version") or 1,
				"surveyor": str(sub.get("surveyor") or current_user), "stack_trace": frappe.get_traceback(),
			})

			results.append({"idempotency_key": idempotency_key, "status": "FAILED", "error": str(e)})

	frappe.db.commit()
	return {"results": results}


@frappe.whitelist(allow_guest=True)
def upload_response_audio(response_name=None, idempotency_key=None, filename=None):
	"""
	Uploads an interview audio recording file and binds it to OmniQuery Response.
	Accepts multipart file upload (frappe.request.files['file']) or base64 audio content.
	"""
	from frappe.utils.file_manager import save_file

	target_name = response_name or idempotency_key
	if not target_name and hasattr(frappe.local, "form_dict"):
		target_name = frappe.local.form_dict.get("response_name") or frappe.local.form_dict.get("idempotency_key")

	if not target_name:
		frappe.throw(_("Missing response_name or idempotency_key"), frappe.ValidationError)

	# Locate target OmniQuery Response document
	if not frappe.db.exists("OmniQuery Response", target_name):
		target_name = frappe.db.get_value("OmniQuery Response", {"idempotency_key": target_name}, "name")

	if not target_name or not frappe.db.exists("OmniQuery Response", target_name):
		frappe.throw(_("OmniQuery Response {0} not found").format(target_name), frappe.DoesNotExistError)

	resp_doc = frappe.get_doc("OmniQuery Response", target_name)
	current_user = frappe.session.user

	# Security Gate 1: Authorization & IDOR protection
	if current_user == "Guest":
		is_public = frappe.db.get_value(
			"OmniQuery Template",
			resp_doc.survey_template,
			["is_public_citizen_link", "is_public"],
			as_dict=True,
		)
		if not is_public or not (is_public.is_public_citizen_link or is_public.is_public):
			frappe.throw(_("Unauthorized audio upload on private survey"), frappe.PermissionError)
	else:
		roles = frappe.get_roles(current_user)
		is_manager = "System Manager" in roles or current_user == "Administrator"
		is_owner = resp_doc.owner == current_user
		is_surveyor = resp_doc.surveyor and (
			resp_doc.surveyor == current_user
			or frappe.db.get_value("OmniQuery Surveyor", resp_doc.surveyor, "user") == current_user
		)
		if not (is_manager or is_owner or is_surveyor):
			frappe.throw(_("You do not have permission to attach audio to this response"), frappe.PermissionError)

	file_content = None
	resolved_filename = filename or (hasattr(frappe.local, "form_dict") and frappe.local.form_dict.get("filename"))
	file_name = resolved_filename or f"interview_{target_name}.webm"

	# Security Gate 2: Audio extension whitelist
	import os
	valid_extensions = {".webm", ".mp4", ".ogg", ".opus", ".wav", ".aac", ".m4a"}
	ext = os.path.splitext(file_name)[1].lower()
	if ext not in valid_extensions:
		frappe.throw(
			_("Invalid file format. Only audio recordings (.webm, .mp4, .ogg, .opus, .wav, .aac, .m4a) are allowed."),
			frappe.ValidationError,
		)

	# 1. Check multipart/form-data upload
	if hasattr(frappe.local, "request") and frappe.local.request and hasattr(frappe.local.request, "files"):
		uploaded_file = frappe.local.request.files.get("file") or frappe.local.request.files.get("audio")
		if uploaded_file:
			file_name = filename or getattr(uploaded_file, "filename", None) or file_name
			file_content = uploaded_file.read()

	# 2. Check form_dict base64 payload
	if not file_content and hasattr(frappe.local, "form_dict"):
		b64_data = frappe.local.form_dict.get("file_base64") or frappe.local.form_dict.get("data")
		if b64_data:
			import base64
			if "," in b64_data:
				b64_data = b64_data.split(",", 1)[1]
			try:
				file_content = base64.b64decode(b64_data)
			except Exception as b64_err:
				frappe.throw(_("Invalid base64 audio content: {0}").format(str(b64_err)))

	if not file_content:
		frappe.throw(_("No audio file content received"), frappe.ValidationError)

	# Security Gate 3: File size constraint (50MB maximum)
	MAX_AUDIO_SIZE = 50 * 1024 * 1024
	if len(file_content) > MAX_AUDIO_SIZE:
		frappe.throw(_("Audio recording exceeds the 50MB size limit"), frappe.ValidationError)

	# Save file and link as attachment to OmniQuery Response
	file_doc = save_file(
		fname=file_name,
		content=file_content,
		dt="OmniQuery Response",
		dn=target_name,
		folder="Home",
		decode=False,
		is_private=1,
		df="audio_recording",
	)

	# Update audio_recording field on the Response
	frappe.db.set_value("OmniQuery Response", target_name, "audio_recording", file_doc.file_url)
	frappe.db.commit()

	return {
		"status": "SUCCESS",
		"doc_name": target_name,
		"file_name": file_doc.file_name,
		"file_url": file_doc.file_url,
	}

