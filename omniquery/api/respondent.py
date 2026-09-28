import frappe, hashlib
from frappe import _

@frappe.whitelist(allow_guest=False)
def get_manifest(district=None, block=None, respondent_type=None):
	"""
	Returns a compact JSON search index of registered respondents for offline lookups
	and duplicate registration prevention across any survey domain.
	"""
	filters = {}
	if district:
		filters["district"] = district
	if block:
		filters["block"] = block
	if respondent_type:
		filters["respondent_type"] = respondent_type
		
	respondents = frappe.get_all(
		"OmniServey Respondent",
		filters=filters,
		fields=[
			"name",
			"respondent_uid",
			"primary_name",
			"respondent_type",
			"phone_hash",
			"village_city",
			"block",
			"district",
			"state"
		],
		limit=5000
	)
	return {
		"count": len(respondents),
		"respondents": respondents
	}

@frappe.whitelist(allow_guest=False)
def register_respondent(payload):
	"""Registers a new generic respondent with automatic PII encryption & search hashing."""
	if isinstance(payload, str):
		payload = frappe.parse_json(payload)
		
	uid = payload.get("respondent_uid")
	if not uid:
		frappe.throw(_("Respondent UID is mandatory"), frappe.ValidationError)
		
	doc = frappe.new_doc("OmniServey Respondent")
	doc.respondent_uid = uid
	doc.primary_name = payload.get("primary_name")
	doc.respondent_type = payload.get("respondent_type") or "Individual"
	doc.phone_number = payload.get("phone_number")
	doc.email = payload.get("email")
	doc.gender = payload.get("gender")
	doc.age_or_established_year = payload.get("age_or_established_year")
	doc.village_city = payload.get("village_city")
	doc.block = payload.get("block")
	doc.district = payload.get("district")
	doc.state = payload.get("state")
	doc.pincode = payload.get("pincode")
	doc.gps_latitude = payload.get("gps_latitude")
	doc.gps_longitude = payload.get("gps_longitude")
	doc.custom_attributes_json = payload.get("custom_attributes_json")
	doc.notes = payload.get("notes")
	
	if payload.get("id_number"):
		doc.id_number_encrypted = payload.get("id_number")
		
	doc.insert(ignore_permissions=True)
	frappe.db.commit()
	
	return {
		"name": doc.name,
		"respondent_uid": doc.respondent_uid,
		"phone_hash": doc.phone_hash
	}
