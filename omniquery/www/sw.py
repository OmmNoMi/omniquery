import os

import frappe


def get_context(context):
	sw_path = os.path.join(frappe.get_app_path("omniquery"), "public", "pwa", "sw.js")
	try:
		with open(sw_path, encoding="utf-8") as f:
			content = f.read()
	except Exception:
		content = "// Service Worker"

	frappe.response["type"] = "text"
	frappe.response["result"] = content
	frappe.response["content_type"] = "application/javascript; charset=utf-8"
	if hasattr(frappe.local, "response"):
		frappe.local.response.headers["Service-Worker-Allowed"] = "/"
		frappe.local.response.headers["Cache-Control"] = "no-cache"
	return context
