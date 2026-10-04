import csv
import io
import json
import frappe
from frappe import _


@frappe.whitelist()
def export_flattened_responses(template_name=None, project=None, format="csv"):
	"""
	Exports OmniQuery responses flattened across repeat groups and matrix items.
	Returns either a downloadable CSV string or structured JSON rows.
	Zero raw SQL: Uses frappe.qb and frappe.get_all.
	"""
	current_user = frappe.session.user
	filters = {}
	if template_name:
		filters["survey_template"] = template_name
	if project:
		# Filter templates under project
		tmpl_names = frappe.get_all("OmniQuery Template", filters={"project": project}, pluck="name")
		if tmpl_names:
			filters["survey_template"] = ["in", tmpl_names]

	responses = frappe.get_all(
		"OmniQuery Response",
		filters=filters,
		fields=[
			"name",
			"idempotency_key",
			"survey_template",
			"template_version",
			"respondent",
			"surveyor",
			"survey_status",
			"gps_latitude",
			"gps_longitude",
			"gps_accuracy",
			"captured_at_local",
			"synced_at",
			"audio_recording",
		],
		order_by="creation desc",
		limit=2000,
	)

	if not responses:
		if format == "json":
			return {"rows": []}
		frappe.response["type"] = "download"
		frappe.response["display_content_as"] = "attachment"
		frappe.response["filename"] = f"responses_{template_name or 'all'}.csv"
		frappe.response["filecontent"] = "No records found".encode("utf-8")
		frappe.response["content_type"] = "text/csv; charset=utf-8"
		return

	# Gather child response items
	resp_names = [r.name for r in responses]
	items = frappe.get_all(
		"OmniQuery Response Item",
		filters={"parent": ["in", resp_names], "parenttype": "OmniQuery Response"},
		fields=["parent", "question_code", "question_label", "value_text", "value_numeric", "value_json"],
		order_by="idx asc",
	)

	# Group items by parent response
	items_by_parent = {}
	question_headers = {}
	for itm in items:
		items_by_parent.setdefault(itm.parent, {})[itm.question_code] = itm
		if itm.question_code not in question_headers:
			question_headers[itm.question_code] = itm.question_label or itm.question_code

	headers = [
		"Response ID",
		"Template",
		"Version",
		"Status",
		"Surveyor",
		"Local Time",
		"Sync Time",
		"Latitude",
		"Longitude",
		"GPS Accuracy",
		"Audio Recording",
	]
	q_codes = list(question_headers.keys())
	for code in q_codes:
		headers.append(f"{question_headers[code]} [{code}]")

	rows = []
	for r in responses:
		r_items = items_by_parent.get(r.name, {})
		row = [
			r.name,
			r.survey_template,
			r.template_version,
			r.survey_status,
			r.surveyor,
			str(r.captured_at_local or ""),
			str(r.synced_at or ""),
			r.gps_latitude or "",
			r.gps_longitude or "",
			r.gps_accuracy or "",
			r.audio_recording or "",
		]
		for code in q_codes:
			itm = r_items.get(code)
			if itm:
				val = itm.value_text or (itm.value_numeric if itm.value_numeric is not None else itm.value_json or "")
			else:
				val = ""
			row.append(val)
		rows.append(row)

	if format == "json":
		return {"headers": headers, "rows": rows}

	output = io.StringIO()
	writer = csv.writer(output, quoting=csv.QUOTE_MINIMAL)
	writer.writerow(headers)
	for row in rows:
		writer.writerow(row)

	csv_content = output.getvalue()
	frappe.response["type"] = "download"
	frappe.response["display_content_as"] = "attachment"
	frappe.response["filename"] = f"OmniQuery_Responses_{template_name or 'export'}.csv"
	frappe.response["filecontent"] = csv_content.encode("utf-8-sig")
	frappe.response["content_type"] = "text/csv; charset=utf-8"
