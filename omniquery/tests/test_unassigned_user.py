import unittest
import frappe
from omniquery.api.survey import get_bootstrap_data, get_project_details


class TestUnassignedUserAccess(unittest.TestCase):
	def setUp(self):
		self.unassigned_user = "unassigned_field_surveyor@example.com"
		frappe.db.delete("OmniQuery Project Member", {"user": self.unassigned_user})
		frappe.db.delete("OmniQuery Surveyor", {"user": self.unassigned_user})
		frappe.db.delete("OmniQuery Template", {"title": "Unassigned Test Survey Unit"})
		frappe.db.delete("OmniQuery Project", {"project_name": "Unassigned Test Project"})
		frappe.db.commit()

		if not frappe.db.exists("User", self.unassigned_user):
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": self.unassigned_user,
					"first_name": "Unassigned",
					"last_name": "Surveyor",
					"send_welcome_email": 0,
					"roles": [{"role": "OmniQuery User"}],
				}
			)
			user.flags.ignore_permissions = True
			user.flags.no_welcome_mail = True
			user.insert(ignore_permissions=True)

		self.project = frappe.get_doc(
			{
				"doctype": "OmniQuery Project",
				"project_name": "Unassigned Test Project",
				"grantor_organization": "State Rural Mission",
				"status": "Active",
			}
		).insert(ignore_permissions=True)

		self.template = frappe.get_doc(
			{
				"doctype": "OmniQuery Template",
				"title": "Unassigned Test Survey Unit",
				"project": self.project.name,
				"version": 1,
				"status": "Published",
				"sections": [{"section_code": "SEC_1", "section_title": "Basic Section"}],
				"questions": [{"section_code": "SEC_1", "question_code": "q1", "label_en": "Question 1"}],
			}
		).insert(ignore_permissions=True)
		frappe.db.commit()

	def test_unassigned_user_bootstrap_returns_zero_templates_and_no_project_details(self):
		frappe.set_user(self.unassigned_user)
		bootstrap = get_bootstrap_data()
		self.assertEqual(len(bootstrap.get("templates", [])), 0)

		details = get_project_details()
		self.assertEqual(details, {})

	def test_surveyor_record_auto_created_and_templates_accessible_on_project_membership(self):
		frappe.set_user("Administrator")
		# Add user to project members
		self.project.append(
			"members",
			{
				"user": self.unassigned_user,
				"project_role": "Project User",
			},
		)
		self.project.save(ignore_permissions=True)
		frappe.db.commit()

		# Assert OmniQuery Surveyor record was automatically created
		surveyor = frappe.db.get_value(
			"OmniQuery Surveyor",
			{"user": self.unassigned_user},
			["name", "surveyor_name", "status"],
			as_dict=True,
		)
		self.assertIsNotNone(surveyor)
		self.assertEqual(surveyor.status, "Active")

		# As the now-assigned user, bootstrap must return the project template
		frappe.set_user(self.unassigned_user)
		bootstrap = get_bootstrap_data()
		self.assertGreaterEqual(len(bootstrap.get("templates", [])), 1)
		template_names = [t["name"] for t in bootstrap["templates"]]
		self.assertIn(self.template.name, template_names)

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.delete("OmniQuery Project Member", {"user": self.unassigned_user})
		frappe.db.delete("OmniQuery Surveyor", {"user": self.unassigned_user})
		frappe.db.delete("OmniQuery Template", {"name": self.template.name})
		frappe.db.delete("OmniQuery Project", {"name": self.project.name})

		if frappe.db.exists("User", self.unassigned_user):
			links = frappe.get_all(
				"Dynamic Link",
				filters={"link_doctype": "User", "link_name": self.unassigned_user, "parenttype": "Contact"},
				fields=["parent"],
			)
			for l in links:
				frappe.delete_doc("Contact", l.parent, ignore_permissions=True, force=True)
			frappe.delete_doc("User", self.unassigned_user, ignore_permissions=True, force=True)

		frappe.db.commit()
