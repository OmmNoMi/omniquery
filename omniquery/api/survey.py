import json

import frappe
from frappe import _


def resolve_template_name(template_name: str) -> str:
	if not template_name or frappe.db.exists("OmniQuery Template", template_name):
		return template_name or ""
	clean = template_name[5:] if template_name.startswith("TMPL-") else template_name
	if "-" in clean and clean.rsplit("-", 1)[-1].isdigit():
		clean = clean.rsplit("-", 1)[0]
	return frappe.db.get_value("OmniQuery Template", {"title": clean}, "name") or template_name


def user_has_template_permission(template, user=None):
	"""
	Strict RBAC & Access Control for Survey Templates.
	Rules:
	1. Administrator and System Manager have unconditional access.
	2. If is_public is true (1), all users (including Guest) can access.
	3. If user is Guest and not public -> Denied.
	4. If allowed_users is specified, user must be in the comma-separated list.
	5. If allowed_roles is specified, user must possess at least one of the roles.
	6. If neither is specified, fallback to standard Frappe document permission check.
	"""
	if not user:
		user = frappe.session.user

	user_roles = set(frappe.get_roles(user))
	if "System Manager" in user_roles or "Administrator" in user_roles or user == "Administrator":
		return True

	if isinstance(template, str):
		template = resolve_template_name(template)
		template = frappe.db.get_value(
			"OmniQuery Template",
			template,
			["name", "is_public", "allowed_roles", "allowed_users"],
			as_dict=True,
		)
		if not template:
			return False

	is_public = getattr(template, "is_public", 0)
	if is_public:
		return True

	if user == "Guest":
		return False

	allowed_users_raw = getattr(template, "allowed_users", None) or ""
	if allowed_users_raw:
		allowed_users = [u.strip().lower() for u in allowed_users_raw.split(",") if u.strip()]
		if user.lower() in allowed_users:
			return True

	allowed_roles_raw = getattr(template, "allowed_roles", None) or ""
	if allowed_roles_raw:
		allowed_roles = [r.strip() for r in allowed_roles_raw.split(",") if r.strip()]
		if any(role in user_roles for role in allowed_roles):
			return True

	# If neither allowed_roles nor allowed_users are specified, check DocPerm
	if not allowed_roles_raw and not allowed_users_raw:
		tmpl_name = getattr(template, "name", None)
		if tmpl_name:
			return frappe.has_permission("OmniQuery Template", "read", doc=tmpl_name, user=user)
		return False

	return False


def get_template_permission_query_conditions(user=None):
	"""Hook for Desk list view & Frappe ORM query filtering."""
	from omniquery.permissions import get_template_query_conditions
	return get_template_query_conditions(user=user)


def has_template_doc_permission(doc, ptype="read", user=None):
	"""Hook for Frappe has_permission check."""
	from omniquery.permissions import has_template_permission
	return has_template_permission(doc, ptype=ptype, user=user)


@frappe.whitelist(allow_guest=True)
def get_current_user_info():
	"""Returns authenticated session user profile and active roles for PWA authorization."""
	user = frappe.session.user
	roles = frappe.get_roles(user)
	return {
		"user": user,
		"is_guest": user == "Guest",
		"roles": roles,
		"full_name": frappe.utils.get_fullname(user) if user != "Guest" else "Guest Surveyor",
	}


def fetch_project_workspace_meta(project_ids):
	if not project_ids:
		return {}, {}
	projs = frappe.get_all(
		"OmniQuery Project",
		filters={"name": ["in", list(project_ids)]},
		fields=["name", "project_name", "workspace"],
	)
	p_map = {p.name: p for p in projs}
	ws_ids = {p.workspace for p in projs if p.workspace}
	workspaces = (
		frappe.get_all(
			"OmniQuery Workspace",
			filters={"name": ["in", list(ws_ids)]},
			fields=["name", "workspace_name", "workspace_title"],
		)
		if ws_ids
		else []
	)
	return p_map, {w.name: w for w in workspaces}


