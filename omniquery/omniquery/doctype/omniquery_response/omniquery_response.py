import uuid
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

# written only by sync (with db.set_value), so a form or API save may not change them
QUALITY_SIGNAL_FIELDS = ("time_spent_seconds", "gps_distance_variance_meters", "is_outlier_flagged", "outlier_reasons")


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

	def validate(self):
		"""Without this a reviewer with write access could quietly clear a sync outlier flag."""
		if self.is_new():
			return
		changed = [field for field in QUALITY_SIGNAL_FIELDS if self.has_value_changed(field)]
		if changed:
			frappe.throw(_("Quality signals are recorded by sync and cannot be edited: {0}").format(", ".join(changed)))
