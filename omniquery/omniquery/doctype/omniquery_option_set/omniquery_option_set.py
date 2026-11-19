import frappe
from frappe.model.document import Document


class OmniQueryOptionSet(Document):
	def validate(self):
		self._validate_scope_constraints()
		self._validate_parent_options()

	def _validate_scope_constraints(self):
		if self.scope == "Workspace" and not self.workspace:
			frappe.throw(frappe._("Workspace is required when Scope is Workspace"))
		if self.scope == "Project" and not self.project:
			frappe.throw(frappe._("Project is required when Scope is Project"))
		if self.scope == "Survey" and not self.survey_template:
			frappe.throw(frappe._("Survey Template is required when Scope is Survey"))

	def _validate_parent_options(self):
		# a set grouped by parent option (Block under District, #24) is read as a dict of parent ->
		# choices, so an option without a parent would never be offered
		with_parent = [bool(row.parent_option) for row in self.options or []]
		if any(with_parent) and not all(with_parent):
			frappe.throw(frappe._("Give every option a Parent Option, or none of them."))
