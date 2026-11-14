import json

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.api.sync import batch_push, normalize_submission_payload
from omniquery.tests.utils import delete_test_docs

# batch_push commits mid-request, so the FrappeTestCase rollback cannot undo it: tearDownClass deletes
# everything these tests create, matched by this prefix.
PREFIX = f"TEST-LEGACY-{frappe.generate_hash(length=6)}"


def legacy_payload(key=None, **extra):
	"""A WAL entry in the old offline shape, which carries no surveyor."""
	payload = {
		"template_name": TestLegacyPayloadAdapter.template,
		"responses": {"block": "Sujangarh", "district": "Churu"},
		"gps_coordinates": {"latitude": 27.8124, "longitude": 74.4573, "accuracy": 12.5},
		"saved_at": "2026-09-29T13:40:40.634Z",
	}
	return {**payload, **({"idempotency_key": key} if key else {}), **extra}


def push_one(payload):
	return batch_push(submissions=[payload])["results"][0]


class TestLegacyPayloadAdapter(FrappeTestCase):
	@classmethod
	def setUpClass(cls):
		super().setUpClass()
		frappe.set_user("Administrator")
		cls.outsider = frappe.get_doc({"doctype": "User", "email": f"{PREFIX.lower()}@example.com",
			"first_name": PREFIX, "user_type": "Website User", "send_welcome_email": 0}).insert(ignore_permissions=True).name
		cls.surveyor = frappe.get_doc({"doctype": "OmniQuery Surveyor", "surveyor_name": PREFIX,
			"user": cls.outsider, "status": "Active"}).insert(ignore_permissions=True).name
		project = frappe.get_doc({"doctype": "OmniQuery Project", "project_name": PREFIX,
			"grantor_organization": "Test", "status": "Active"}).insert(ignore_permissions=True)
		cls.template = frappe.get_doc({"doctype": "OmniQuery Template", "title": PREFIX, "project": project.name,
			"version": 1, "docstatus": 1}).insert(ignore_permissions=True).name  # inserted as submitted
		frappe.db.commit()

	@classmethod
	def tearDownClass(cls):
		frappe.set_user("Administrator")
		# keyless pushes get generated keys, so their logs are found by the payload they stored instead
		delete_test_docs([
			("OmniQuery Response", {"survey_template": cls.template}),
			*[("OmniQuery Sync Audit Log", {f: ["like", f"%{v}%"]}) for f in ("idempotency_key", "raw_payload")
				for v in (PREFIX, cls.template)],
			*[("OmniQuery Field Error Log", {f: ["like", f"%{v}%"]}) for f in ("question_code", "device_info")
				for v in (PREFIX, cls.template)],
			("OmniQuery Template", {"name": cls.template}),
			("OmniQuery Project", {"project_name": PREFIX}),
			("OmniQuery Surveyor", {"name": cls.surveyor}),
			("User", {"name": cls.outsider}),
		])
		frappe.db.commit()
		super().tearDownClass()

	def tearDown(self):
		frappe.set_user("Administrator")

	def test_legacy_shaped_payload_is_mapped_and_stored(self):
		result = push_one(legacy_payload(f"{PREFIX}-MAP"))
		self.assertEqual(result["status"], "SUCCESS", result)
		doc = frappe.get_doc("OmniQuery Response", result["doc_name"])
		self.assertEqual(doc.survey_template, self.template)
		self.assertAlmostEqual(float(doc.gps_latitude), 27.8124, places=4)
		self.assertAlmostEqual(float(doc.gps_accuracy), 12.5, places=1)
		self.assertTrue(doc.captured_at_local)
		answers = {item.question_code: item.value_text for item in doc.items}
		self.assertEqual(answers, {"block": "Sujangarh", "district": "Churu"})

	def test_canonical_fields_win_and_zero_coordinates_are_kept(self):
		sub = normalize_submission_payload(legacy_payload(survey_template="CANONICAL",
			items=[{"question_code": "q", "value": 1}], gps_coordinates={"lat": 0, "lng": 0}))
		self.assertEqual(sub["survey_template"], "CANONICAL")
		self.assertEqual(sub["items"], [{"question_code": "q", "value": 1}])
		self.assertEqual((sub["gps_latitude"], sub["gps_longitude"]), (0, 0))
		self.assertEqual(normalize_submission_payload("not a dict"), {})

	def test_keyless_submission_keeps_template_naming(self):
		result = push_one(legacy_payload())
		self.assertEqual(result["status"], "SUCCESS", result)
		self.assertTrue(result["doc_name"].startswith(f"OQS-{self.template.replace('OQS-', '')}-"), result)

	def test_invalid_shape_is_terminal_and_retries_add_no_rows(self):
		for bad in ({"idempotency_key": f"{PREFIX}-BAD"}, {"note": f"{PREFIX} no key, no template"}):
			first, retry = push_one(bad), push_one(bad)
			self.assertEqual((first["status"], retry["status"]), ("INVALID_SHAPE", "INVALID_SHAPE"))
			self.assertEqual(first["idempotency_key"], retry["idempotency_key"], "retries must share one key")
			key = {"idempotency_key": first["idempotency_key"]}
			self.assertEqual(frappe.db.count("OmniQuery Sync Audit Log", key), 1)
			self.assertEqual(frappe.db.count("OmniQuery Field Error Log", {"question_code": key["idempotency_key"]}), 1)

	def test_replay_needs_write_access(self):
		# a fresh load, as Desk's run_doc_method does: the inserted object keeps ignore_permissions set
		audit = frappe.get_doc("OmniQuery Sync Audit Log", self.failed_audit(f"{PREFIX}-PERM").name)
		frappe.set_user(self.outsider)
		self.assertTrue(frappe.has_permission("OmniQuery Sync Audit Log", "read", audit))
		self.assertRaises(frappe.PermissionError, audit.replay)
		frappe.set_user("Administrator")
		self.assertFalse(frappe.db.exists("OmniQuery Response", {"idempotency_key": audit.idempotency_key}))

	def test_replay_keeps_the_logs_key_and_surveyor(self):
		audit = self.failed_audit(f"{PREFIX}-REPLAY")
		frappe.get_doc({"doctype": "OmniQuery Field Error Log", "question_code": audit.idempotency_key,
			"error_message": "old failure"}).insert(ignore_permissions=True)
		self.assertEqual(audit.replay()["status"], "SUCCESS")
		audit.reload()
		self.assertEqual((audit.sync_status, audit.survey_response), ("SUCCESS", audit.idempotency_key))
		self.assertEqual(frappe.db.get_value("OmniQuery Response", audit.survey_response, "surveyor"), self.surveyor)
		self.assertFalse(frappe.db.exists("OmniQuery Field Error Log", {"question_code": audit.idempotency_key}))

	def test_replay_of_an_existing_response_links_it(self):
		key = f"{PREFIX}-DUP"
		self.assertEqual(push_one(legacy_payload(key))["status"], "SUCCESS")
		audit = frappe.get_doc("OmniQuery Sync Audit Log", {"idempotency_key": key})
		audit.db_set({"sync_status": "FAILED", "survey_response": None})
		self.assertEqual(audit.replay(), {"status": "SUCCESS", "doc_name": key})
		audit.reload()
		self.assertEqual((audit.sync_status, audit.survey_response), ("DUPLICATE_SKIPPED", key))

	def failed_audit(self, key):
		"""A FAILED log whose stored payload has no key and no surveyor, as legacy WAL entries were saved."""
		return frappe.get_doc({"doctype": "OmniQuery Sync Audit Log", "idempotency_key": key,
			"surveyor": self.surveyor, "sync_status": "FAILED", "error_message": "MandatoryError: survey_template",
			"raw_payload": json.dumps(legacy_payload())}).insert(ignore_permissions=True)
