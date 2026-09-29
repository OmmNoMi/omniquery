import uuid
import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class OmniQueryResponse(Document):
	def autoname(self):
		if self.name:
			return
		if self.idempotency_key and self.idempotency_key.startswith("OQS-"):
			self.name = self.idempotency_key
		else:
			clean_tmpl = (self.survey_template or "SURVEY").replace("OQS-", "")
			rand = uuid.uuid4().hex[:6]
			self.name = f"OQS-{clean_tmpl}-{rand}"

	def before_insert(self):
		if not self.synced_at:
			self.synced_at = now_datetime()