def enrich_template_meta(tmpl, p_map, w_map):
	p_meta = p_map.get(tmpl.project) or {}
	ws_id = p_meta.get("workspace") or ""
	w_meta = w_map.get(ws_id) or {}
	tmpl["project_name"] = p_meta.get("project_name") or tmpl.project or ""
	tmpl["workspace"] = ws_id
	tmpl["workspace_title"] = w_meta.get("workspace_title") or w_meta.get("workspace_name") or ws_id
	return tmpl


@frappe.whitelist(allow_guest=True)
def list_active_templates(project=None):
	"""Returns all published survey templates accessible to current user according to RBAC."""
	filters = {"status": "Published"}
	if project:
		filters["project"] = project

	templates = frappe.get_all(
		"OmniQuery Template",
		filters=filters,
		fields=[
			"name",
			"title",
			"project",
			"version",
			"target_category",
			"is_public",
			"allowed_roles",
			"allowed_users",
			"schema_hash_sha256",
			"published_at",
		],
		order_by="published_at desc",
	)

	p_ids = {t.project for t in templates if t.project}
	p_map, w_map = fetch_project_workspace_meta(p_ids)
	current_user = frappe.session.user
	return [enrich_template_meta(t, p_map, w_map) for t in templates if user_has_template_permission(t, current_user)]


@frappe.whitelist(allow_guest=True)
def get_schema(template_name, version=None):
	"""Fetches compiled JSON schema after verifying user permission."""
	if not template_name:
		frappe.throw(_("Template name is mandatory"), frappe.ValidationError)

	current_user = frappe.session.user
	template_name = resolve_template_name(template_name)
	if not user_has_template_permission(template_name, current_user):
		frappe.throw(
			_("You do not have permission to access survey template '{0}'").format(template_name),
			frappe.PermissionError,
		)

	template = frappe.get_doc("OmniQuery Template", template_name)

	if not template.compiled_schema_json:
		template.save(ignore_permissions=True)

	return {
		"template_name": template.name,
		"title": template.title,
		"project": template.project,
		"version": template.version,
		"status": template.status,
		"schema_hash_sha256": template.schema_hash_sha256,
		"schema": json.loads(template.compiled_schema_json) if template.compiled_schema_json else {},
	}


@frappe.whitelist(allow_guest=True)
def get_translations(template_name=None, language_code="hi"):
	"""Returns the vernacular dictionary map using Frappe's native Translation DocType."""
	translations = frappe.get_all(
		"Translation",
		filters={"language": language_code},
		fields=["source_text", "translated_text", "context"],
		limit=1000,
	)
	dict_map = {t.source_text: t.translated_text for t in translations}

	if template_name:
		for t in translations:
			if t.context == template_name:
				dict_map[t.source_text] = t.translated_text

	return {"survey_template": template_name, "language_code": language_code, "translations": dict_map}


@frappe.whitelist(allow_guest=True)
def get_available_languages():
	"""Returns strictly supported Indian vernacular languages + English for OmniQuery field operations."""
	return [
		{"code": "en", "label": "English"},
		{"code": "hi", "label": "हिन्दी (Hindi)"},
		{"code": "mr", "label": "मराठी (Marathi)"},
		{"code": "gu", "label": "ગુજરાતી (Gujarati)"},
		{"code": "pa", "label": "ਪੰਜਾਬੀ (Punjabi)"},
		{"code": "bn", "label": "বাংলা (Bengali)"},
		{"code": "ta", "label": "தமிழ் (Tamil)"},
		{"code": "te", "label": "తెలుగు (Telugu)"},
		{"code": "kn", "label": "ಕನ್ನಡ (Kannada)"},
		{"code": "ml", "label": "മലയാളം (Malayalam)"},
		{"code": "ur", "label": "اردو (Urdu)"},
	]


