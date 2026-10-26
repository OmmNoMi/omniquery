import unittest
import frappe
from omniquery.api.survey import get_surveyor_kpis


class TestDailyTargetConfiguration(unittest.TestCase):
	def setUp(self):
		frappe.db.delete("OmniQuery Project Member", {"user": "test_target_surveyor@example.com"})
		frappe.db.delete("OmniQuery Project", {"project_name": "Target Test Project"})
		frappe.db.commit()

		self.test_user = "test_target_surveyor@example.com"
		if not frappe.db.exists("User", self.test_user):
			user = frappe.get_doc(
				{
					"doctype": "User",
					"email": self.test_user,
					"first_name": "Target",
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
				"project_name": "Target Test Project",
				"grantor_organization": "State Livelihood Mission",
				"status": "Active",
			}
		).insert(ignore_permissions=True)
		frappe.db.commit()

	def test_project_and_member_doctypes_have_daily_target_fields(self):
		proj_meta = frappe.get_meta("OmniQuery Project")
		self.assertTrue(proj_meta.has_field("daily_target"))
		self.assertEqual(proj_meta.get_field("daily_target").fieldtype, "Int")

		member_meta = frappe.get_meta("OmniQuery Project Member")
		self.assertTrue(member_meta.has_field("daily_target"))
		self.assertEqual(member_meta.get_field("daily_target").fieldtype, "Int")

	def test_daily_target_is_none_when_no_target_set(self):
		# With no target set on project or surveyor, daily_target must be None
		frappe.set_user(self.test_user)
		kpis = get_surveyor_kpis(project=self.project.name)
		self.assertIsNone(kpis.get("daily_target"))

	def test_daily_target_returns_project_target_when_configured(self):
		self.project.daily_target = 6
		self.project.save(ignore_permissions=True)
		frappe.db.commit()

		frappe.set_user(self.test_user)
		kpis = get_surveyor_kpis(project=self.project.name)
		self.assertEqual(kpis.get("daily_target"), 6)

	def test_daily_target_member_override_takes_precedence(self):
		self.project.daily_target = 6
		self.project.append(
			"members",
			{
				"user": self.test_user,
				"project_role": "Project User",
				"daily_target": 8,
			},
		)
		self.project.save(ignore_permissions=True)
		frappe.db.commit()

		frappe.set_user(self.test_user)
		kpis = get_surveyor_kpis(project=self.project.name)
		self.assertEqual(kpis.get("daily_target"), 8)

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.db.delete("OmniQuery Project Member", {"user": self.test_user})
		frappe.db.delete("OmniQuery Project", {"name": self.project.name})

		if frappe.db.exists("User", self.test_user):
			links = frappe.get_all(
				"Dynamic Link",
				filters={"link_doctype": "User", "link_name": self.test_user, "parenttype": "Contact"},
				fields=["parent"],
			)
			for l in links:
				frappe.delete_doc("Contact", l.parent, ignore_permissions=True, force=True)
			frappe.delete_doc("User", self.test_user, ignore_permissions=True, force=True)

		frappe.db.commit()
