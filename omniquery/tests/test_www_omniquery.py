import re
import unittest
from pathlib import Path

import frappe

from omniquery.www.omniquery import get_context

SHELL = Path(frappe.get_app_path("omniquery")) / "www" / "omniquery.html"
MAX_SHELL_LINES = 40  # OmmNoMi thin-shell rule: the page boots the bundle, the app lives in src/ (#45)


class TestOmniQueryShell(unittest.TestCase):
	def setUp(self):
		self._lang = frappe.local.lang
		frappe.set_user("Administrator")

	def tearDown(self):
		frappe.local.lang = self._lang

	def render(self, lang):
		frappe.local.lang = lang
		return frappe.render_template("omniquery/www/omniquery.html", get_context(frappe._dict()))

	def test_html_lang_and_dir_follow_the_frappe_language(self):
		for lang, direction in (("hi", "ltr"), ("en", "ltr"), ("ar", "rtl")):
			html_tag = re.search(r"<html[^>]*>", self.render(lang)).group(0)
			self.assertEqual(html_tag, f'<html lang="{lang}" dir="{direction}">')

	def test_saved_theme_is_applied_before_the_body_paints(self):
		html = self.render("en")
		self.assertLess(html.index('localStorage.getItem("omniquery_theme")'), html.index("<body"))
		self.assertIn("root.dataset.theme", html.split("<body", 1)[0])

	def test_body_has_a_dark_background(self):
		body_tag = re.search(r"<body[^>]*>", self.render("en")).group(0)
		self.assertIn("dark:bg-slate-950", body_tag)

	def test_something_shows_and_is_announced_before_the_bundle_boots(self):
		app = re.search(r'<div id="app">(.*?)</div>', self.render("en"), re.S)
		self.assertIsNotNone(app, "#app must hold a loading placeholder until Vue mounts")
		self.assertIn('role="status"', app.group(1))
		self.assertIn("Loading OmniQuery", app.group(1))

	def test_shell_stays_thin(self):
		source = SHELL.read_text(encoding="utf-8")
		self.assertLessEqual(len(source.splitlines()), MAX_SHELL_LINES)
		self.assertNotIn("<style", source, "styles belong in src/styles")
		self.assertNotIn(' style="', source, "styles belong in src/styles")
		self.assertNotIn("serviceWorker", source, "the service worker is registered from src/main.js")
