import ast
import os

import frappe
from frappe.tests.utils import FrappeTestCase

from omniquery.patches.v1_0.cleanup_orphan_records import execute as cleanup_orphan_records

APP_DIR = os.path.dirname(os.path.dirname(__file__))


def iter_test_files():
	"""Every test_*.py in the app package, including DocType folders."""
	for root, _dirs, files in os.walk(APP_DIR):
		for fname in files:
			if fname.startswith("test_") and fname.endswith(".py"):
				yield os.path.join(root, fname)


def is_db_call(node, method):
	"""True for a call written as frappe.db.<method>(...)."""
	func = getattr(node, "func", None)
	return (
		isinstance(node, ast.Call)
		and isinstance(func, ast.Attribute)
		and func.attr == method
		and ast.unparse(func.value) == "frappe.db"
	)


def has_child_tables(doctype):
	return bool(frappe.db.exists("DocType", doctype) and frappe.get_meta(doctype).get_table_fields())


def delete_violation(node):
	"""Why this frappe.db.delete / frappe.db.sql call can orphan child rows, or None."""
	first = node.args[0] if node.args else None
	literal = first.value if isinstance(first, ast.Constant) and isinstance(first.value, str) else None
	if is_db_call(node, "sql"):
		return "raw DELETE" if literal and "delete" in literal.lower() else None
	if literal is None:
		return "doctype is not a string literal, so it cannot be checked"
	return f"'{literal}' has child tables" if has_child_tables(literal) else None


def find_delete_violations(path):
	with open(path, encoding="utf-8") as f:
		tree = ast.parse(f.read(), filename=path)
	calls = [n for n in ast.walk(tree) if is_db_call(n, "delete") or is_db_call(n, "sql")]
	rel = os.path.relpath(path, APP_DIR)
	return [f"{rel}:{n.lineno} {why}" for n in calls if (why := delete_violation(n))]


class TestOrphanRecordsGuard(FrappeTestCase):
	def test_tests_never_db_delete_a_doctype_with_child_tables(self):
		"""Parents must go through frappe.delete_doc (see tests/utils.delete_test_docs) so child rows go too."""
		violations = [v for path in iter_test_files() for v in find_delete_violations(path)]
		self.assertEqual(violations, [], "Use delete_test_docs instead:\n" + "\n".join(violations))

	def test_cleanup_patch_removes_only_child_rows_whose_parent_is_gone(self):
		key = f"TEST-ORPHAN-{frappe.generate_hash(length=8)}"
		ghost = f"{key}-GHOST"
		self.insert_response(key, survey_template=f"{key}-NO-SUCH-TEMPLATE")
		kept = self.insert_item(parent=key)
		orphan = self.insert_item(parent=ghost)
		other_parent = self.insert_item(parent=ghost, parenttype="OmniQuery Some Other Parent")

		cleanup_orphan_records()

		self.assertTrue(frappe.db.exists("OmniQuery Response", key), "a response is real data, never removed")
		self.assertTrue(frappe.db.exists("OmniQuery Response Item", kept))
		self.assertFalse(frappe.db.exists("OmniQuery Response Item", orphan))
		self.assertTrue(frappe.db.exists("OmniQuery Response Item", other_parent))

	def insert_response(self, name, survey_template):
		doc = frappe.get_doc({"doctype": "OmniQuery Response", "idempotency_key": name})
		doc.name, doc.survey_template = name, survey_template
		doc.db_insert()
		self.addCleanup(frappe.delete_doc, "OmniQuery Response", name, force=True, ignore_permissions=True)

	def insert_item(self, parent, parenttype="OmniQuery Response"):
		name = frappe.generate_hash(length=10)
		row = {"doctype": "OmniQuery Response Item", "name": name, "question_code": "q1"}
		frappe.get_doc({**row, "parent": parent, "parenttype": parenttype, "parentfield": "items"}).db_insert()
		self.addCleanup(frappe.db.delete, "OmniQuery Response Item", {"name": name})
		return name
