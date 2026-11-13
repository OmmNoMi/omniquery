import frappe
from frappe.model.document import Document

from omniquery.permissions import remove_project_user_permissions, sync_user_project_roles


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
		# only users whose (user, project role) rows changed can need different access
		before = self.get_doc_before_save()
		changed = _member_pairs(self) ^ (_member_pairs(before) if before else set())
		_sync_users({user for user, _role in changed})

	def on_trash(self):
		# Frappe refuses the delete while a User Permission still links to this project
		remove_project_user_permissions(self.name)

	def after_delete(self):
		# the member rows are gone now, so each user is synced without this project
		_sync_users({m.user for m in self.members if m.user})

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


def _member_pairs(doc) -> set[tuple[str, str]]:
	return {(m.user, m.project_role) for m in doc.members if m.user}


def _sync_users(users: set[str]):
	for user in users:
		sync_user_project_roles(user)
