"""Where an interview or a respondent was located, and why there is no location when there is none (#27).

Frappe keeps a Float column NOT NULL DEFAULT 0, so a missing coordinate reads back as 0 and 0,0 cannot
mean "no location" by itself. gps_status says whether the coordinates are a real fix and, when they
are not, what the device reported. The words match the PWA's useGPS report.
"""

from frappe.utils import flt

CAPTURED = "Captured"
NOT_CAPTURED = "Not captured"
# what a device reports when it has no fix
NO_FIX_STATUSES = ("Denied", "Unavailable", "Timed out", "Unsupported", NOT_CAPTURED)


def has_fix(latitude, longitude):
	"""Both coordinates are given and they are not 0,0, the value an empty Float column holds."""
	if latitude in (None, "") or longitude in (None, ""):
		return False
	return not (flt(latitude) == 0 and flt(longitude) == 0)


def resolve_gps_status(latitude, longitude, reported=None):
	"""Captured when there is a fix, else the reason the device gave, else Not captured."""
	if has_fix(latitude, longitude):
		return CAPTURED
	return reported if reported in NO_FIX_STATUSES else NOT_CAPTURED


def apply_location(doc, source):
	"""Copy the coordinates, their accuracy and their status from a payload onto a Response or Respondent."""
	latitude, longitude = source.get("gps_latitude"), source.get("gps_longitude")
	if located(doc) and not has_fix(latitude, longitude):
		# a later draft sync from a device that has no fix this session keeps the one already stored
		return
	doc.gps_status = resolve_gps_status(latitude, longitude, source.get("gps_status"))
	captured = doc.gps_status == CAPTURED
	doc.gps_latitude = flt(latitude) if captured else None
	doc.gps_longitude = flt(longitude) if captured else None
	if doc.meta.has_field("gps_accuracy"):
		accuracy = source.get("gps_accuracy")
		doc.gps_accuracy = flt(accuracy) if captured and accuracy not in (None, "") else None


def located(record):
	"""A record, or a get_value row, with a fix."""
	return bool(record) and record.get("gps_status") == CAPTURED
