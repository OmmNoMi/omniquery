import unittest

import frappe


class TestSurveyVersions(unittest.TestCase):
	def setUp(self):
		self.test_records = []
		self._cleanup_test_records()
		self._create_test_project()

	def tearDown(self):
		self._cleanup_test_records()

	def _cleanup_test_records(self):
		templates = frappe.get_all("OmniQuery Template", filters={"title": ["like", "Test %"]}, pluck="name")
		for name in templates:
			doc = frappe.get_doc("OmniQuery Template", name)
			if doc.docstatus == 1:
				doc.cancel()
			frappe.delete_doc("OmniQuery Template", name, force=True, ignore_permissions=True)
		if frappe.db.exists("OmniQuery Project", "PROJ-Phase1 Test Project"):
			frappe.delete_doc("OmniQuery Project", "PROJ-Phase1 Test Project", force=True, ignore_permissions=True)
		frappe.db.commit()

	def _create_test_project(self):
		if not frappe.db.exists("OmniQuery Project", "PROJ-Phase1 Test Project"):
			p = frappe.get_doc({
				"doctype": "OmniQuery Project",
				"project_name": "Phase1 Test Project",
				"grantor_organization": "State Test Board",
				"status": "Active",
			}).insert(ignore_permissions=True)
			self.test_records.append(("OmniQuery Project", p.name))

	def _make_template(self, title: str):
		doc = frappe.get_doc({
			"doctype": "OmniQuery Template",
			"title": title,
			"project": "PROJ-Phase1 Test Project",
			"version": 1,
			"status": "Draft",
			"sections": [{"section_code": "SEC_1", "section_title": "Section 1", "display_order": 1}],
			"questions": [{"section_code": "SEC_1", "question_code": "q_test", "label_en": "Question 1", "is_mandatory": 1}],
		}).insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Template", doc.name))
		return doc

	def test_publish_and_lock_lifecycle(self):
		tmpl = self._make_template("Test Submittable Lifecycle")
		self.assertEqual(tmpl.docstatus, 0)
		self.assertEqual(tmpl.status, "Draft")
		tmpl.submit()
		self.assertEqual(tmpl.docstatus, 1)
		self.assertEqual(tmpl.status, "Published")
		self.assertTrue(tmpl.published_at)

	def test_immutability_guarantee(self):
		tmpl = self._make_template("Test Immutability Lock")
		tmpl.submit()
		tmpl.title = "Altered Title"
		with self.assertRaises(frappe.ValidationError):
			tmpl.save()

	def test_frappe_native_amendment_increment(self):
		tmpl = self._make_template("Test Native Amendment")
		tmpl.submit()
		amended = frappe.copy_doc(tmpl)
		amended.docstatus = 0
		amended.amended_from = tmpl.name
		amended.insert(ignore_permissions=True)
		self.assertEqual(amended.docstatus, 0)
		self.assertEqual(amended.amended_from, tmpl.name)
		self.assertTrue(amended.name.endswith("-1"))
		# Both coexist!
		self.assertEqual(frappe.db.get_value("OmniQuery Template", tmpl.name, "docstatus"), 1)
		self.assertEqual(frappe.db.get_value("OmniQuery Template", amended.name, "docstatus"), 0)

	def test_both_versions_can_be_published_and_coexist(self):
		tmpl = self._make_template("Test Coexistence Parent")
		tmpl.submit()
		self.assertEqual(tmpl.docstatus, 1)
		self.assertEqual(tmpl.status, "Published")

		amended = frappe.copy_doc(tmpl)
		amended.docstatus = 0
		amended.amended_from = tmpl.name
		amended.insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Template", amended.name))

		# Submit amended version
		amended.submit()
		self.assertEqual(amended.docstatus, 1)
		self.assertEqual(amended.status, "Published")

		# Check that parent version 1 is STILL Published and docstatus 1
		parent_docstatus, parent_status = frappe.db.get_value(
			"OmniQuery Template", tmpl.name, ["docstatus", "status"]
		)
		self.assertEqual(parent_docstatus, 1)
		self.assertEqual(parent_status, "Published")

	def test_sequential_amendment_generation(self):
		tmpl = self._make_template("Test Sequential Versions")
		tmpl.submit()

		# V1 -> V2
		v2 = frappe.copy_doc(tmpl)
		v2.docstatus = 0
		v2.amended_from = tmpl.name
		v2.insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Template", v2.name))
		v2.submit()
		self.assertTrue(v2.name.endswith("-1"))

		# V2 -> V3
		v3 = frappe.copy_doc(v2)
		v3.docstatus = 0
		v3.amended_from = v2.name
		v3.insert(ignore_permissions=True)
		self.test_records.append(("OmniQuery Template", v3.name))
		v3.submit()
		self.assertTrue(v3.name.endswith("-2"))

		# All 3 coexist with docstatus = 1
		for name in [tmpl.name, v2.name, v3.name]:
			self.assertEqual(frappe.db.get_value("OmniQuery Template", name, "docstatus"), 1)
			self.assertEqual(frappe.db.get_value("OmniQuery Template", name, "status"), "Published")

	def test_cannot_amend_draft_template(self):
		draft_tmpl = self._make_template("Test Draft No Amend")
		self.assertEqual(draft_tmpl.docstatus, 0)

		amended = frappe.copy_doc(draft_tmpl)
		amended.docstatus = 0
		amended.amended_from = draft_tmpl.name
		with self.assertRaises(frappe.ValidationError):
			amended.insert(ignore_permissions=True)

	def test_cannot_amend_nonexistent_template(self):
		fake_tmpl = self._make_template("Test Nonexistent Target")
		fake_tmpl.amended_from = "OQS-999-999-999"
		with self.assertRaises(frappe.ValidationError):
			fake_tmpl.insert(ignore_permissions=True)

