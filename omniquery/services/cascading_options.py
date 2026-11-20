"""Choices that depend on an earlier answer, such as Block under District (#24).

A question with depends_on_field names its parent's question_code, and its options are a dict of
parent option -> that parent's choices. src/utils/cascadingOptions.js holds the same rules for the
field app; keep the two in step.
"""

import frappe
from frappe import _

from omniquery.services.response_title import answers_from_items


def is_grouped(options):
	return isinstance(options, dict)


def options_for_parent(options, parent_value):
	"""A question's choices for one parent answer; none until the parent is answered."""
	if not is_grouped(options):
		return options if isinstance(options, list) else []
	if parent_value is None or parent_value == "":
		return []
	return options.get(str(parent_value)) or []


def option_value(option):
	if isinstance(option, dict):
		value = option.get("value")
		return option.get("label") if value is None else value
	return option


def all_options(options):
	"""Every choice a question can offer, across all parent answers."""
	if is_grouped(options):
		return [option for group in options.values() if isinstance(group, list) for option in group]
	return options if isinstance(options, list) else []


def validate_cascading_questions(questions):
	"""Refuses a template whose dependent questions the field app could not offer choices for."""
	by_code = {q.get("question_code"): q for q in questions or []}
	for question in questions or []:
		code, parent_code = question.get("question_code"), question.get("depends_on_field")
		options = question.get("options")
		if not parent_code:
			if is_grouped(options):
				frappe.throw(_("Question {0} groups its options by a parent answer, so it needs Depends On Field.").format(code))
			continue
		if parent_code == code or parent_code not in by_code:
			frappe.throw(_("Question {0} depends on {1}, which is not another question in this template.").format(code, parent_code))
		if not is_grouped(options) or not options:
			frappe.throw(_("Question {0} depends on {1}, so its options must be grouped by {1}'s answers.").format(code, parent_code))
		_refuse_a_cycle(by_code, code)
		parent_choices = {str(option_value(o)) for o in all_options(by_code[parent_code].get("options"))}
		unknown = [key for key in options if parent_choices and key not in parent_choices]
		if unknown:
			frappe.throw(_("Question {0} has options for {1}, which {2} does not offer.").format(code, ", ".join(unknown), parent_code))


def _refuse_a_cycle(by_code, code):
	seen, current = {code}, by_code[code].get("depends_on_field")
	while current:
		if current in seen:
			frappe.throw(_("Question {0} depends on itself through {1}.").format(code, current))
		seen.add(current)
		current = (by_code.get(current) or {}).get("depends_on_field")


def response_answers(items):
	"""question_code -> answer, with a multiple choice read back as its list."""
	answers = answers_from_items(items)
	for item in items or []:
		if item.question_code and item.value_json:
			answers[item.question_code] = frappe.parse_json(item.value_json)
	return answers


def invalid_dependent_answers(questions, answers):
	"""question codes whose answer is not one of the choices offered for the parent's answer."""
	invalid = []
	for question in questions or []:
		code, parent_code = question.get("question_code"), question.get("depends_on_field")
		answer = answers.get(code)
		if not parent_code or answer is None or answer == "":
			continue
		allowed = {str(option_value(o)) for o in options_for_parent(question.get("options"), answers.get(parent_code))}
		values = answer if isinstance(answer, list) else [answer]
		if any(str(value) not in allowed for value in values):
			invalid.append(code)
	return invalid
