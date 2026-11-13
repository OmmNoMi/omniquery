import json
import frappe

from omniquery.permissions import DESK_APP_ROLES


def after_migrate():
	ensure_roles()
	# The icon links to the sidebar and the sidebar links to the workspace, so create them in
	# that order. Inserting the icon first fails the whole migrate whenever the sidebar is missing.
	# The sidebar itself is the module file omniquery/sidebar/omniquery, which migrate imports.
	ensure_number_cards()
	ensure_workspace()
	ensure_desktop_icon()
	ensure_default_surveyor()
	ensure_response_workflow()
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
		{"role_name": "OmniQuery Analyst", "desk_access": 1},
		{"role_name": "OmniQuery Viewer", "desk_access": 1},
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
		"roles": [{"role": role} for role in DESK_APP_ROLES],
	}


def ensure_desktop_icon():
	if not frappe.db.exists("DocType", "Desktop Icon"):
		return
	existing = frappe.db.exists("Desktop Icon", "OmniQuery")
	doc = frappe.get_doc("Desktop Icon", "OmniQuery") if existing else frappe.new_doc("Desktop Icon")
	doc.update(get_icon_payload())
	# link_to is a Dynamic Link to the retired Workspace Sidebar archive, which a fresh site no
	# longer has; Frappe seeds its own icons with ignore_links for the same reason.
	doc.flags.ignore_links = True
	doc.save(ignore_permissions=True) if existing else doc.insert(ignore_permissions=True)


def ensure_number_cards():
	if not frappe.db.exists("DocType", "Number Card"):
		return
	cards = [
		{
			"name": "Awaiting Review",
			"label": "Awaiting Review",
			"type": "Document Type",
			"document_type": "OmniQuery Response",
			"function": "Count",
			"filters_json": json.dumps([["OmniQuery Response", "survey_status", "=", "Submitted"]]),
			"is_public": 1,
			"module": "OmniQuery",
			"color": "#FBBC05",
		},
		{
			"name": "Flagged Responses",
			"label": "Flagged Responses",
			"type": "Document Type",
			"document_type": "OmniQuery Response",
			"function": "Count",
			"filters_json": json.dumps([["OmniQuery Response", "survey_status", "=", "Audit Flagged"]]),
			"is_public": 1,
			"module": "OmniQuery",
			"color": "#EA4335",
		},
		{
			"name": "Collected Today",
			"label": "Collected Today",
			"type": "Document Type",
			"document_type": "OmniQuery Response",
			"function": "Count",
			"filters_json": json.dumps([["OmniQuery Response", "captured_at_local", "Timespan", "today"]]),
			"is_public": 1,
			"module": "OmniQuery",
			"color": "#34A853",
		},
	]
	# Create only: an admin's later edits to a card in Desk must survive bench migrate.
	for card in cards:
		if not frappe.db.exists("Number Card", card["name"]):
			frappe.get_doc({"doctype": "Number Card", **card}).insert(ignore_permissions=True)


def _get_workspace_number_cards():
	return [
		{"number_card_name": "Awaiting Review", "label": "Awaiting Review"},
		{"number_card_name": "Flagged Responses", "label": "Flagged Responses"},
		{"number_card_name": "Collected Today", "label": "Collected Today"},
	]


