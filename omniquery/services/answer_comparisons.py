"""One number answer checked against another, such as expenses against income (#159).

A template row's Validation Rules (JSON) names the other question beside its min/max:
{"compare_to": "q_income", "operator": "lte", "message": "Expenses cannot exceed income"}.
src/utils/answerComparison.js checks the answers on the device, at Next and Submit; keep the two in
step. A Response is not checked here: it carries answers to questions the surveyor was never shown,
and only the device knows which those were.
"""

import frappe
from frappe import _

COMPARISON_OPERATORS = ("lte", "gte", "eq")
NUMBER_FIELD_TYPES = ("Integer", "Decimal", "Currency (INR)", "Range (Slider)", "Rating (1-5)")


def validate_comparison_rules(schema):
	"""Refuses a template whose answer comparisons the device could not check."""
	section_index = {s.get("section_code"): i for i, s in enumerate(schema.get("sections") or [])}
	by_code = {q.get("question_code"): q for q in schema.get("questions") or []}
	for question in schema.get("questions") or []:
		rule = question.get("validation_rules")
		if not isinstance(rule, dict) or not (rule.get("compare_to") or rule.get("operator")):
			continue
		code, other_code = question.get("question_code"), rule.get("compare_to")
		other = by_code.get(other_code) if other_code != code else None
		if not other:
			frappe.throw(_("Question {0} is compared with {1}, which is not another question in this template.").format(code, other_code))
		if rule.get("operator") not in COMPARISON_OPERATORS:
			frappe.throw(_("Question {0} has operator {1}; use lte, gte or eq.").format(code, rule.get("operator")))
		for q in (question, other):
			if q.get("field_type") not in NUMBER_FIELD_TYPES:
				frappe.throw(_("Question {0} is compared as a number, so it needs a number field type.").format(q.get("question_code")))
		if section_index.get(other.get("section_code"), -1) > section_index.get(question.get("section_code"), -1):
			frappe.throw(_("Question {0} is compared with {1}, which comes in a later section.").format(code, other_code))
		if not str(rule.get("message") or "").strip():
			frappe.throw(_("Question {0} is compared with {1}, so it needs a message to show the surveyor.").format(code, other_code))
