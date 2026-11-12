import uuid
import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class OmniQueryResponse(Document):
	def autoname(self):
		if self.name:
			return
		if self.idempotency_key:
			self.name = self.idempotency_key
		else:
			self.name = str(uuid.uuid4())

	def before_insert(self):
		if not self.synced_at:
			self.synced_at = now_datetime()
