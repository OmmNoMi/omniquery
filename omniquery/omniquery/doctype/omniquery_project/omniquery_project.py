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
		self.ensure_surveyors()

	def ensure_surveyors(self):
		for m in self.members or []:
			if not m.user:
				continue
			if not frappe.db.exists("OmniQuery Surveyor", {"user": m.user}):
				user_info = frappe.db.get_value("User", m.user, ["first_name", "last_name", "full_name"], as_dict=True)
				name_str = (user_info.full_name if user_info else None) or (user_info.first_name if user_info else None) or m.user.split("@")[0]
				try:
					surveyor = frappe.get_doc(
						{
							"doctype": "OmniQuery Surveyor",
							"surveyor_name": name_str,
							"user": m.user,
							"status": "Active",
						}
					)
					surveyor.flags.ignore_permissions = True
					surveyor.insert(ignore_permissions=True)
				except Exception as e:
					frappe.log_error("Auto Surveyor Creation Error", str(e))

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
