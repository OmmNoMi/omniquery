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

	def sync_member_roles(self):
		role_map = {
			"Project Analyst": "OmniQuery Analyst",
			"Project Viewer": "OmniQuery Viewer",
		}
		for m in (self.members or []):
			if not m.user:
				continue
			target_role = role_map.get(m.project_role)
			if target_role and frappe.db.exists("User", m.user) and frappe.db.exists("Role", target_role):
				user_doc = frappe.get_doc("User", m.user)
				if not any(r.role == target_role for r in user_doc.roles):
					user_doc.append("roles", {"role": target_role})
					user_doc.save(ignore_permissions=True)

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
