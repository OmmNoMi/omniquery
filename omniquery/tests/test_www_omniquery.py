import os
import unittest
from pathlib import Path
import frappe
from omniquery.www.omniquery import get_context


class TestWWMOmniQuery(unittest.TestCase):
	def setUp(self):
		self._original_lang = getattr(frappe.local, "lang", "en")

	def tearDown(self):
		frappe.local.lang = self._original_lang

	def test_get_context_lang_matches_frappe_local_lang(self):
		for test_lang in ("en", "hi", "ta", "es"):
			frappe.local.lang = test_lang
			ctx = get_context({})
			self.assertEqual(
				ctx.get("lang"),
				test_lang,
				f"Expected context lang to match frappe.local.lang='{test_lang}', but got '{ctx.get('lang')}'",
			)

	def test_www_html_shell_invariants(self):
		html_path = Path(frappe.get_app_path("omniquery")) / "www" / "omniquery.html"
		self.assertTrue(html_path.exists(), "omniquery.html must exist under www/")

		content = html_path.read_text(encoding="utf-8")
		lines = content.splitlines()

		# 1. Thin shell under 40 lines
		self.assertLessEqual(
			len(lines),
			40,
			f"omniquery.html is {len(lines)} lines; must be 40 lines or fewer (thin shell rule)",
		)

		# 2. Dynamic language attribute (not hardcoded)
		self.assertNotIn(
			'lang="hi"',
			content,
			'Hardcoded lang="hi" found in omniquery.html; must use dynamic {{ lang }}',
		)
		self.assertTrue(
			'lang="{{ lang' in content or 'lang="{{ current_lang' in content,
			'omniquery.html must bind lang="{{ lang }}" from context',
		)

		# 3. Dark mode body background switch
		self.assertIn(
			"dark:bg-slate-950",
			content,
			"omniquery.html body must include dark variant background (e.g. dark:bg-slate-950)",
		)

		# 4. Zero inline splash screen styles
		self.assertNotIn(
			"min-height: 100vh; display: flex",
			content,
			"Inline splash with style attributes must be moved into src/ and not live in HTML shell",
		)

		# 5. Zero inline service worker registration with console.log
		self.assertNotIn(
			"navigator.serviceWorker.register",
			content,
			"Inline service-worker registration must live in src/ and not in HTML shell",
		)
