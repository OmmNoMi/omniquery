import frappe

SUPER_ROLES = {"Administrator", "System Manager", "OmniQuery Admin"}


def is_super_user(user: str | None) -> bool:
	if not user:
		return False
	if user == "Administrator":
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
	escaped = ", ".join(frappe.db.escape(p) for p in projects)
	return f"(`tabOmniQuery Template`.`is_public` = 1 OR `tabOmniQuery Template`.`project` IN ({escaped}))"


def get_response_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if is_super_user(user):
		return ""
	user_roles = set(frappe.get_roles(user))
	if "OmniQuery Admin" in user_roles or "OmniQuery Manager" in user_roles:
		return ""
	projects = frappe.get_all("OmniQuery Project Member", filters={"user": user}, pluck="parent")
	if not projects:
		return f"(`tabOmniQuery Response`.`surveyor` = {frappe.db.escape(user)} OR `tabOmniQuery Response`.`owner` = {frappe.db.escape(user)})"
	escaped = ", ".join(frappe.db.escape(p) for p in projects)
	return (
		f"(`tabOmniQuery Response`.`survey_template` IN (SELECT `name` FROM `tabOmniQuery Template` WHERE `project` IN ({escaped})) "
		f"OR `tabOmniQuery Response`.`surveyor` = {frappe.db.escape(user)})"
	)


def _get_doc_project(doc) -> str | None:
	if not doc:
		return None
	project = getattr(doc, "project", None)
	if project:
		return project
	template = getattr(doc, "survey_template", None)
	if template:
		return frappe.db.get_value("OmniQuery Template", template, "project")
	return None


def has_response_permission(doc, ptype: str = "read", user: str | None = None) -> bool:
	user = user or frappe.session.user
	if is_super_user(user):
		return True
	user_roles = set(frappe.get_roles(user))
	if "OmniQuery Admin" in user_roles or "OmniQuery Manager" in user_roles:
		return True
	if ptype == "read":
		return _can_read_response(doc, user)
	if ptype in ("write", "submit"):
		return _can_write_response(doc, user)
	if ptype in ("export", "report"):
		return "OmniQuery Analyst" in user_roles or "Project Analyst" in _get_user_project_roles(_get_doc_project(doc), user)
	return False


def _can_read_response(doc, user: str) -> bool:
	if getattr(doc, "surveyor", None) == user or getattr(doc, "owner", None) == user:
		return True
	roles = _get_user_project_roles(_get_doc_project(doc), user)
	allowed = {"Project Admin", "Project Manager", "Project Analyst", "Project Viewer"}
	return bool(set(roles) & allowed)


def _can_write_response(doc, user: str) -> bool:
	user_roles = set(frappe.get_roles(user))
	if (user_roles & {"OmniQuery Analyst", "OmniQuery Viewer"}) and not (user_roles & {"OmniQuery Manager", "OmniQuery Admin"}):
		return False
	if getattr(doc, "surveyor", None) == user or getattr(doc, "owner", None) == user:
		return True
	roles = _get_user_project_roles(_get_doc_project(doc), user)
	return bool(set(roles) & {"Project User", "Project Admin"})
