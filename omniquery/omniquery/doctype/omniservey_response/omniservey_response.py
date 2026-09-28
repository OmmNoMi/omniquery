import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime

class OmniServeyResponse(Document):
	def before_insert(self):
		if not self.synced_at:
			self.synced_at = now_datetime()
