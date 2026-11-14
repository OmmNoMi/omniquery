import frappe
from frappe.model.document import Document


class OmniQuerySurveyor(Document):
	pass


def ensure_surveyor_for_user(user: str) -> str:
	"""The user's Surveyor record, created Active when they have none (#57).

	Records are named SURV-{surveyor_name}, so a second person with the same full name gets
	their email added to stay unique instead of failing the insert.
	"""
	existing = frappe.db.get_value("OmniQuery Surveyor", {"user": user}, "name")
	if existing:
		return existing
	name = frappe.utils.get_fullname(user) or user.split("@")[0]
	if frappe.db.exists("OmniQuery Surveyor", f"SURV-{name}"):
		name = f"{name} ({user})"
	doc = frappe.get_doc({"doctype": "OmniQuery Surveyor", "surveyor_name": name, "user": user, "status": "Active"})
	return doc.insert(ignore_permissions=True).name