def _get_workspace_shortcuts():
	return [
		{
			"label": "To Review",
			"type": "DocType",
			"link_to": "OmniQuery Response",
			"color": "Orange",
			"doc_view": "List",
			"stats_filter": json.dumps([["OmniQuery Response", "survey_status", "=", "Submitted"]]),
		},
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


def _build_workspace_content(shortcuts, number_cards):
	metric_header = [{"id": "hdr_metrics", "type": "header", "data": {"text": "<span class=\"h4\">Review Queue & Activity</span>", "col": 12}}]
	metric_cards = [
		{
			"id": f"nc_{i+1}",
			"type": "number_card",
			"data": {
				"number_card_name": nc["number_card_name"],
				"card_name": nc["number_card_name"],
				"col": 4,
			},
		}
		for i, nc in enumerate(number_cards)
	]
	action_header = [{"id": "hdr_actions", "type": "header", "data": {"text": "<span class=\"h4\">Quick Launch</span>", "col": 12}}]
	action_cards = [
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
	return json.dumps(metric_header + metric_cards + action_header + action_cards)


def ensure_workspace():
	if not frappe.db.exists("DocType", "Workspace"):
		return
	shortcuts = _get_workspace_shortcuts()
	number_cards = _get_workspace_number_cards()
	existing = frappe.db.exists("Workspace", "OmniQuery")
	doc = frappe.get_doc("Workspace", "OmniQuery") if existing else frappe.new_doc("Workspace")
	doc.name = doc.label = doc.title = "OmniQuery"
	doc.icon = "clipboard-list"
	doc.indicator_color = "blue"
	doc.module = "OmniQuery"
	doc.public = 1
	doc.content = _build_workspace_content(shortcuts, number_cards)
	doc.set("shortcuts", shortcuts)
	doc.set("number_cards", number_cards)
	doc.set("roles", [{"role": role} for role in DESK_APP_ROLES])
	doc.save(ignore_permissions=True) if existing else doc.insert(ignore_permissions=True)


RESPONSE_WORKFLOW = "OmniQuery Response Approval"
WORKFLOW_ACTIONS = ("Approve", "Flag for Audit", "Reject", "Verify", "Submit")
# (state, style, doc_status, allow_edit). Only Draft is docstatus 0: sync submits a response, and
# Frappe refuses any transition from a submitted (1) state back to a draft (0) one.
WORKFLOW_STATES = (
	("Draft", "Inverse", "0", "OmniQuery User"),
	("Submitted", "Primary", "1", "OmniQuery Manager"),
	("Supervisor Verified", "Success", "1", "OmniQuery Manager"),
	("Audit Flagged", "Danger", "1", "OmniQuery Manager"),
	("Approved", "Success", "1", "OmniQuery Manager"),
	("Rejected", "Danger", "1", "OmniQuery Manager"),
)
# (state, action, next_state); every review transition belongs to OmniQuery Manager
WORKFLOW_TRANSITIONS = (
	("Submitted", "Approve", "Approved"),
	("Submitted", "Flag for Audit", "Audit Flagged"),
	("Submitted", "Reject", "Rejected"),
	("Submitted", "Verify", "Supervisor Verified"),
	("Supervisor Verified", "Approve", "Approved"),
	("Supervisor Verified", "Flag for Audit", "Audit Flagged"),
	("Supervisor Verified", "Reject", "Rejected"),
	("Audit Flagged", "Approve", "Approved"),
	("Audit Flagged", "Reject", "Rejected"),
	("Audit Flagged", "Verify", "Supervisor Verified"),
)


def ensure_response_workflow():
	# Create only, like the number cards: an admin who edits or deactivates it in Desk keeps that.
	if not frappe.db.exists("DocType", "Workflow") or frappe.db.exists("Workflow", RESPONSE_WORKFLOW):
		return
	_ensure_named("Workflow Action Master", "workflow_action_name", WORKFLOW_ACTIONS)
	for state, style, _docstatus, _role in WORKFLOW_STATES:
		_ensure_named("Workflow State", "workflow_state_name", (state,), style=style)
	frappe.get_doc(_response_workflow_payload()).insert(ignore_permissions=True)


def _ensure_named(doctype, name_field, names, **fields):
	for name in names:
		if not frappe.db.exists(doctype, name):
			frappe.get_doc({"doctype": doctype, name_field: name, **fields}).insert(ignore_permissions=True)


def _response_workflow_payload():
	states = [{"state": s, "doc_status": d, "allow_edit": r} for s, _style, d, r in WORKFLOW_STATES]
	submit = {"state": "Draft", "action": "Submit", "next_state": "Submitted", "allowed": "OmniQuery User"}
	review = [{"state": s, "action": a, "next_state": n, "allowed": "OmniQuery Manager"} for s, a, n in WORKFLOW_TRANSITIONS]
	transitions = [{**t, "allow_self_approval": 1} for t in [submit, *review]]
	return {
		"doctype": "Workflow", "workflow_name": RESPONSE_WORKFLOW, "document_type": "OmniQuery Response",
		"workflow_state_field": "survey_status", "is_active": 1, "states": states, "transitions": transitions,
	}
