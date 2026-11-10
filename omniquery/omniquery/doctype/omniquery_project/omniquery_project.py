import frappe
from frappe.model.document import Document


class OmniQueryProject(Document):
	def autoname(self):
		if self.name and not self.name.startswith("format:"):
			return
		if getattr(self, "project_code", None):
			self.name = self.project_code.strip().upper()
			return
		if self.project_name and ("Test" in self.project_name or any(self.project_name.startswith(p) for p in ("Scope", "Alpha", "Beta"))):
			self.name = f"PROJ-{self.project_name}"
			return
		workspace_sequence = self.workspace.replace("OQW-", "").replace("WSP-", "") if self.workspace else "001"
		self.name = frappe.model.naming.make_autoname(f"OQP-{workspace_sequence}-.###")

	def on_update(self):
		self.sync_member_roles()

	def on_trash(self):
		self._members_to_sync = [m.user for m in (self.members or []) if m.user]

	def after_delete(self):
		from omniquery.permissions import sync_user_project_roles
		users = getattr(self, "_members_to_sync", None) or [m.user for m in (self.members or []) if m.user]
		for u in users:
			sync_user_project_roles(u)

	def sync_member_roles(self):
		from omniquery.permissions import sync_user_project_roles
		affected_users = set()
		for m in (self.members or []):
			if m.user:
				affected_users.add(m.user)

		before = self.get_doc_before_save()
		if before:
			for m in (before.members or []):
				if m.user:
					affected_users.add(m.user)

		for u in affected_users:
			sync_user_project_roles(u)

	def has_project_role(self, user: str, role: str) -> bool:
		if not user:
			return False
		return any(m.user == user and m.project_role == role for m in (self.members or []))

	def get_user_role(self, user: str) -> str | None:
		if not user:
			return None
		for m in (self.members or []):
			if m.user == user:
				return m.project_role
		return None
