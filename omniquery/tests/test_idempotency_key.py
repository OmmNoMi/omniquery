"""The key an interview is filed under must be a UUIDv4, on every way in (#25)."""

import json
import uuid

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.api.sync import batch_push, sync_draft
from omniquery.services.idempotency import InvalidIdempotencyKey, canonical_key, require_key
from omniquery.tests.utils import delete_test_docs

RESPONSE = "OmniQuery Response"
AUDIT = "OmniQuery Sync Audit Log"
FIELD_ERROR = "OmniQuery Field Error Log"
TAG = frappe.generate_hash(length=8).upper()


def push_one(sub):
	return batch_push(submissions=[sub])["results"][0]


class TestIdempotencyKey(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		project = frappe.get_doc({"doctype": "OmniQuery Project", "project_name": f"Idempotency {TAG}",
			"grantor_organization": "Test", "status": "Active"}).insert(ignore_permissions=True)
		template = frappe.get_doc({"doctype": "OmniQuery Template", "title": f"Idempotency {TAG}",
			"project": project.name, "status": "Draft"}).insert(ignore_permissions=True)
		template.submit()
		cls.project, cls.template = project.name, template.name
		cls.keys = []

	@classmethod
	def tearDownClass(cls):
		# batch_push and sync_draft commit, so the test rollback cannot undo what they wrote
		frappe.set_user("Administrator")
		delete_test_docs([
			(RESPONSE, {"survey_template": cls.template}),
			(RESPONSE, {"name": ["in", cls.keys or [""]]}),
			(AUDIT, {"idempotency_key": ["in", cls.keys or [""]]}),
			(FIELD_ERROR, {"question_code": ["in", cls.keys or [""]]}),
			("OmniQuery Template", {"name": cls.template}),
			("OmniQuery Project", {"name": cls.project}),
		])
		frappe.db.commit()
		super().tearDownClass()

	def sub(self, key, **extra):
		self.keys.append(key)
		return {"idempotency_key": key, "survey_template": self.template, "template_version": 1,
			"items": [{"question_code": "q1", "value": "Sunita"}], **extra}

	def test_canonical_key(self):
		key = str(uuid.uuid4())
		for spelling in (key, key.upper(), f"{{{key}}}", f"urn:uuid:{key}", key.replace("-", "")):
			self.assertEqual(canonical_key(spelling), key, spelling)
		for legacy in ("OQS-WATER-abc123", "WAL-1730000000000-x1y2z"):
			self.assertEqual(canonical_key(legacy), legacy, "a key from a build before #25 is kept as sent")
		v4 = uuid.UUID(key)
		wrong_variant = str(uuid.UUID(int=v4.int & ~(0xC << 60) | (0xC << 60)))  # Microsoft variant, version still 4
		for bad in (str(uuid.uuid1()), str(uuid.uuid5(uuid.NAMESPACE_DNS, "x")), wrong_variant, "TEST-1", "", None, 42):
			self.assertIsNone(canonical_key(bad), bad)

	def test_a_key_that_is_not_a_uuidv4_is_rejected_and_recorded(self):
		key = str(uuid.uuid1())
		first, retry = push_one(self.sub(key)), push_one(self.sub(key))
		for result in (first, retry):
			self.assertEqual((result["status"], result["idempotency_key"]), ("REJECTED", key))
			self.assertIn("UUIDv4", result["error"])
		self.assertFalse(frappe.db.exists(RESPONSE, {"idempotency_key": key}))
		audit = frappe.get_doc(AUDIT, {"idempotency_key": key})
		self.assertEqual(audit.sync_status, "REJECTED")
		self.assertEqual(json.loads(audit.raw_payload)["idempotency_key"], key, "the payload is kept to be looked at")
		self.assertEqual(frappe.db.count(AUDIT, {"idempotency_key": key}), 1, "a retry adds no audit row")
		self.assertEqual(frappe.db.count(FIELD_ERROR, {"question_code": key}), 1, "a retry adds no error row")

	def test_one_interview_however_its_key_is_spelled(self):
		key = str(uuid.uuid4())
		upper = key.upper()
		first = push_one(self.sub(upper))
		self.assertEqual(first["status"], "SUCCESS", first)
		self.assertEqual(first["idempotency_key"], upper, "the device matches the reply by the key it sent")
		self.assertEqual(first["doc_name"], key)
		again = push_one(self.sub(f"{{{key}}}"))
		self.assertEqual(again["status"], "DUPLICATE_SKIPPED", again)
		self.assertEqual(frappe.db.count(RESPONSE, {"idempotency_key": key}), 1)

	def test_a_legacy_key_still_syncs(self):
		for key in (f"OQS-{TAG}-abc123", f"WAL-{TAG}-x1y2z"):
			result = push_one(self.sub(key))
			self.assertEqual((result["status"], result["doc_name"]), ("SUCCESS", key), result)
		draft = f"OQS-{TAG}-draft"
		self.keys.append(draft)
		reply = sync_draft({"idempotency_key": draft, "survey_template": self.template, "items": []})
		self.assertEqual((reply["status"], reply["doc_name"]), ("SUCCESS", draft), reply)

	def test_sync_draft_checks_the_key(self):
		bad = f"DRAFT-{TAG}"
		reply = sync_draft({"idempotency_key": bad, "survey_template": self.template, "items": []})
		self.assertEqual(reply["status"], "REJECTED")
		self.assertFalse(frappe.db.exists(RESPONSE, bad))

		key = str(uuid.uuid4())
		self.keys.append(key)
		for spelling in (key.upper(), key):
			reply = sync_draft({"idempotency_key": spelling, "survey_template": self.template, "items": []})
			self.assertEqual((reply["status"], reply["doc_name"]), ("SUCCESS", key), reply)
		self.assertEqual(frappe.db.count(RESPONSE, {"idempotency_key": key}), 1, "the second spelling updates the draft")

	def test_the_doctype_enforces_the_key(self):
		# Desk, Data Import and the REST API reach the Response without going through sync
		doc = frappe.get_doc({"doctype": RESPONSE, "idempotency_key": f"DESK-{TAG}", "survey_template": self.template})
		self.assertRaises(InvalidIdempotencyKey, doc.insert, ignore_permissions=True, ignore_mandatory=True)

		key = str(uuid.uuid4())
		doc = frappe.get_doc({"doctype": RESPONSE, "idempotency_key": key.upper(), "survey_template": self.template})
		doc.insert(ignore_permissions=True, ignore_mandatory=True)  # only the naming is under test
		self.assertEqual((doc.name, doc.idempotency_key), (key, key))

		doc = frappe.get_doc({"doctype": RESPONSE, "survey_template": self.template})
		doc.insert(ignore_permissions=True, ignore_mandatory=True)
		self.assertEqual(doc.name, doc.idempotency_key)
		self.assertEqual(uuid.UUID(doc.name).version, 4, "a Response made without a key gets one")

	def test_require_key(self):
		self.assertEqual(uuid.UUID(require_key(None)).version, 4)
		self.assertRaises(InvalidIdempotencyKey, require_key, "TEST-1")
