import frappe

AUDIT = "OmniQuery Supervisor Audit"
VERIFIED_REMARK = "Automated telemetry verified."
FLAG_PREFIXES = ("Speedrun detected", "GPS variance high")
SIGNAL_FIELDS = ("time_spent_seconds", "gps_distance_variance_meters", "is_outlier_flagged")


def execute():
	"""Remove the Supervisor Audits that sync used to write by itself (issue #59).

	Those rows carry a verdict and a supervisor no human gave, and they hold the
	AUDIT-{response} name, so a real supervisor could not audit those responses. Their
	telemetry moves onto the Response first. Audits a person has edited no longer
	carry the machine remarks or verdict, so they are kept.
	"""
	for audit in machine_audits():
		backfill_response(audit)
		frappe.delete_doc(AUDIT, audit.name, force=True, ignore_permissions=True)


def machine_audits():
	fields = ["name", "survey_response", "audit_remarks", *SIGNAL_FIELDS]
	audits = frappe.get_all(AUDIT, filters={"audit_verdict": ["in", ["Verified", "Flagged for Re-Survey"]]}, fields=fields)
	return [audit for audit in audits if is_machine_remark(audit.audit_remarks)]


def is_machine_remark(remarks):
	return remarks == VERIFIED_REMARK or (remarks or "").startswith(FLAG_PREFIXES)


def backfill_response(audit):
	"""Copy the audit's signals onto its Response, unless the Response is gone."""
	if not audit.survey_response or not frappe.db.exists("OmniQuery Response", audit.survey_response):
		return
	signals = {field: audit[field] for field in SIGNAL_FIELDS}
	signals["outlier_reasons"] = audit.audit_remarks if audit.is_outlier_flagged else None
	frappe.db.set_value("OmniQuery Response", audit.survey_response, signals, update_modified=False)
