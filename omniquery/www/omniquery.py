import frappe


def get_context(context):
	if isinstance(context, dict):
		ctx = frappe._dict(context)
	else:
		ctx = context

	ctx.no_cache = 1
	app_path = (frappe.form_dict.get("app_path") or "").strip("/")
	ctx.initial_survey_id = ""
	ctx.initial_project_id = ""

	ctx.title = "OmniQuery · OmmNoMi Field Survey Platform"

	if app_path.startswith("project/"):
		ctx.initial_project_id = app_path.split("project/", 1)[1].strip("/")
		if ctx.initial_project_id:
			proj_name = (
				frappe.db.get_value("OmniQuery Project", ctx.initial_project_id, "project_name")
				or ctx.initial_project_id
			)
			ctx.title = f"{proj_name} · OmniQuery"
	elif app_path:
		from omniquery.api.survey import resolve_template_name
		resolved_id = resolve_template_name(app_path)
		ctx.initial_survey_id = resolved_id or app_path
		if frappe.db.exists("OmniQuery Template", ctx.initial_survey_id):
			t_title = frappe.db.get_value("OmniQuery Template", ctx.initial_survey_id, "title")
			if t_title:
				ctx.title = f"{t_title} · OmniQuery"


	try:
		from frappe.sessions import get_csrf_token

		ctx.csrf_token = get_csrf_token()
	except Exception:
		ctx.csrf_token = (
			getattr(frappe.local.session.data, "csrf_token", "") if hasattr(frappe.local, "session") else ""
		)

	import json
	user_lang = frappe.local.lang or "hi"
	try:
		from frappe.translate import get_all_translations
		translations = get_all_translations(user_lang)
	except Exception:
		translations = {}
	ctx.translations = json.dumps(translations)
	ctx.current_lang = user_lang

	ctx.current_user = frappe.session.user
	try:
		import os
		bundle_path = os.path.join(frappe.get_app_path("omniquery"), "public", "dist", "omniquery.bundle.js")
		ctx.bundle_version = str(int(os.path.getmtime(bundle_path))) if os.path.exists(bundle_path) else "20261005_v33"
	except Exception:
		ctx.bundle_version = "20261005_v33"
	return ctx

