import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class OmniQuerySyncAuditLog(Document):
	def before_insert(self):
		if not self.processed_at:
			self.processed_at = now_datetime()

	@frappe.whitelist()
	def replay(self):
		"""
		Replays a FAILED sync audit log using its raw_payload dump.
		Maps legacy shapes, re-submits through batch_push, and links the created response.
		"""
		if not self.raw_payload:
			frappe.throw(frappe._("Cannot replay audit log without raw_payload dump"))

		payload = frappe.parse_json(self.raw_payload) if isinstance(self.raw_payload, str) else self.raw_payload
		from omniquery.api.sync import batch_push

		res = batch_push(submissions=[payload])
		if not res.get("results"):
			frappe.throw(frappe._("Batch push produced no results"))

		result = res["results"][0]
		self.reload()

		if result.get("status") in ("SUCCESS", "DUPLICATE_SKIPPED"):
			# Clean up associated field error logs for this idempotency key
			for err_name in frappe.get_all(
				"OmniQuery Field Error Log",
				filters={"question_code": self.idempotency_key},
				pluck="name",
			):
				frappe.delete_doc("OmniQuery Field Error Log", err_name, force=True, ignore_permissions=True)

			frappe.db.commit()
			return {"status": "SUCCESS", "doc_name": result.get("doc_name")}
		else:
			err = result.get("error") or "Replay failed"
			return {"status": "FAILED", "error": err}
