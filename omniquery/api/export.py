import csv
import io

import frappe
from frappe import _

from omniquery.permissions import EXPORT_PROJECT_ROLES, permitted_projects

RESPONSE_FIELDS = [
	"name", "survey_template", "template_version", "survey_status", "surveyor", "captured_at_local",
	"synced_at", "gps_latitude", "gps_longitude", "gps_accuracy", "audio_recording",
]
HEADERS = [
	"Response ID", "Template", "Version", "Status", "Surveyor", "Local Time",
	"Sync Time", "Latitude", "Longitude", "GPS Accuracy", "Audio Recording",
]
ITEM_FIELDS = ["parent", "question_code", "question_label", "value_text", "value_numeric", "value_json"]


@frappe.whitelist()
def export_flattened_responses(template_name=None, project=None, format="csv"):
	"""Responses flattened to one row each, one column per question, for the projects the user may export."""
	frappe.has_permission("OmniQuery Response", "export", throw=True)
	projects = permitted_projects(project, EXPORT_PROJECT_ROLES, _("Not permitted to export responses for this project"))
	filters = {} if projects is None else {"project": ["in", projects]}
	if template_name:
		filters["survey_template"] = template_name
	responses = frappe.get_list("OmniQuery Response", filters=filters, fields=RESPONSE_FIELDS, order_by="creation desc", limit=2000)
	if not responses:
		return _empty_response(template_name, project, format)
	headers, rows = _flatten(responses)
	return {"headers": headers, "rows": rows} if format == "json" else _send_csv(headers, rows, template_name or project)


def _flatten(responses):
	items = frappe.get_all(
		"OmniQuery Response Item",
		filters={"parent": ["in", [r.name for r in responses]], "parenttype": "OmniQuery Response"},
		fields=ITEM_FIELDS,
		order_by="idx asc",
	)
	labels = {}
	for item in items:
		labels.setdefault(item.question_code, item.question_label or item.question_code)
	by_parent = {}
	for item in items:
		by_parent.setdefault(item.parent, {})[item.question_code] = item
	headers = HEADERS + [f"{label} [{code}]" for code, label in labels.items()]
	return headers, [_row(r, by_parent.get(r.name, {}), labels) for r in responses]


def _row(response, answers, codes):
	row = ["" if response.get(field) is None else response.get(field) for field in RESPONSE_FIELDS]
	return row + [_answer(answers.get(code)) for code in codes]


def _answer(item):
	if not item:
		return ""
	if item.value_text:
		return item.value_text
	return item.value_numeric if item.value_numeric is not None else item.value_json or ""


def _send_csv(headers, rows, label):
	output = io.StringIO()
	writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
	writer.writerows([headers, *rows])
	_set_download(f"OmniQuery_Responses_{label or 'export'}.csv", output.getvalue())


def _empty_response(template_name, project, format):
	if format == "json":
		return {"headers": [], "rows": []}
	_set_download(f"responses_{template_name or project or 'all'}.csv", "No records found")


def _set_download(filename, content):
	frappe.response["type"] = "download"
	frappe.response["display_content_as"] = "attachment"
	frappe.response["filename"] = filename
	frappe.response["filecontent"] = content.encode("utf-8-sig")
	frappe.response["content_type"] = "text/csv; charset=utf-8"
