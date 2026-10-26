import json
import re


def resolve_response_title(responses=None, format_string="", fallback_title=""):
	"""Computes a human-readable title for survey responses based on the template's response_title_format.

	Mirrors src/utils/responseTitle.js.
	"""
	if not responses or not isinstance(responses, dict):
		return fallback_title or "Survey Response"

	# Normalize map: lowercase keys to string values
	norm_map = {}
	for k, v in responses.items():
		if v is not None and str(v).strip() != "":
			norm_map[str(k).lower().strip()] = str(v).strip()

	def get_field_val(*field_names):
		for name in field_names:
			m = norm_map.get(str(name).lower().strip())
			if m:
				return m
		return ""

	pattern = (format_string or "").strip() or "{respondent_name} - {village_gp} ({enterprise_name})"

	has_replaced_any = False

	def replace_token(match):
		nonlocal has_replaced_any
		field = match.group(1)
		lower_field = field.lower().strip()
		val = ""

		if any(sub in lower_field for sub in ["enterprise", "business", "shop", "shg"]):
			val = get_field_val(field, "enterprise_name", "business_name", "shop_name", "shg_name")
		elif any(sub in lower_field for sub in ["village", "gp", "panchayat", "block", "district", "location"]):
			val = get_field_val(field, "village_gp", "village", "gram_panchayat", "gp", "location", "block", "district")
		elif any(sub in lower_field for sub in ["respondent", "entrepreneur", "name", "person"]):
			val = get_field_val(field, "respondent_name", "entrepreneur_name", "full_name", "respondent", "name")
		else:
			val = get_field_val(field)

		if val:
			has_replaced_any = True
			return val
		return ""

	resolved = re.sub(r"\{([a-zA-Z0-9_\u0900-\u097F]+)\}", replace_token, pattern)

	if not has_replaced_any:
		direct_name = get_field_val("respondent_name", "entrepreneur_name", "full_name", "respondent", "name")
		direct_loc = get_field_val("village_gp", "village", "gram_panchayat", "gp", "block", "district")
		direct_biz = get_field_val("enterprise_name", "business_name", "shg_name")

		if direct_name and direct_loc and direct_biz:
			return f"{direct_name} - {direct_loc} ({direct_biz})"
		if direct_name and direct_loc:
			return f"{direct_name} - {direct_loc}"
		if direct_name:
			return direct_name
		return fallback_title or "Survey Response"

	# Clean formatting artifacts
	cleaned = re.sub(r"\(\s*\)", "", resolved)
	cleaned = re.sub(r"\[\s*\]", "", cleaned)
	cleaned = re.sub(r"\s+-\s+\(", " (", cleaned)
	cleaned = re.sub(r"\s*[-–—]\s*[-–—]\s*", " - ", cleaned)
	cleaned = re.sub(r"^\s*[-–—]\s*", "", cleaned)
	cleaned = re.sub(r"\s*[-–—]\s*$", "", cleaned)
	cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()

	return cleaned or fallback_title or "Survey Response"