@frappe.whitelist(allow_guest=True)
def get_service_worker():
	"""Serves the Service Worker script with Service-Worker-Allowed root scope header."""
	import os

	sw_path = os.path.join(frappe.get_app_path("omniquery"), "public", "pwa", "sw.js")
	try:
		with open(sw_path, encoding="utf-8") as f:
			content = f.read()
	except Exception:
		content = "// OmniQuery Service Worker"

	frappe.response["type"] = "binary"
	frappe.response["filecontent"] = content.encode("utf-8")
	frappe.response["filename"] = "sw.js"
	frappe.response["content_type"] = "application/javascript; charset=utf-8"
	frappe.response["headers"] = {
		"Service-Worker-Allowed": "/",
		"Cache-Control": "no-cache, no-store, must-revalidate",
	}


@frappe.whitelist(allow_guest=True)
def get_bootstrap_data():
	"""Returns bootstrap user info and full authorized templates with compiled schema."""
	current_user = frappe.session.user
	user_info = get_current_user_info()
	templates = frappe.get_all(
		"OmniQuery Template",
		filters={"status": "Published"},
		fields=[
			"name",
			"title",
			"project",
			"version",
			"target_category",
			"is_public",
			"allowed_roles",
			"allowed_users",
			"schema_hash_sha256",
			"published_at",
			"compiled_schema_json",
		],
		order_by="published_at desc",
	)
	authorized = []
	for t in templates:
		if user_has_template_permission(t, current_user):
			schema_data = json.loads(t.compiled_schema_json) if t.compiled_schema_json else {}
			authorized.append(
				{
					"name": t.name,
					"title": t.title,
					"project": t.project,
					"version": t.version,
					"target_category": t.target_category,
					"schema_hash_sha256": t.schema_hash_sha256,
					"schema": schema_data,
				}
			)
	return {
		"user": (user_info.get("full_name") or user_info.get("user") or "Guest Surveyor")
		if isinstance(user_info, dict)
		else str(user_info),
		"templates": authorized,
	}


@frappe.whitelist(allow_guest=True)
def email_surveyor_backup(recipient_email=None, surveyor_name=None, note=None, data_json=None, data_csv=None):
	"""
	Emergency email backup endpoint: sends survey data dump (JSON/CSV) to admin email.
	"""
	if not recipient_email:
		recipient_email = (
			frappe.db.get_single_value("System Settings", "email_notification_recipient")
			or "admin@ommnomi.local"
		)

	surveyor = surveyor_name or frappe.session.user or "Field Surveyor"
	now_str = frappe.utils.now_datetime().strftime("%Y-%m-%d %H:%M:%S")

	subject = f"[OmniQuery Emergency Data Backup] from {surveyor} ({now_str})"

	body = f"""
	<h3>OmniQuery Field Device Data Backup</h3>
	<p><strong>Sent by:</strong> {frappe.utils.escape_html(str(surveyor))}</p>
	<p><strong>Timestamp:</strong> {now_str}</p>
	<p><strong>Notes / Error Report:</strong> {frappe.utils.escape_html(str(note or "Direct Emergency Backup Export from PWA"))}</p>
	<hr>
	<p>Attached are the raw JSON database dump and tabular CSV responses from the surveyor's offline device storage.</p>
	"""

	attachments = []
	today_date = frappe.utils.today()
	if data_json:
		attachments.append(
			{
				"fname": f"OmniQuery_Backup_{today_date}.json",
				"fcontent": data_json.encode("utf-8")
				if isinstance(data_json, str)
				else str(data_json).encode("utf-8"),
			}
		)
	if data_csv:
		attachments.append(
			{
				"fname": f"OmniQuery_Responses_{today_date}.csv",
				"fcontent": data_csv.encode("utf-8")
				if isinstance(data_csv, str)
				else str(data_csv).encode("utf-8"),
			}
		)

	try:
		frappe.sendmail(
			recipients=[recipient_email],
			subject=subject,
			message=body,
			attachments=attachments,
			delayed=False,
		)
		return {"status": "SUCCESS", "message": f"Backup email successfully dispatched to {recipient_email}"}
	except Exception as e:
		frappe.log_error("OmniQuery Emergency Backup Email Error", str(e))
		return {"status": "ERROR", "error": str(e), "message": "Server mail dispatch error"}
