import frappe
from frappe import _
from frappe.model.document import Document
from frappe.utils import now_datetime

from omniquery.api.sync import push_submissions


class OmniQuerySyncAuditLog(Document):
	def before_insert(self):
		if not self.processed_at:
			self.processed_at = now_datetime()

	@frappe.whitelist()
	def replay(self):
		"""Re-run this FAILED submission and link the Response it creates, credited to the Surveyor this
		log recorded, not to whoever replays it.
		Desk only checks read access before calling a doc method, and every user can read these logs,
		so replaying (which creates a Response and deletes error rows) checks write access itself."""
		self.check_permission("write")
		if self.sync_status != "FAILED" or not self.raw_payload:
			frappe.throw(_("Only a FAILED sync that kept its raw payload can be replayed"))
		result = push_submissions([self.replay_payload()], surveyor=self.surveyor)["results"][0]
		if result.get("status") not in ("SUCCESS", "DUPLICATE_SKIPPED"):
			return {"status": "FAILED", "error": result.get("error") or _("Replay failed")}
		self.mark_replayed(result["status"], result["doc_name"])
		return {"status": "SUCCESS", "doc_name": result["doc_name"]}

	def replay_payload(self):
		"""The stored payload pinned to this log's key, without which a keyless payload would be filed as a
		new submission."""
		payload = frappe.parse_json(self.raw_payload)
		if not isinstance(payload, dict):
			frappe.throw(_("The raw payload is not a single submission, so it cannot be replayed"))
		payload["idempotency_key"] = self.idempotency_key
		return payload

	def mark_replayed(self, status, response_name):
		"""push_submissions leaves this log untouched when the Response already exists, so link it here, and
		clear the error rows that the failed attempts left for this key."""
		self.db_set({"sync_status": status, "survey_response": response_name, "error_message": None})
		filters = {"question_code": self.idempotency_key}
		for name in frappe.get_all("OmniQuery Field Error Log", filters=filters, pluck="name"):
			frappe.delete_doc("OmniQuery Field Error Log", name, force=True, ignore_permissions=True)
		frappe.db.commit()
