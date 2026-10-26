import os
import re
import unittest
import frappe


class TestOrphanRecordsGuard(unittest.TestCase):
	PARENT_DOCTYPES = {
		"OmniQuery Workspace",
		"OmniQuery Project",
		"OmniQuery Template",
		"OmniQuery Question",
		"OmniQuery Option Set",
		"OmniQuery Response",
		"OmniQuery Surveyor",
	}

	def test_no_parent_doctype_db_delete_in_tests(self):
		"""
		Invariant: Tests must not execute frappe.db.delete() on parent DocTypes against the database.
		Parent DocTypes must use frappe.delete_doc() so that child tables and dependencies are cleanly removed.
		"""
		tests_dir = os.path.dirname(__file__)
		violations = []

		pattern = re.compile(r"""frappe\.db\.delete\(\s*["']([^"']+)["']""")

		for fname in os.listdir(tests_dir):
			if not fname.endswith(".py") or fname == os.path.basename(__file__):
				continue
			fpath = os.path.join(tests_dir, fname)
			with open(fpath, "r", encoding="utf-8") as f:
				for line_num, line in enumerate(f, start=1):
					match = pattern.search(line)
					if match:
						dt = match.group(1)
						if dt in self.PARENT_DOCTYPES:
							violations.append(f"{fname}:{line_num} deletes parent DocType '{dt}' via frappe.db.delete")

		self.assertEqual(
			violations,
			[],
			"Parent DocTypes must not be deleted via frappe.db.delete(). Use frappe.delete_doc():\n"
			+ "\n".join(violations),
		)

	def test_no_orphan_child_rows_or_dangling_responses(self):
		"""
		Invariant: No orphan child rows or dangling responses pointing to non-existent templates exist in the database.
		"""
		child_parent_specs = [
			("tabOmniQuery Workspace Member", "tabOmniQuery Workspace"),
			("tabOmniQuery Template Question Reference", "tabOmniQuery Template"),
			("tabOmniQuery Section", "tabOmniQuery Template"),
			("tabOmniQuery Response Item", "tabOmniQuery Response"),
			("tabOmniQuery Supported Language", "tabOmniQuery Project"),
			("tabOmniQuery Option Item", "tabOmniQuery Option Set"),
		]

		orphan_report = []
		for child_table, parent_table in child_parent_specs:
			orphans = frappe.db.sql(
				f"SELECT COUNT(*) FROM `{child_table}` WHERE parent NOT IN (SELECT name FROM `{parent_table}`)"
			)[0][0]
			if orphans > 0:
				orphan_report.append(f"{child_table}: {orphans} rows without parent in {parent_table}")

		dangling_responses = frappe.db.sql(
			"SELECT COUNT(*) FROM `tabOmniQuery Response` WHERE survey_template NOT IN (SELECT name FROM `tabOmniQuery Template`)"
		)[0][0]
		if dangling_responses > 0:
			orphan_report.append(f"tabOmniQuery Response: {dangling_responses} responses pointing to non-existent templates")

		self.assertEqual(
			orphan_report,
			[],
			"Orphan records discovered in database:\n" + "\n".join(orphan_report),
		)
