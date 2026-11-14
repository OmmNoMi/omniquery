import json
import unittest

import frappe

from omniquery.www.omniquery import get_context

# A user can set their own name, so it must not be able to end the page's boot script (#51).
HOSTILE_NAME = 'Evil "\\ </script><script>alert(1)//'


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

	def render_as(self, user):
		frappe.set_user(user)
		ctx = get_context(frappe._dict())
		html = frappe.render_template("omniquery/www/omniquery.html", ctx)
		boot_line = next(line for line in html.splitlines() if "window.frappe.user_fullname =" in line)
		return html, json.loads(boot_line.split("=", 1)[1].strip().rstrip(";"))

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
