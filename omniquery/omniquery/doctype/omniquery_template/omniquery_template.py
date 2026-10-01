import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

from omniquery.services.schema_compiler import compile_template_schema


class OmniQueryTemplate(Document):
	def autoname(self):
		if self.amended_from or (self.name and not self.name.startswith("format:")):
			return
		workspace_sequence, project_sequence = "001", "001"
		if self.project and frappe.db.exists("OmniQuery Project", self.project):
			project_doc = frappe.get_doc("OmniQuery Project", self.project)
			workspace_name = project_doc.workspace or ""
			workspace_sequence = workspace_name.replace("OQW-", "").replace("WSP-", "") or "001"
			project_parts = project_doc.name.split("-")
			project_sequence = project_parts[-1] if len(project_parts) >= 2 and project_parts[-1].isdigit() else "001"
		self.name = frappe.model.naming.make_autoname(f"OQS-{workspace_sequence}-{project_sequence}-.###")

	def before_save(self):
		self._validate_immutability()
		self._compile_schema()

	def before_submit(self):
		self.status = "Published"
		self.published_at = now_datetime()
		self._compile_schema()

	def before_cancel(self):
		self.status = "Deprecated"


	def validate_amended_from(self):
		"""Allow active survey versions to coexist without cancelling historical published versions."""
		if not self.amended_from:
			return
		if not frappe.db.exists(self.doctype, self.amended_from):
			frappe.throw(frappe._("Amended template {0} does not exist").format(self.amended_from))
		source_docstatus = frappe.db.get_value(self.doctype, self.amended_from, "docstatus")
		if source_docstatus == 0:
			frappe.throw(frappe._("Cannot amend draft template. Only submitted templates can be amended."))

	def _validate_immutability(self):
		if self.docstatus == 1 and not self.flags.in_submit:
			frappe.throw(frappe._("Cannot modify published template. Create a new version via Amend."))

	def _compile_schema(self):
		compile_template_schema(self)
