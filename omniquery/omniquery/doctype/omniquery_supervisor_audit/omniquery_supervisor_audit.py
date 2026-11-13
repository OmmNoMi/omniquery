import frappe
from frappe.model.document import Document


class OmniQuerySupervisorAudit(Document):
	def before_insert(self):
		"""The supervisor is whoever records the audit; only a System Manager may record one on someone's
		behalf. The field is set-only-once, so a later edit by another manager cannot re-sign it."""
		if not self.supervisor or "System Manager" not in frappe.get_roles():
			self.supervisor = frappe.session.user
