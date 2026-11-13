import uuid
import frappe
from frappe import _
from frappe.model.document import Document
from frappe.model.workflow import apply_workflow
from frappe.utils import now_datetime

# written only by sync (with db.set_value), so a form or API save may not change them
QUALITY_SIGNAL_FIELDS = ("time_spent_seconds", "gps_distance_variance_meters", "is_outlier_flagged", "outlier_reasons")
# the field app's own lifecycle: sync moves a response between these, reviewers move it on from Submitted
FIELD_STATES = ("Draft", "Submitted")
# a reviewer must say why, so these are reached only through apply_response_workflow
REASON_STATES = ("Audit Flagged", "Rejected")


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

	def before_submit(self):
		if not self.synced_at:
			self.synced_at = now_datetime()
		if not self.survey_status or self.survey_status == "Draft":
			self.survey_status = "Submitted"

	def validate_workflow(self):
		# sync inserts a response as Submitted, or submits a live draft, as the surveyor; the
		# workflow only governs review. Submitted cannot go back to Draft: docstatus 1 never returns to 0.
		before = self.get_doc_before_save()
		if self.survey_status in FIELD_STATES and (not before or before.survey_status in FIELD_STATES):
			return
		super().validate_workflow()

	def validate(self):
		if self.is_new():
			return
		self._guard_quality_signals()

	def before_update_after_submit(self):
		# every review step saves a submitted response, and validate never runs on those
		self._require_review_reason()

	def _guard_quality_signals(self):
		"""Without this a reviewer with write access could quietly clear a sync outlier flag."""
		changed = [field for field in QUALITY_SIGNAL_FIELDS if self.has_value_changed(field)]
		if changed:
			frappe.throw(_("Quality signals are recorded by sync and cannot be edited: {0}").format(", ".join(changed)))

	def _require_review_reason(self):
		# covers every path: the form, Desk's list workflow actions and the REST API all reach this save
		if self.survey_status in REASON_STATES and self.has_value_changed("survey_status"):
			if not frappe.flags.omniquery_review_reason:
				frappe.throw(_("A reason is required to move a response to {0}.").format(_(self.survey_status)))


@frappe.whitelist()
def apply_response_workflow(doc: str, action: str, reason: str | None = None):
	"""Frappe's apply_workflow with the reviewer's reason, which it records as a comment."""
	frappe.flags.omniquery_review_reason = (reason or "").strip()
	try:
		updated = apply_workflow(frappe.get_doc("OmniQuery Response", doc), action)
	finally:
		frappe.flags.omniquery_review_reason = None
	if (reason or "").strip():
		updated.add_comment("Comment", text=_("{0}: {1}").format(_(action), reason.strip()))
	return updated
