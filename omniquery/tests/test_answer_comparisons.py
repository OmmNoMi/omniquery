"""A template refuses an answer comparison the device could not check (#159)."""

import json

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.services.answer_comparisons import validate_comparison_rules
from omniquery.tests.utils import delete_test_docs

TAG = frappe.generate_hash(length=8).upper()
RULE = {"compare_to": "income", "operator": "lte", "message": "Expenses cannot exceed income"}


def question(code, section="S1", field_type="Currency (INR)", rules=None):
	return {"section_code": section, "question_code": code, "label_en": code, "field_type": field_type,
		"validation_rules_json": json.dumps(rules) if rules else None}


def schema(*questions, sections=("S1", "S2")):
	"""the compiled schema's shape, as validate_comparison_rules reads it"""
	return {"sections": [{"section_code": code} for code in sections], "questions": [
		{**q, "validation_rules": json.loads(q["validation_rules_json"]) if q["validation_rules_json"] else None}
		for q in questions
	]}


class TestAnswerComparisons(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls.project = frappe.get_doc({"doctype": "OmniQuery Project", "project_name": f"Comparisons {TAG}",
			"grantor_organization": "Test", "status": "Active"}).insert(ignore_permissions=True).name
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		delete_test_docs([("OmniQuery Template", {"project": cls.project}), ("OmniQuery Project", {"name": cls.project})])
		frappe.db.commit()
		super().tearDownClass()

	def make_template(self, questions):
		return frappe.get_doc({"doctype": "OmniQuery Template", "title": f"Comparisons {TAG} {frappe.generate_hash(length=4)}",
			"project": self.project, "status": "Draft", "questions": questions, "sections": [
				{"section_code": "S1", "section_title": "Earnings"}, {"section_code": "S2", "section_title": "Spending"}]
		}).insert(ignore_permissions=True)

	def assertRefused(self, pattern, *questions):
		self.assertRaisesRegex(frappe.ValidationError, pattern, validate_comparison_rules, schema(*questions))

	def test_a_good_rule_passes(self):
		for operator in ("lte", "gte", "eq"):
			validate_comparison_rules(schema(question("income"), question("expenses", rules={**RULE, "operator": operator})))
		# the other answer may come in an earlier section, and either may be any number type
		validate_comparison_rules(schema(question("income", field_type="Integer"),
			question("expenses", section="S2", field_type="Decimal", rules={"min": 0, **RULE})))
		for field_type in ("Range (Slider)", "Rating (1-5)"):
			validate_comparison_rules(schema(question("income", field_type=field_type), question("expenses", rules=RULE)))

	def test_rules_without_a_comparison_are_left_alone(self):
		validate_comparison_rules(schema(question("age", field_type="Text", rules={"min": 0, "max": 7}), question("note")))
		validate_comparison_rules({"sections": [], "questions": [{"question_code": "x", "validation_rules": [1, 2]}]})

	def test_the_other_question_must_be_in_the_template(self):
		self.assertRefused("expenses is compared with salary", question("income"), question("expenses", rules={**RULE, "compare_to": "salary"}))
		self.assertRefused("not another question", question("expenses", rules={**RULE, "compare_to": "expenses"}))
		self.assertRefused("not another question", question("income"), question("expenses", rules={"operator": "lte", "message": "m"}))

	def test_the_operator_must_be_lte_gte_or_eq(self):
		self.assertRefused("operator lt", question("income"), question("expenses", rules={**RULE, "operator": "lt"}))
		self.assertRefused("operator None", question("income"), question("expenses", rules={"compare_to": "income", "message": "m"}))

	def test_both_questions_must_be_numbers(self):
		self.assertRefused("Question income is compared as a number",
			question("income", field_type="Text"), question("expenses", rules=RULE))
		self.assertRefused("Question expenses is compared as a number",
			question("income"), question("expenses", field_type="Single Choice (Radio)", rules=RULE))

	def test_the_other_question_cannot_come_later(self):
		self.assertRefused("income, which comes in a later section",
			question("income", section="S2"), question("expenses", section="S1", rules=RULE))

	def test_a_rule_needs_a_message(self):
		self.assertRefused("needs a message", question("income"), question("expenses", rules={**RULE, "message": "  "}))
		self.assertRefused("needs a message", question("income"), question("expenses", rules={"compare_to": "income", "operator": "lte"}))

	def test_a_template_is_checked_when_submitted(self):
		bad = self.make_template([question("income"), question("expenses", rules={**RULE, "operator": "less"})])
		self.assertRaisesRegex(frappe.ValidationError, "operator less", bad.submit)
		# a draft may be saved half-built
		self.assertEqual(frappe.db.get_value("OmniQuery Template", bad.name, "docstatus"), 0)
		good = self.make_template([question("income"), question("expenses", section="S2", rules=RULE)])
		good.submit()
		compiled = json.loads(good.compiled_schema_json)
		self.assertEqual(next(q for q in compiled["questions"] if q["question_code"] == "expenses")["validation_rules"], RULE,
			"the device reads the rule from validation_rules")
