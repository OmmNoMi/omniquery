import json

import frappe

from omniquery.services.answer_comparisons import comparison_rule_problems


def execute():
	"""An Error Log for each published template whose answer comparisons the device cannot check (#159).

	The device read no comparison before #159, so a template submitted earlier was never checked and
	its rules now run as they are. A submitted template cannot be edited; its owner amends it.
	"""
	for template in frappe.get_all("OmniQuery Template", filters={"docstatus": 1}, fields=["name", "compiled_schema_json"]):
		try:
			schema = json.loads(template.compiled_schema_json or "{}")
		except ValueError:
			continue
		problems = comparison_rule_problems(schema) if isinstance(schema, dict) else []
		if problems:
			frappe.log_error(
				title=f"Unchecked answer comparisons in {template.name}",
				message="\n".join(problems) + "\n\nAmend the template and fix its Validation Rules (JSON).",
				reference_doctype="OmniQuery Template",
				reference_name=template.name,
			)
