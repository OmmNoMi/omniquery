import json
import frappe


def after_migrate():
	ensure_roles()
	ensure_desktop_icon()
	ensure_workspace()
	ensure_workspace_sidebar()
	ensure_default_surveyor()
	sync_app_fixtures()


def ensure_default_surveyor():
	if not frappe.db.exists("DocType", "OmniQuery Surveyor"):
		return
	if not frappe.db.exists("OmniQuery Surveyor", "SURV-Administrator"):
		try:
			frappe.get_doc({
				"doctype": "OmniQuery Surveyor",
				"surveyor_name": "Administrator",
				"user": "Administrator",
				"status": "Active",
			}).insert(ignore_permissions=True)
		except Exception:
			pass


def after_install():
	after_migrate()


def ensure_roles():
	roles = [
		{"role_name": "OmniQuery Admin", "desk_access": 1},
		{"role_name": "OmniQuery Manager", "desk_access": 1},
		{"role_name": "OmniQuery User", "desk_access": 0},
	]
	for r in roles:
		if not frappe.db.exists("Role", r["role_name"]):
			frappe.get_doc({"doctype": "Role", **r}).insert(ignore_permissions=True)


def sync_app_fixtures():
	from frappe.utils.fixtures import sync_fixtures

	try:
		sync_fixtures("omniquery")
	except Exception as e:
		frappe.log_error("OmniQuery Fixture Sync Error", str(e))


