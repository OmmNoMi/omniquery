import json
import unittest

import frappe

from omniquery.www.omniquery import get_context

# A user can set their own name, so it must not be able to end the page's boot script (#51).
HOSTILE_NAME = 'Evil "\\ </script><script>alert(1)//'
# The deep-link IDs come from the URL itself, so anyone can send a link that tries the same (#38)
HOSTILE_ID = 'x";window.PWNED=1;"\\ </script><script>alert(2)'


def booted(html, name):
	"""The value the boot script gives `name`, read as JSON: it parses only if the value is one literal."""
	line = next(line for line in html.splitlines() if f"{name} =" in line)
	value, _end = json.JSONDecoder().raw_decode(line.split("=", 1)[1].lstrip())
	return value


class TestPortalPageBoot(unittest.TestCase):
	user = "_issue51@ommnomi.test"

	def setUp(self):
		frappe.set_user("Administrator")
		if frappe.db.exists("User", self.user):
			frappe.delete_doc("User", self.user, force=True, ignore_permissions=True)
		frappe.get_doc(
			{"doctype": "User", "email": self.user, "first_name": "Surveyor", "send_welcome_email": 0}
		).insert(ignore_permissions=True)
		# set directly, as the user's own profile form would save it, past any name cleanup on insert
		frappe.db.set_value("User", self.user, "first_name", HOSTILE_NAME)
		frappe.local.fullnames = {}  # get_fullname caches per request

	def tearDown(self):
		frappe.set_user("Administrator")
		frappe.delete_doc("User", self.user, force=True, ignore_permissions=True)
		frappe.db.commit()  # rendering the page commits, so commit the cleanup too or it is rolled back

	def render_as(self, user, app_path=""):
		frappe.set_user(user)
		frappe.form_dict.app_path = app_path
		try:
			html = frappe.render_template("omniquery/www/omniquery.html", get_context(frappe._dict()))
		finally:
			frappe.form_dict.pop("app_path", None)
		return html, booted(html, "window.frappe.user_fullname")

	def test_full_name_reaches_the_pwa_intact_and_cannot_end_the_script(self):
		html, booted = self.render_as(self.user)
		self.assertEqual(booted, frappe.utils.get_fullname(self.user))
		self.assertIn("</script><script>", booted)
		self.assertNotIn("</script><script>alert", html)

	def test_guest_boots_no_name(self):
		_html, booted = self.render_as("Guest")
		self.assertEqual(booted, "")

	def test_signed_in_page_hands_frappe_ui_the_session_csrf_token(self):
		# frappe-ui's call() sends window.csrf_token; without it every signed-in POST fails CSRF
		html, _booted = self.render_as(self.user)
		boot_line = next(line for line in html.splitlines() if "window.csrf_token =" in line)
		token = boot_line.split('"')[1]
		self.assertTrue(token)
		self.assertEqual(token, frappe.local.session.data.csrf_token)

	def test_a_hostile_deep_link_reaches_the_pwa_intact_and_cannot_end_the_script(self):
		for app_path, name in (
			(f"project/{HOSTILE_ID}", "window.frappe.initial_project_id"),
			(HOSTILE_ID, "window.frappe.initial_survey_id"),
		):
			with self.subTest(name):
				html, _booted = self.render_as("Guest", app_path)
				self.assertEqual(booted(html, name), HOSTILE_ID)
				self.assertNotIn("</script><script>alert", html)
