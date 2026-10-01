import hashlib
import json

import frappe


def compile_template_schema(template_document):
	"""Compiles and hashes template schema into JSON fields."""
	schema_dictionary = build_schema_dictionary(template_document)
	schema_json = json.dumps(schema_dictionary, separators=(",", ":"), sort_keys=True)
	template_document.compiled_schema_json = schema_json
	template_document.schema_hash_sha256 = calculate_schema_hash(schema_json)
	return schema_dictionary


def calculate_schema_hash(schema_json):
	"""Calculates deterministic SHA-256 hash of compiled schema."""
	return hashlib.sha256(schema_json.encode("utf-8")).hexdigest()


def build_schema_dictionary(template_document):
	"""Constructs canonical schema dictionary from template sections and questions."""
	return {
		"template_name": template_document.name or template_document.title,
		"title": template_document.title,
		"project": template_document.project,
		"version": template_document.version or 1,
		"status": template_document.status,
		"amended_from": template_document.amended_from,
		"response_title_format": getattr(template_document, "response_title_format", None) or "{respondent_name} - {village_gp} ({enterprise_name})",
		"is_public_citizen_link": bool(template_document.is_public_citizen_link),
		"auto_advance": bool(getattr(template_document, "auto_advance", 1)),
		"presentation_mode": getattr(template_document, "presentation_mode", "Standard Section") or "Standard Section",
		"sections": [format_section_dictionary(s) for s in (template_document.sections or [])],
		"questions": [format_question_dictionary(q) for q in (template_document.questions or [])],
	}


def format_section_dictionary(section_row):
	"""Formats a section child row into dictionary with Frappe native translation."""
	title = section_row.section_title or ""
	description = section_row.description or ""
	return {
		"section_code": section_row.section_code,
		"section_title": title,
		"section_title_translated": frappe._(title),
		"description": description,
		"description_translated": frappe._(description) if description else "",
		"display_order": section_row.display_order or section_row.idx,
	}


def format_question_dictionary(question_row):
	"""Formats a template question reference into dictionary and enriches metadata."""
	label = resolve_question_label(question_row)
	raw_options = parse_json_value(getattr(question_row, "options_json", None))
	question_dictionary = {
		"section_code": question_row.section_code,
		"question_code": question_row.question_code,
		"question": getattr(question_row, "question", None),
		"label": label,
		"label_en": label,
		"label_translated": frappe._(label),
		"field_type": getattr(question_row, "field_type", None) or "Text",
		"is_mandatory": bool(question_row.is_mandatory),
		"display_order": question_row.display_order or question_row.idx,
		"options": raw_options,
		"options_translated": [frappe._(str(opt)) for opt in raw_options] if isinstance(raw_options, list) else raw_options,
		"conditional_logic": parse_json_value(getattr(question_row, "conditional_logic_json", None)),
		"validation_rules": parse_json_value(getattr(question_row, "validation_rules_json", None)),
		"audio_prompt": getattr(question_row, "audio_prompt", None),
	}
	return enrich_question_metadata(question_row, question_dictionary)



def enrich_question_metadata(question_row, question_dictionary):
	"""Enriches question dictionary with control variants, ratings and option sets from master."""
	q_ref = getattr(question_row, "question", None)
	metadata = get_master_question_metadata(q_ref)
	merge_master_metadata(question_dictionary, metadata)
	resolve_question_options(question_dictionary, metadata)
	resolve_control_variant_and_toggle(question_row, question_dictionary, metadata)
	return question_dictionary


def get_master_question_metadata(q_ref):
	"""Fetches metadata fields from master question if linked."""
	if not q_ref:
		return {}
	fields = [
		"field_category", "control_variant", "rating_icon", "rating_max",
		"rating_step", "temporal_granularity", "geographic_granularity",
		"options_set", "allow_user_toggle"
	]
	return frappe.db.get_value("OmniQuery Question", q_ref, fields, as_dict=True) or {}


def merge_master_metadata(question_dict, metadata):
	"""Merges master metadata keys into question dict if not present."""
	for key, value in metadata.items():
		if value is not None and key not in question_dict:
			question_dict[key] = value


def resolve_question_options(question_dict, metadata):
	"""Populates options from option set if options list is empty."""
	if not question_dict.get("options") and metadata.get("options_set"):
		question_dict["options"] = resolve_option_set_items(metadata["options_set"])


def resolve_control_variant_and_toggle(question_row, question_dict, metadata):
	"""Determines effective control variant and user toggle flag."""
	t_var = getattr(question_row, "control_variant", None)
	m_var = metadata.get("control_variant")
	variant = t_var if t_var and t_var != "Auto" else (m_var or "Auto")
	question_dict["control_variant"] = variant
	t_tog = getattr(question_row, "allow_user_toggle", None)
	m_tog = metadata.get("allow_user_toggle")
	explicit_toggle = bool(t_tog if t_tog is not None else m_tog)
	question_dict["allow_user_toggle"] = explicit_toggle or (variant == "Auto")


def resolve_option_set_items(option_set_name):
	"""Resolves ordered option values from an OmniQuery Option Set."""
	items = frappe.get_all(
		"OmniQuery Option Item",
		filters={"parent": option_set_name},
		fields=["option_code"],
		order_by="idx asc",
	)
	return [item.option_code for item in items]


def resolve_question_label(question_row):
	"""Resolves effective label prioritizing custom override then master label."""
	if getattr(question_row, "custom_label_override", None):
		return question_row.custom_label_override
	if getattr(question_row, "label_en", None):
		return question_row.label_en
	if getattr(question_row, "question", None):
		return frappe.db.get_value("OmniQuery Question", question_row.question, "label_en")
	return question_row.question_code


def parse_json_value(raw_value):
	"""Safely parses JSON string or returns raw value."""
	if not raw_value:
		return None
	return json.loads(raw_value) if isinstance(raw_value, str) else raw_value
