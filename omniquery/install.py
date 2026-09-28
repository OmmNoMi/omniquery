import frappe


def after_migrate():
	ensure_desktop_icon()


def after_install():
	ensure_desktop_icon()


def get_icon_payload():
	return {
		"doctype": "Desktop Icon",
		"name": "OmniQuery",
		"label": "OmniQuery",
		"icon_type": "App",
		"link_type": "External",
		"link": "/omniquery",
		"app": "omniquery",
		"icon": "search",
		"logo_url": "/assets/omniquery/icons/desktop_icons/solid/omniquery.svg?v=oq_v1",
		"bg_color": "blue",
		"standard": 1,
		"hidden": 0,
		"restrict_removal": 0,
	}


def ensure_desktop_icon():
	if not frappe.db.exists("DocType", "Desktop Icon"):
		return
	existing = frappe.db.exists("Desktop Icon", "OmniQuery")
	doc = frappe.get_doc("Desktop Icon", "OmniQuery") if existing else frappe.new_doc("Desktop Icon")
	doc.update(get_icon_payload())
	doc.save(ignore_permissions=True) if existing else doc.insert(ignore_permissions=True)
