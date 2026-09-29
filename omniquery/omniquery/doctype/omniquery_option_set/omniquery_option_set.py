import frappe
from frappe.model.document import Document


class OmniQueryOptionSet(Document):
	def validate(self):
		self._validate_scope_constraints()

	def _validate_scope_constraints(self):
		if self.scope == "Workspace" and not self.workspace:
			frappe.throw(frappe._("Workspace is required when Scope is Workspace"))
		if self.scope == "Project" and not self.project:
			frappe.throw(frappe._("Project is required when Scope is Project"))
		if self.scope == "Survey" and not self.survey_template:
			frappe.throw(frappe._("Survey Template is required when Scope is Survey"))
