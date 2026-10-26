import uuid
import frappe
from frappe import _
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

	def before_save(self):
		if not self.is_new() and self.has_value_changed("survey_status"):
			self.flags.ignore_version = False

	def validate_workflow(self):
		if self.is_new() and self.survey_status in ("Draft", "Submitted"):
			return
		super().validate_workflow()

	def validate(self):
		if not self.is_new() and self.has_value_changed("survey_status"):
			if frappe.session.user != "Administrator":
				roles = set(frappe.get_roles(frappe.session.user))
				allowed = {"OmniQuery Manager", "OmniQuery Admin", "System Manager"}
				if not (roles & allowed):
					frappe.throw(
						_("Only OmniQuery Managers can change response survey status."),
						frappe.PermissionError,
					)

	def apply_workflow_action(self, action: str, reason: str = None):
		return apply_response_workflow(self, action, reason=reason)


@frappe.whitelist()
def apply_response_workflow(doc, action: str, reason: str = None):
	"""
	Applies a Frappe workflow action to an OmniQuery Response with strict persona authorization,
	reason auditing, and automated comment logging.
	"""
	if isinstance(doc, str):
		doc = frappe.get_doc("OmniQuery Response", doc)

	# Verify user authorization
	if frappe.session.user != "Administrator":
		roles = set(frappe.get_roles(frappe.session.user))
		allowed = {"OmniQuery Manager", "OmniQuery Admin", "System Manager"}
		if not (roles & allowed):
			frappe.throw(
				_("Only OmniQuery Managers can review, approve, or flag responses."),
				frappe.PermissionError,
			)

	current_status = doc.survey_status or "Draft"

	# Draft responses cannot be approved
	if current_status == "Draft" and action == "Approve":
		frappe.throw(
			_("Cannot approve a draft response."),
			frappe.ValidationError,
		)

	# Flag for Audit and Reject require an explicit reason
	if action in ("Flag for Audit", "Reject") and not (reason and str(reason).strip()):
		frappe.throw(
			_("A reason is required to {0}.").format(action),
			frappe.ValidationError,
		)

	from frappe.model.workflow import apply_workflow

	doc.flags.ignore_version = False
	updated_doc = apply_workflow(doc, action)

	if reason and str(reason).strip():
		clean_reason = str(reason).strip()
		updated_doc.add_comment("Comment", text=clean_reason)

	return updated_doc
