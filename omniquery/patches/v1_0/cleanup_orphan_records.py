import frappe


def execute():
	"""
	Clean up orphan child rows and dangling responses pointing to non-existent templates.
	Root cause: tests run frappe.db.delete on parent DocTypes against shared sites,
	leaving child rows and referenced responses behind.
	"""
	# 1. Clean up dangling responses referencing non-existent templates
	orphan_responses = frappe.db.sql_list(
		"""
		SELECT name FROM `tabOmniQuery Response`
		WHERE survey_template NOT IN (SELECT name FROM `tabOmniQuery Template`)
		"""
	)
	if orphan_responses:
		for i in range(0, len(orphan_responses), 500):
			chunk = orphan_responses[i : i + 500]
			frappe.db.delete("OmniQuery Response Item", {"parent": ["in", chunk]})
			frappe.db.delete("OmniQuery Response", {"name": ["in", chunk]})

	# 2. Clean up child table orphan rows where parent is missing
	child_parent_specs = [
		("tabOmniQuery Workspace Member", "tabOmniQuery Workspace"),
		("tabOmniQuery Template Question Reference", "tabOmniQuery Template"),
		("tabOmniQuery Section", "tabOmniQuery Template"),
		("tabOmniQuery Response Item", "tabOmniQuery Response"),
		("tabOmniQuery Supported Language", "tabOmniQuery Project"),
		("tabOmniQuery Option Item", "tabOmniQuery Option Set"),
	]

	for child_table, parent_table in child_parent_specs:
		frappe.db.sql(
			f"""
			DELETE FROM `{child_table}`
			WHERE parent NOT IN (SELECT name FROM `{parent_table}`)
			"""
		)

	frappe.db.commit()
