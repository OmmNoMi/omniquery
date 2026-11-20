"""A respondent's mobile number (#22).

A question is a phone number only when its template sets field type Phone; nothing is guessed from
its code or label, so a question like owns_smartphone stays a Yes/No. src/utils/phone.js holds the
same rule for the field app; keep the two in step.
"""

import re

from frappe.utils import validate_phone_number

PHONE_FIELD_TYPE = "Phone"


def is_valid_mobile(value):
	"""Ten digits, written with spaces, dashes or brackets, and with +91, 91 or 0 in front if wanted."""
	text = str(value if value is not None else "").strip()
	# the characters Frappe allows in a phone number
	if not validate_phone_number(text):
		return False
	digits = re.sub(r"\D", "", text)
	if len(digits) == 12 and digits.startswith("91"):
		digits = digits[2:]
	elif len(digits) == 11 and digits.startswith("0"):
		digits = digits[1:]
	return len(digits) == 10


def invalid_phone_answers(questions, answers):
	"""question codes of Phone questions whose answer is not a 10-digit mobile number."""
	invalid = []
	for question in questions or []:
		code = question.get("question_code")
		if question.get("field_type") != PHONE_FIELD_TYPE:
			continue
		value = answers.get(code)
		if value is None or str(value).strip() == "":
			continue
		if not is_valid_mobile(value):
			invalid.append(code)
	return invalid
