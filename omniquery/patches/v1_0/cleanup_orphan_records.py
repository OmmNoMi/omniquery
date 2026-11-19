import frappe


def execute():
	"""Delete OmniQuery child-table rows whose parent document no longer exists.

	Tests used to run frappe.db.delete on parent DocTypes, which leaves their child
	rows behind. Only child rows are removed here: a Response whose template is
	missing still holds real field answers, so it is never touched.
	"""
	for table in get_child_tables("omniquery"):
		delete_orphan_rows(table.parent, table.fieldname, table.options)


def get_child_tables(app):
	"""Every Table field on the app's DocTypes, read from the schema, not a hand-kept list."""
	modules = frappe.get_all("Module Def", filters={"app_name": app}, pluck="name")
	doctypes = frappe.get_all("DocType", filters={"module": ["in", modules]}, pluck="name")
	return frappe.get_all(
		"DocField",
		filters={"parent": ["in", doctypes], "fieldtype": ["in", ["Table", "Table MultiSelect"]]},
		fields=["parent", "fieldname", "options"],
	)


def delete_orphan_rows(parent_doctype, parentfield, child_doctype):
	"""Delete rows of one parent's table whose parent is gone. Rows of other parents stay."""
	if not frappe.db.table_exists(child_doctype) or not frappe.db.table_exists(parent_doctype):
		return
	child, parent = frappe.qb.DocType(child_doctype), frappe.qb.DocType(parent_doctype)
	frappe.qb.from_(child).delete().where(
		(child.parenttype == parent_doctype)
		& (child.parentfield == parentfield)
		& child.parent.notin(frappe.qb.from_(parent).select(parent.name))
	).run()
