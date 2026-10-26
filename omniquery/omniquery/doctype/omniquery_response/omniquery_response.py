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

	def db_insert(self, *args, **kwargs):
		res = super().db_insert(*args, **kwargs)
		null_fields = {}
		if self.gps_latitude is None:
			null_fields["gps_latitude"] = None
		if self.gps_longitude is None:
			null_fields["gps_longitude"] = None
		if self.gps_accuracy is None:
			null_fields["gps_accuracy"] = None
		if null_fields:
			frappe.db.set_value(self.doctype, self.name, null_fields, update_modified=False)
		return res

	def db_update(self, *args, **kwargs):
		res = super().db_update(*args, **kwargs)
		null_fields = {}
		if self.gps_latitude is None:
			null_fields["gps_latitude"] = None
		if self.gps_longitude is None:
			null_fields["gps_longitude"] = None
		if self.gps_accuracy is None:
			null_fields["gps_accuracy"] = None
		if null_fields:
			frappe.db.set_value(self.doctype, self.name, null_fields, update_modified=False)
		return res

