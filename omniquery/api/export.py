import csv
import io
import json
import frappe
from frappe import _
from omniquery.permissions import is_super_user


@frappe.whitelist()
def export_flattened_responses(template_name=None, project=None, format="csv"):
	"""
	Exports OmniQuery responses flattened across repeat groups and matrix items.
	Returns either a downloadable CSV string or structured JSON rows.
	Zero raw SQL: Uses frappe.qb and frappe.get_list.
	"""
	current_user = frappe.session.user
	if not frappe.has_permission("OmniQuery Response", "export"):
		frappe.throw(_("Not permitted to export responses"), frappe.PermissionError)

	user_roles = set(frappe.get_roles(current_user))
	is_super = is_super_user(current_user)

	allowed_export_projects = None
	if not is_super:
		allowed_export_projects = set(
			frappe.get_all(
				"OmniQuery Project Member",
				filters={
					"user": current_user,
					"project_role": ["in", ["Project Admin", "Project Manager", "Project Analyst"]],
				},
				pluck="parent",
			)
		)
		if not allowed_export_projects:
			frappe.throw(_("Not permitted to export responses for your assigned projects"), frappe.PermissionError)

	if project:
		if allowed_export_projects is not None and project not in allowed_export_projects:
			frappe.throw(_("Not permitted to export responses from project {0}").format(project), frappe.PermissionError)
		target_projects = [project]
	else:
		target_projects = list(allowed_export_projects) if allowed_export_projects is not None else None

	tmpl_filters = {}
	if target_projects is not None:
		tmpl_filters["project"] = ["in", target_projects]

	allowed_tmpl_names = set(frappe.get_list("OmniQuery Template", filters=tmpl_filters, pluck="name"))

	filters = {}
	if template_name:
		# Intersect template_name with project/allowed templates
		if template_name in allowed_tmpl_names or is_super:
			filters["survey_template"] = template_name
		else:
			filters["survey_template"] = "__no_accessible_templates__"
	else:
		if allowed_tmpl_names:
			filters["survey_template"] = ["in", list(allowed_tmpl_names)]
		elif not is_super:
			filters["survey_template"] = "__no_accessible_templates__"

	responses = frappe.get_list(
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
		filters={"parent": ["in", resp_names]},
		fields=[
			"parent",
			"question_code",
			"question_label",
			"value_text",
			"value_numeric",
			"value_json",
			"attachment_file",
		],
		order_by="creation asc",
	)

	# Group items by parent response
	from collections import defaultdict
	items_by_parent = defaultdict(list)
	all_question_codes = set()
	for it in items:
		items_by_parent[it.parent].append(it)
		if it.question_code:
			all_question_codes.add(it.question_code)

	sorted_qcodes = sorted(list(all_question_codes))

	# Flatten rows
	rows = []
	for r in responses:
		row = {
			"Response Name": r.name,
			"Survey Template": r.survey_template,
			"Template Version": r.template_version,
			"Respondent": r.respondent or "",
			"Surveyor": r.surveyor or "",
			"Status": r.survey_status or "",
			"GPS Latitude": r.gps_latitude or "",
			"GPS Longitude": r.gps_longitude or "",
			"GPS Accuracy": r.gps_accuracy or "",
			"Captured At": r.captured_at_local or "",
			"Synced At": r.synced_at or "",
		}
		p_items = items_by_parent.get(r.name, [])
		for it in p_items:
			val = it.value_text or it.value_numeric or it.value_json or it.attachment_file or ""
			col_name = it.question_code or it.question_label or "question"
			row[col_name] = str(val)
		rows.append(row)

	if format == "json":
		return {"rows": rows}

	# CSV Export via in-memory buffer
	headers = [
		"Response Name",
		"Survey Template",
		"Template Version",
		"Respondent",
		"Surveyor",
		"Status",
		"GPS Latitude",
		"GPS Longitude",
		"GPS Accuracy",
		"Captured At",
		"Synced At",
	] + sorted_qcodes

	out = io.StringIO()
	writer = csv.DictWriter(out, fieldnames=headers, extrasaction="ignore")
	writer.writeheader()
	for r in rows:
		writer.writerow(r)

	frappe.response["type"] = "download"
	frappe.response["display_content_as"] = "attachment"
	filename = f"responses_{template_name or project or 'all'}.csv"
	frappe.response["filename"] = filename
	frappe.response["filecontent"] = out.getvalue().encode("utf-8")
	frappe.response["content_type"] = "text/csv; charset=utf-8"
