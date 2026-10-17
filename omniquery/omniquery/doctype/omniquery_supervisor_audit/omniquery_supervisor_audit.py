import frappe
from frappe.model.document import Document


class OmniQuerySupervisorAudit(Document):
	def validate(self):
		if not self.supervisor:
			self.supervisor = frappe.session.user
		# Ensure non-System Manager users cannot forge supervisor identity
		if self.supervisor != frappe.session.user and not frappe.has_role("System Manager"):
			self.supervisor = frappe.session.user