def get_icon_payload():
	return {
		"doctype": "Desktop Icon",
		"name": "OmniQuery",
		"label": "OmniQuery",
		"icon_type": "Link",
		"link_type": "Workspace Sidebar",
		"link_to": "OmniQuery",
		"app": "omniquery",
		"icon": "clipboard-list",
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


def _get_sidebar_overview_items():
	return [
		{"type": "Section Break", "label": "Overview", "icon": "home", "indent": 1, "collapsible": 1},
		{"type": "Link", "label": "Home", "link_type": "Workspace", "link_to": "OmniQuery", "icon": "home", "child": 1},
		{"type": "Link", "label": "Field App (PWA)", "link_type": "URL", "url": "/omniquery", "icon": "tablet-smartphone", "child": 1},
	]


def _get_sidebar_survey_items():
	return [
		{"type": "Section Break", "label": "Surveys & Forms", "icon": "file-text", "indent": 1, "collapsible": 1},
		{"type": "Link", "label": "Survey Templates", "link_type": "DocType", "link_to": "OmniQuery Template", "icon": "file-text", "child": 1},
		{"type": "Link", "label": "Questions", "link_type": "DocType", "link_to": "OmniQuery Question", "icon": "help", "child": 1},
		{"type": "Link", "label": "Option Sets", "link_type": "DocType", "link_to": "OmniQuery Option Set", "icon": "list-check", "child": 1},
		{"type": "Link", "label": "Responses", "link_type": "DocType", "link_to": "OmniQuery Response", "icon": "circle-check", "child": 1},
	]


def _get_sidebar_ops_items():
	return [
		{"type": "Section Break", "label": "Field Operations", "icon": "users", "indent": 1, "collapsible": 1},
		{"type": "Link", "label": "Surveyors", "link_type": "DocType", "link_to": "OmniQuery Surveyor", "icon": "user-check", "child": 1},
		{"type": "Link", "label": "Respondents", "link_type": "DocType", "link_to": "OmniQuery Respondent", "icon": "users", "child": 1},
		{"type": "Link", "label": "Supervisor Audits", "link_type": "DocType", "link_to": "OmniQuery Supervisor Audit", "icon": "clipboard-check", "child": 1},
	]


def _get_sidebar_org_and_log_items():
	return [
		{"type": "Section Break", "label": "Organization", "icon": "folder-kanban", "indent": 1, "collapsible": 1},
		{"type": "Link", "label": "Projects", "link_type": "DocType", "link_to": "OmniQuery Project", "icon": "folder-kanban", "child": 1},
		{"type": "Link", "label": "Workspaces", "link_type": "DocType", "link_to": "OmniQuery Workspace", "icon": "building-2", "child": 1},
		{"type": "Section Break", "label": "Telemetry & Logs", "icon": "activity", "indent": 1, "collapsible": 1},
		{"type": "Link", "label": "Field Error Logs", "link_type": "DocType", "link_to": "OmniQuery Field Error Log", "icon": "triangle-alert", "child": 1},
		{"type": "Link", "label": "Sync Audit Logs", "link_type": "DocType", "link_to": "OmniQuery Sync Audit Log", "icon": "refresh-cw", "child": 1},
	]


def _get_sidebar_settings_items():
	return [
		{"type": "Section Break", "label": "Settings", "icon": "settings", "indent": 1, "collapsible": 1},
		{"type": "Link", "label": "OmniQuery Settings", "link_type": "DocType", "link_to": "OmniQuery Settings", "icon": "settings", "child": 1},
		{"type": "Link", "label": "Users", "link_type": "DocType", "link_to": "User", "icon": "user", "child": 1},
		{"type": "Link", "label": "Roles", "link_type": "DocType", "link_to": "Role", "icon": "shield", "child": 1},
	]


def _get_all_sidebar_items():
	return (
		_get_sidebar_overview_items()
		+ _get_sidebar_survey_items()
		+ _get_sidebar_ops_items()
		+ _get_sidebar_org_and_log_items()
		+ _get_sidebar_settings_items()
	)


def ensure_workspace_sidebar():
	if not frappe.db.exists("DocType", "Workspace Sidebar"):
		return
	existing = frappe.db.exists("Workspace Sidebar", "OmniQuery")
	doc = frappe.get_doc("Workspace Sidebar", "OmniQuery") if existing else frappe.new_doc("Workspace Sidebar")
	doc.name = "OmniQuery"
	doc.title = "OmniQuery"
	doc.module = "OmniQuery"
	doc.header_icon = "clipboard-list"
	doc.app = "omniquery"
	doc.standard = 1
	doc.set("items", _get_all_sidebar_items())
	doc.save(ignore_permissions=True) if existing else doc.insert(ignore_permissions=True)


def _get_workspace_shortcuts():
	return [
		{"label": "Survey Templates", "type": "DocType", "link_to": "OmniQuery Template", "color": "Green"},
		{"label": "Questions", "type": "DocType", "link_to": "OmniQuery Question", "color": "Blue"},
		{"label": "Option Sets", "type": "DocType", "link_to": "OmniQuery Option Set", "color": "Purple"},
		{"label": "Responses", "type": "DocType", "link_to": "OmniQuery Response", "color": "Cyan"},
		{"label": "Field App (PWA)", "type": "URL", "url": "/omniquery", "color": "Cyan"},
		{"label": "Projects", "type": "DocType", "link_to": "OmniQuery Project", "color": "Orange"},
		{"label": "Workspaces", "type": "DocType", "link_to": "OmniQuery Workspace", "color": "Blue"},
		{"label": "Field Error Logs", "type": "DocType", "link_to": "OmniQuery Field Error Log", "color": "Red"},
		{"label": "Settings", "type": "DocType", "link_to": "OmniQuery Settings", "color": "Grey"},
	]


def _build_workspace_content(shortcuts):
	header = [{"id": "hdr_actions", "type": "header", "data": {"text": "<span class=\"h4\">Quick Launch</span>", "col": 12}}]
	cards = [
		{
			"id": f"sc_{i+1}",
			"type": "shortcut",
			"data": {
				"shortcut_name": sc["label"],
				"label": sc["label"],
				"type": sc["type"],
				"color": sc.get("color", "Blue"),
				"col": 3,
				**({"url": sc["url"]} if sc["type"] == "URL" else {"link_to": sc["link_to"]}),
			},
		}
		for i, sc in enumerate(shortcuts)
	]
	return json.dumps(header + cards)


def ensure_workspace():
	if not frappe.db.exists("DocType", "Workspace"):
		return
	shortcuts = _get_workspace_shortcuts()
	existing = frappe.db.exists("Workspace", "OmniQuery")
	doc = frappe.get_doc("Workspace", "OmniQuery") if existing else frappe.new_doc("Workspace")
	doc.name = doc.label = doc.title = "OmniQuery"
	doc.icon = "clipboard-list"
	doc.indicator_color = "blue"
	doc.module = "OmniQuery"
	doc.public = 1
	doc.content = _build_workspace_content(shortcuts)
	doc.set("shortcuts", shortcuts)
	doc.save(ignore_permissions=True) if existing else doc.insert(ignore_permissions=True)
