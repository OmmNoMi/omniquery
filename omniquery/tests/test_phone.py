"""A Phone question holds a 10-digit mobile number, on every way in (#22).

src/utils/__tests__/phone.spec.js checks the field app's copy of the rule against the same values.
"""

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.api.sync import batch_push
from omniquery.services.idempotency import new_key
from omniquery.services.phone import invalid_phone_answers, is_valid_mobile
from omniquery.tests.utils import delete_test_docs, sync_records_of

RESPONSE = "OmniQuery Response"
TAG = frappe.generate_hash(length=8).upper()
VALID = ["9876543210", " 9876543210 ", "98765 43210", "98765-43210", "(98765) 43210", "+91 98765 43210", "919876543210", "09876543210"]
INVALID = ["98765", "987654321", "98765432101", "+1 98765 43210 1", "12abc", "98765abcde", "98765x43210", "98765 43210 ext", "919876543"]


def question(code, field_type, **extra):
	return {"section_code": "S1", "question_code": code, "label_en": code, "field_type": field_type, **extra}


class TestPhone(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls.project = frappe.get_doc({"doctype": "OmniQuery Project", "project_name": f"Phone {TAG}",
			"grantor_organization": "Test", "status": "Active"}).insert(ignore_permissions=True).name
		template = frappe.get_doc({"doctype": "OmniQuery Template", "title": f"Phone {TAG}", "project": cls.project,
			"status": "Draft", "sections": [{"section_code": "S1", "section_title": "Contact"}],
			"questions": [
				question("respondent_phone", "Phone"),
				# a question about phones is not a phone number
				question("owns_smartphone", "Single Choice (Radio)", options_json='["Yes", "No"]'),
				question("phone_brand", "Text"),
			]}).insert(ignore_permissions=True)
		template.submit()
		cls.template = template.name
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		# batch_push commits, so the test rollback cannot undo what it wrote
		frappe.set_user("Administrator")
		delete_test_docs([
			*sync_records_of(cls.template),
			("OmniQuery Template", {"project": cls.project}),
			("OmniQuery Project", {"name": cls.project}),
		])
		frappe.db.commit()
		super().tearDownClass()

	def response(self, answers, status="Submitted"):
		return frappe.get_doc({"doctype": RESPONSE, "idempotency_key": new_key(), "survey_template": self.template,
			"survey_status": status, "items": [{"question_code": code, "value_text": value} for code, value in answers.items()]})

	def test_is_valid_mobile(self):
		for value in VALID:
			self.assertTrue(is_valid_mobile(value), value)
		for value in [*INVALID, "", None]:
			self.assertFalse(is_valid_mobile(value), value)

	def test_only_a_phone_question_is_checked(self):
		questions = [question("respondent_phone", "Phone"), question("phone_brand", "Text")]
		self.assertEqual(invalid_phone_answers(questions, {"respondent_phone": "98765", "phone_brand": "Nokia"}), ["respondent_phone"])
		self.assertEqual(invalid_phone_answers(questions, {"respondent_phone": "+91 98765 43210", "phone_brand": "Nokia"}), [])
		self.assertEqual(invalid_phone_answers(questions, {"respondent_phone": " "}), [], "an unanswered number is the mandatory check's to refuse")

	def test_a_submitted_response_refuses_a_wrong_number(self):
		self.response({"respondent_phone": "+91 98765 43210", "owns_smartphone": "Yes", "phone_brand": "Nokia"}).insert(
			ignore_permissions=True, ignore_mandatory=True)
		bad = self.response({"respondent_phone": "12abc", "owns_smartphone": "Yes"})
		self.assertRaisesRegex(frappe.ValidationError, "respondent_phone", bad.insert, ignore_permissions=True, ignore_mandatory=True)

	def test_a_draft_may_hold_a_partial_number(self):
		draft = self.response({"respondent_phone": "98765"}, status="Draft")
		draft.insert(ignore_permissions=True, ignore_mandatory=True)
		draft.survey_status = "Submitted"
		self.assertRaises(frappe.ValidationError, draft.save, ignore_permissions=True)

	def test_sync_refuses_a_wrong_number_and_keeps_a_smartphone_answer(self):
		good, bad = new_key(), new_key()
		results = batch_push(submissions=[
			{"idempotency_key": key, "survey_template": self.template, "template_version": 1,
				"items": [{"question_code": "respondent_phone", "value": phone}, {"question_code": "owns_smartphone", "value": "Yes"}]}
			for key, phone in ((good, "+91 98765 43210"), (bad, "12abc"))
		])["results"]
		by_key = {r["idempotency_key"]: r for r in results}
		self.assertEqual(by_key[good]["status"], "SUCCESS", results)
		self.assertEqual(by_key[bad]["status"], "FAILED", results)
		self.assertIn("10-digit", by_key[bad].get("error") or "", results)
		self.assertFalse(frappe.db.exists(RESPONSE, bad))
