import frappe


def delete_test_docs(specs):
	"""Cancel and delete each (doctype, filters) match through delete_doc, so child rows go too.

	Errors are not swallowed: a record that cannot be removed should fail the test that
	made it, not surface later as an orphan row nobody can trace.
	"""
	for doctype, filters in specs:
		for name in frappe.get_all(doctype, filters=filters, pluck="name"):
			doc = frappe.get_doc(doctype, name)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc(doctype, name, force=True, ignore_permissions=True)
