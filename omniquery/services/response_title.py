import re

DEFAULT_RESPONSE_TITLE_FORMAT = "{respondent_name} - {village_gp} ({enterprise_name})"

# a token is a question code, which may be written in Devanagari
TOKEN = re.compile(r"\{([a-zA-Z0-9_\u0900-\u097F]+)\}")

NAME_ALIASES = ("respondent_name", "entrepreneur_name", "full_name", "respondent", "name")
PLACE_ALIASES = ("village_gp", "village", "gram_panchayat", "gp", "location", "block", "district")
BUSINESS_ALIASES = ("enterprise_name", "business_name", "shop_name", "shg_name")


def resolve_response_title(responses=None, format_string="", fallback_title=""):
	"""A readable title for a response from the template's response_title_format.

	The same rules as src/utils/responseTitle.js. test/fixtures/response_titles.json holds the
	cases both must agree on.
	"""
	fallback = fallback_title or "Survey Response"
	if not responses or not isinstance(responses, dict):
		return fallback

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

	pattern = (format_string or "").strip() or DEFAULT_RESPONSE_TITLE_FORMAT
	has_replaced_any = False

	def replace_token(match):
		nonlocal has_replaced_any
		field = match.group(1)
		lower_field = field.lower().strip()

		if any(sub in lower_field for sub in ("enterprise", "business", "shop", "shg")):
			val = get_field_val(field, *BUSINESS_ALIASES)
		elif any(sub in lower_field for sub in ("village", "gp", "panchayat", "block", "district", "location")):
			val = get_field_val(field, *PLACE_ALIASES)
		elif any(sub in lower_field for sub in ("respondent", "entrepreneur", "name", "person")):
			val = get_field_val(field, *NAME_ALIASES)
		else:
			val = get_field_val(field)

		if val:
			has_replaced_any = True
		return val

	resolved = TOKEN.sub(replace_token, pattern)

	if not has_replaced_any:
		direct_name = get_field_val(*NAME_ALIASES)
		direct_loc = get_field_val("village_gp", "village", "gram_panchayat", "gp", "block", "district")
		direct_biz = get_field_val("enterprise_name", "business_name", "shg_name")

		if direct_name and direct_loc and direct_biz:
			return f"{direct_name} - {direct_loc} ({direct_biz})"
		if direct_name and direct_loc:
			return f"{direct_name} - {direct_loc}"
		if direct_name:
			return direct_name
		return fallback

	# "Sunita Devi - Rampur ()" -> "Sunita Devi - Rampur", " - Rampur" -> "Rampur"
	cleaned = re.sub(r"\(\s*\)", "", resolved)
	cleaned = re.sub(r"\[\s*\]", "", cleaned)
	cleaned = re.sub(r"\s+-\s+\(", " (", cleaned)
	cleaned = re.sub(r"\s*[-–—]\s*[-–—]\s*", " - ", cleaned)
	cleaned = re.sub(r"^\s*[-–—]\s*", "", cleaned)
	cleaned = re.sub(r"\s*[-–—]\s*$", "", cleaned)
	cleaned = re.sub(r"\s{2,}", " ", cleaned).strip()

	return cleaned or fallback


def answers_from_items(items):
	"""question_code -> answer from a response's item rows, which sync has already cleaned of HTML."""
	answers = {}
	for item in items or []:
		if not item.question_code or item.question_code in answers:
			continue
		for value in (item.value_text, item.value_numeric, item.value_json):
			if value is not None and value != "":
				# a Float field reads back 6.0 for an answer of 6
				if isinstance(value, float) and value.is_integer():
					value = int(value)
				answers[item.question_code] = value
				break
	return answers
