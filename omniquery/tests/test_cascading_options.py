"""A Block must be one of the chosen District's blocks, on every way in (#24)."""

import json

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.api.sync import batch_push
from omniquery.services.cascading_options import invalid_dependent_answers, options_for_parent
from omniquery.services.idempotency import new_key
from omniquery.tests.utils import delete_test_docs, sync_records_of

RESPONSE = "OmniQuery Response"
TAG = frappe.generate_hash(length=8).upper()
BLOCKS = {"Baran": ["Chhipabarod", "Baran"], "Churu": ["Ratangarh", "Sujangarh"]}


def district(**extra):
	return {"section_code": "S1", "question_code": "district", "label_en": "District",
		"field_type": "Single Choice (Dropdown)", "options_json": json.dumps(["Baran", "Churu"]), **extra}


def block(options=BLOCKS, **extra):
	return {"section_code": "S1", "question_code": "block", "label_en": "Block", "field_type": "Single Choice (Dropdown)",
		"depends_on_field": "district", "options_json": json.dumps(options), **extra}


class TestCascadingOptions(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls.project = frappe.get_doc({"doctype": "OmniQuery Project", "project_name": f"Cascading {TAG}",
			"grantor_organization": "Test", "status": "Active"}).insert(ignore_permissions=True).name
		cls.template = cls.make_template([district(), block()]).name
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		# batch_push commits, so the test rollback cannot undo what it wrote
		frappe.set_user("Administrator")
		delete_test_docs([
			*sync_records_of(cls.template),
			("OmniQuery Template", {"project": cls.project}),
			("OmniQuery Option Set", {"set_name": f"Cascading {TAG}"}),
			("OmniQuery Project", {"name": cls.project}),
		])
		frappe.db.commit()
		super().tearDownClass()

	@classmethod
	def make_template(cls, questions, submit=True):
		doc = frappe.get_doc({"doctype": "OmniQuery Template", "title": f"Cascading {TAG} {frappe.generate_hash(length=4)}",
			"project": cls.project, "status": "Draft", "sections": [{"section_code": "S1", "section_title": "Place"}],
			"questions": questions}).insert(ignore_permissions=True)
		if submit:
			doc.submit()
		return doc

	def response(self, answers, status="Submitted"):
		return frappe.get_doc({"doctype": RESPONSE, "idempotency_key": new_key(), "survey_template": self.template,
			"survey_status": status, "items": [
				{"question_code": code, **({"value_json": json.dumps(value)} if isinstance(value, list) else {"value_text": value})}
				for code, value in answers.items()
			]})

	def test_options_for_parent(self):
		self.assertEqual(options_for_parent(BLOCKS, "Churu"), ["Ratangarh", "Sujangarh"])
		self.assertEqual(options_for_parent(BLOCKS, None), [], "nothing is offered before the parent is answered")
		self.assertEqual(options_for_parent(BLOCKS, ""), [])
		self.assertEqual(options_for_parent(BLOCKS, "Jaipur"), [])
		self.assertEqual(options_for_parent({"1": ["a"]}, 1), ["a"], "a numeric parent answer finds its string key")
		self.assertEqual(options_for_parent(["x", "y"], None), ["x", "y"], "a flat list ignores the parent")

	def test_invalid_dependent_answers(self):
		questions = [{"question_code": "district", "options": ["Baran", "Churu"]},
			{"question_code": "block", "depends_on_field": "district", "options": BLOCKS}]
		self.assertEqual(invalid_dependent_answers(questions, {"district": "Churu", "block": "Ratangarh"}), [])
		self.assertEqual(invalid_dependent_answers(questions, {"district": "Baran", "block": "Ratangarh"}), ["block"])
		self.assertEqual(invalid_dependent_answers(questions, {"block": "Ratangarh"}), ["block"], "a block needs its district")
		self.assertEqual(invalid_dependent_answers(questions, {"district": "Churu"}), [], "an unanswered block is not invalid")
		self.assertEqual(invalid_dependent_answers(questions, {"district": "Churu", "block": ["Ratangarh", "Baran"]}), ["block"],
			"every choice of a multiple answer must be offered")

	def test_a_submitted_response_refuses_a_block_from_another_district(self):
		self.response({"district": "Churu", "block": "Ratangarh"}).insert(ignore_permissions=True, ignore_mandatory=True)
		self.response({"district": "Churu", "block": ["Ratangarh", "Sujangarh"]}).insert(ignore_permissions=True, ignore_mandatory=True)
		bad =self.response({"district": "Baran", "block": "Ratangarh"})
		self.assertRaisesRegex(frappe.ValidationError, "block", bad.insert, ignore_permissions=True, ignore_mandatory=True)
		multi = self.response({"district": "Churu", "block": ["Ratangarh", "Chhipabarod"]})
		self.assertRaises(frappe.ValidationError, multi.insert, ignore_permissions=True, ignore_mandatory=True)

	def test_a_draft_may_be_half_answered(self):
		draft = self.response({"district": "Baran", "block": "Ratangarh"}, status="Draft")
		draft.insert(ignore_permissions=True, ignore_mandatory=True)
		draft.survey_status = "Submitted"
		self.assertRaises(frappe.ValidationError, draft.save, ignore_permissions=True)

	def test_sync_rejects_a_block_from_another_district(self):
		good, bad = new_key(), new_key()
		results = batch_push(submissions=[
			{"idempotency_key": key, "survey_template": self.template, "template_version": 1,
				"items": [{"question_code": "district", "value": d}, {"question_code": "block", "value": "Ratangarh"}]}
			for key, d in ((good, "Churu"), (bad, "Baran"))
		])["results"]
		status = {r["idempotency_key"]: r["status"] for r in results}
		self.assertEqual(status[good], "SUCCESS", results)
		self.assertEqual(status[bad], "FAILED", results)
		self.assertFalse(frappe.db.exists(RESPONSE, bad))

	def test_publishing_refuses_a_dependency_the_field_app_cannot_offer(self):
		# each case is otherwise valid, so only the one rule it names can refuse it
		broken = {
			"names a missing question": [district(), block(depends_on_field="village")],
			"depends on itself": [district(), block(depends_on_field="block")],
			"has flat options": [district(), block(options=["Baran"])],
			"groups options with no parent": [district(), block(depends_on_field="")],
			"has a key the parent does not offer": [district(), block(options={**BLOCKS, "Jaipur": ["Amer"]})],
			"is a loop": [district(depends_on_field="block",
				options_json=json.dumps({"Ratangarh": ["Baran"], "Sujangarh": ["Churu"]})), block()],
		}
		for case, questions in broken.items():
			with self.subTest(case):
				draft = self.make_template(questions, submit=False)  # a draft may be saved half-built
				self.assertRaises(frappe.ValidationError, draft.submit)

	def test_an_option_set_is_grouped_all_or_nothing(self):
		mixed = frappe.get_doc({"doctype": "OmniQuery Option Set", "set_name": f"Cascading {TAG}", "scope": "Platform",
			"options": [{"option_code": "Ratangarh", "label_text": "Ratangarh", "parent_option": "Churu"},
				{"option_code": "Amer", "label_text": "Amer"}]})
		self.assertRaises(frappe.ValidationError, mixed.insert, ignore_permissions=True)
		mixed.options[1].parent_option = "Jaipur"
		mixed.insert(ignore_permissions=True)
