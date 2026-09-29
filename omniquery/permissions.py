import frappe

SUPER_ROLES = {"Administrator", "System Manager", "OmniQuery Admin"}


def is_super_user(user: str) -> bool:
	if not user or user == "Administrator":
		return True
	user_roles = set(frappe.get_roles(user))
	return bool(user_roles & SUPER_ROLES)


def has_template_permission(doc, ptype: str = "read", user: str | None = None) -> bool:
	user = user or frappe.session.user
	if is_super_user(user):
		return True
	if ptype == "read":
		return _can_read_template(doc, user)
	if ptype in ("write", "submit", "amend", "cancel", "delete"):
		return _can_write_template(doc, user)
	return False


def _can_read_template(doc, user: str) -> bool:
	if getattr(doc, "is_public", 0) or getattr(doc, "is_public_citizen_link", 0):
		return True
	roles = _get_user_project_roles(getattr(doc, "project", None), user)
	return bool(roles)


def _can_write_template(doc, user: str) -> bool:
	roles = _get_user_project_roles(getattr(doc, "project", None), user)
	return "Project Admin" in roles


def _get_user_project_roles(project: str, user: str) -> list[str]:
	if not project or not user:
		return []
	return frappe.get_all(
		"OmniQuery Project Member",
		filters={"parent": project, "user": user},
		pluck="project_role",
	)


def get_template_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if is_super_user(user):
		return ""
	projects = frappe.get_all("OmniQuery Project Member", filters={"user": user}, pluck="parent")
	if not projects:
		return "(`tabOmniQuery Template`.`is_public` = 1 OR `tabOmniQuery Template`.`is_public_citizen_link` = 1)"
	proj_list = "', '".join(frappe.db.escape(p) for p in projects)
	return f"(`tabOmniQuery Template`.`is_public` = 1 OR `tabOmniQuery Template`.`project` IN ('{proj_list}'))"


def has_response_permission(doc, ptype: str = "read", user: str | None = None) -> bool:
	user = user or frappe.session.user
	if is_super_user(user):
		return True
	if ptype == "read":
		return _can_read_response(doc, user)
	if ptype in ("write", "submit"):
		return _can_write_response(doc, user)
	return False


def _can_read_response(doc, user: str) -> bool:
	roles = _get_user_project_roles(getattr(doc, "project", None), user)
	allowed = {"Project Admin", "Project Manager", "Project Analyst", "Project Viewer"}
	return bool(set(roles) & allowed)


def _can_write_response(doc, user: str) -> bool:
	if getattr(doc, "surveyor", None) == user or getattr(doc, "owner", None) == user:
		return True
	roles = _get_user_project_roles(getattr(doc, "project", None), user)
	return bool(set(roles) & {"Project User", "Project Admin"})
