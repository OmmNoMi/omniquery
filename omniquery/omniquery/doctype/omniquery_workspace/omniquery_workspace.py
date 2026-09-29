import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class OmniQueryWorkspace(Document):
	def autoname(self):
		if self.name and not self.name.startswith("format:"):
			return
		if getattr(self, "workspace_code", None):
			self.name = self.workspace_code.strip().upper()
			return
		if self.workspace_name and self.workspace_name.startswith("test-"):
			self.name = self.workspace_name
			return
		self.name = frappe.model.naming.make_autoname("OQW-.###")

	def validate(self):
		self._ensure_admin_in_members()

	def _ensure_admin_in_members(self):
		if not self.workspace_admin:
			return
		admin_exists = any(m.user == self.workspace_admin for m in (self.members or []))
		if not admin_exists:
			self.append(
				"members",
				{
					"user": self.workspace_admin,
					"workspace_role": "Workspace Admin",
					"added_on": now_datetime(),
				},
			)
