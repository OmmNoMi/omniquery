import frappe


def get_context(context):
	if isinstance(context, dict):
		ctx = frappe._dict(context)
	else:
		ctx = context

	ctx.no_cache = 1
	ctx.title = "OmniQuery · OmmNoMi Field Survey Platform"

	try:
		from frappe.sessions import get_csrf_token

		ctx.csrf_token = get_csrf_token()
	except Exception:
		ctx.csrf_token = (
			getattr(frappe.local.session.data, "csrf_token", "") if hasattr(frappe.local, "session") else ""
		)

	ctx.current_user = frappe.session.user
	return ctx
