import frappe


def execute():
	"""Responses saved before the title field existed have no title (#54)."""
	for name in frappe.get_all("OmniQuery Response", filters={"title": ["is", "not set"]}, pluck="name"):
		title = frappe.get_doc("OmniQuery Response", name).compute_title()
		frappe.db.set_value("OmniQuery Response", name, "title", title, update_modified=False)
