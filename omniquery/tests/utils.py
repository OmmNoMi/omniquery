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


def sync_records_of(template):
	"""delete_test_docs specs for every Response filed under a test's own template, with the Sync Audit and
	Field Error Logs of those keys and of the template's rejected payloads. A key is a UUIDv4 (#25), so no
	key prefix can find a test's rows: give each test class its own template and clean up by it."""
	keys = set(frappe.get_all("OmniQuery Response", {"survey_template": template}, pluck="idempotency_key"))
	keys |= set(frappe.get_all("OmniQuery Sync Audit Log", {"raw_payload": ["like", f"%{template}%"]}, pluck="idempotency_key"))
	keys = list(keys) or [""]
	return [
		("OmniQuery Response", {"survey_template": template}),
		("OmniQuery Sync Audit Log", {"idempotency_key": ["in", keys]}),
		("OmniQuery Field Error Log", {"question_code": ["in", keys]}),
		("OmniQuery Field Error Log", {"survey_template": template}),
	]
