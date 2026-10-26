import frappe


def execute():
	"""
	Replays the two historical failed WAL payloads (WAL-1790686845461-fnso9, WAL-1790689240634-568jb)
	using the new legacy payload adapter, creating their OmniQuery Response records and
	cleaning up the 164 duplicate Field Error Log rows.
	"""
	for key in ["WAL-1790686845461-fnso9", "WAL-1790689240634-568jb"]:
		audit_name = f"SYNC-{key}"
		if frappe.db.exists("OmniQuery Sync Audit Log", audit_name):
			doc = frappe.get_doc("OmniQuery Sync Audit Log", audit_name)
			if doc.sync_status == "FAILED" and doc.raw_payload:
				doc.replay()

	frappe.db.commit()
