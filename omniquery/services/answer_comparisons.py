"""One number answer checked against another, such as expenses against income (#159).

A template row's Validation Rules (JSON) names the other question beside its min/max:
{"compare_to": "q_income", "operator": "lte", "message": "Expenses cannot exceed income",
"message_hi": "खर्च आय से अधिक नहीं हो सकता"}. src/utils/answerComparison.js checks the answers on
the device, at Next and Submit; keep the two in step. A Response is not checked here: it carries
answers to questions the surveyor was never shown, and only the device knows which those were.
"""

import frappe
from frappe import _

COMPARISON_OPERATORS = ("lte", "gte", "eq")
# what QuestionCard takes a number for: these field types, or a control it draws as a number
NUMBER_FIELD_TYPES = ("Integer", "Decimal", "Currency (INR)", "Range (Slider)", "Rating (1-5)")
NUMBER_CONTROL_VARIANTS = ("currency", "range", "slider", "rating")


def is_number_question(question):
	variant = str(question.get("control_variant") or "").lower()
	return question.get("field_type") in NUMBER_FIELD_TYPES or variant in NUMBER_CONTROL_VARIANTS


def validate_comparison_rules(schema):
	"""Refuses a template whose answer comparisons the device could not check."""
	problems = comparison_rule_problems(schema)
	if problems:
		frappe.throw(problems[0])


def comparison_rule_problems(schema):
	"""Every answer comparison in a compiled schema the device could not check, one message each."""
	section_index = {s.get("section_code"): i for i, s in enumerate(schema.get("sections") or [])}
	by_code = {q.get("question_code"): q for q in schema.get("questions") or []}
	problems = []
	for question in schema.get("questions") or []:
		problem = rule_problem(question, by_code, section_index)
		if problem:
			problems.append(problem)
	return problems


def rule_problem(question, by_code, section_index):
	rule = question.get("validation_rules")
	if not isinstance(rule, dict) or not (rule.get("compare_to") or rule.get("operator")):
		return None
	code, other_code = question.get("question_code"), rule.get("compare_to")
	if not other_code:
		return _("Question {0} has an operator but no compare_to; name the question to compare with.").format(code)
	other = by_code.get(other_code) if isinstance(other_code, str) and other_code != code else None
	if not other:
		return _("Question {0} is compared with {1}, which is not another question in this template.").format(code, other_code)
	if not rule.get("operator"):
		return _("Question {0} is compared with {1} but has no operator; use lte, gte or eq.").format(code, other_code)
	if rule.get("operator") not in COMPARISON_OPERATORS:
		return _("Question {0} has operator {1}; use lte, gte or eq.").format(code, rule.get("operator"))
	for q in (question, other):
		if not is_number_question(q):
			return _("Question {0} is compared as a number, so it needs a number field type.").format(q.get("question_code"))
	if section_index.get(other.get("section_code"), -1) > section_index.get(question.get("section_code"), -1):
		return _("Question {0} is compared with {1}, which comes in a later section.").format(code, other_code)
	if not str(rule.get("message") or "").strip():
		return _("Question {0} is compared with {1}, so it needs a message to show the surveyor.").format(code, other_code)
	return None
