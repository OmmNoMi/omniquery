import frappe

# Before issue #28 these were final in name only, with docstatus 0. The field app now lists
# only submitted templates, and sync treats only submitted responses as final.
FINAL = (
	("OmniQuery Template", {"status": "Published", "docstatus": 0}),
	("OmniQuery Response", {"survey_status": ["!=", "Draft"], "docstatus": 0}),
)


def execute():
	for doctype, filters in FINAL:
		for name in frappe.get_all(doctype, filters=filters, pluck="name"):
			submit(doctype, name)


def submit(doctype, name):
	"""A legacy row that fails validation is logged and left as it was, not allowed to stop the migrate."""
	frappe.db.savepoint("submit_final_document")
	try:
		doc = frappe.get_doc(doctype, name)
		doc.flags.ignore_permissions = True
		doc.submit()
	except Exception:
		frappe.db.rollback(save_point="submit_final_document")
		frappe.log_error(f"Could not submit {doctype} {name}", frappe.get_traceback())
