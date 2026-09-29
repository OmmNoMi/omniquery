import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class OmniQuerySyncAuditLog(Document):
	def before_insert(self):
		if not self.processed_at:
			self.processed_at = now_datetime()
