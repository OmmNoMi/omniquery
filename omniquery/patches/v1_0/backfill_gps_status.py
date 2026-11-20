import frappe
from frappe.query_builder.functions import IfNull

from omniquery.services.location import CAPTURED, NOT_CAPTURED

LOCATED_DOCTYPES = ("OmniQuery Response", "OmniQuery Respondent")


def execute():
	"""gps_status for records saved before it existed (#27). An empty Float reads 0, so 0,0 is no fix.

	Safe to run again: a reason a device reported (Denied, Timed out, ...) is left as it is.
	"""
	for doctype in LOCATED_DOCTYPES:
		table = frappe.qb.DocType(doctype)
		no_fix = (IfNull(table.gps_latitude, 0) == 0) & (IfNull(table.gps_longitude, 0) == 0)
		status = IfNull(table.gps_status, "")
		frappe.qb.update(table).set(table.gps_status, CAPTURED).where(~no_fix & (status != CAPTURED)).run()
		frappe.qb.update(table).set(table.gps_status, NOT_CAPTURED).where(no_fix & status.isin(["", CAPTURED])).run()
