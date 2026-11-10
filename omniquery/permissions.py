import frappe

SUPER_ROLES = {"Administrator", "System Manager", "OmniQuery Admin"}

PROJECT_ROLE_TO_FRAPPE_ROLE = {
	"Project Admin": "OmniQuery Manager",
	"Project Manager": "OmniQuery Manager",
	"Project Analyst": "OmniQuery Analyst",
	"Project Viewer": "OmniQuery Viewer",
	"Project User": "OmniQuery User",
}


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
	# Read, print, email, share, export, report require read access on the template
	if ptype in ("read", "print", "email", "share", "export", "report"):
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


def _get_user_project_roles(project: str | None, user: str) -> list[str]:
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
	public_cond = "(`tabOmniQuery Template`.`is_public` = 1 OR `tabOmniQuery Template`.`is_public_citizen_link` = 1)"
	if not projects:
		return public_cond
	escaped = ", ".join(frappe.db.escape(p) for p in projects)
	# Retain is_public_citizen_link in member branch too
	return f"({public_cond} OR `tabOmniQuery Template`.`project` IN ({escaped}))"


def _is_response_surveyor_or_owner(doc, user: str) -> bool:
	if not doc or not user:
		return False
	if getattr(doc, "owner", None) == user:
		return True
	surveyor = getattr(doc, "surveyor", None)
	if surveyor:
		surveyor_user = frappe.db.get_value("OmniQuery Surveyor", surveyor, "user")
		if surveyor_user == user:
			return True
	return False


def get_response_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if is_super_user(user):
		return ""

	escaped_user = frappe.db.escape(user)
	# Surveyor match must resolve through tabOmniQuery Surveyor.user (surveyor field is a Link to OmniQuery Surveyor)
	surveyor_cond = (
		f"(`tabOmniQuery Response`.`owner` = {escaped_user} OR "
		f"`tabOmniQuery Response`.`surveyor` IN (SELECT `name` FROM `tabOmniQuery Surveyor` WHERE `user` = {escaped_user}))"
	)

	# Scoped by projects where member has access to view all responses (Admin, Manager, Analyst, Viewer)
	# Field enumerators (Project User) only see their own responses
	allowed_roles = ["Project Admin", "Project Manager", "Project Analyst", "Project Viewer"]
	projects = frappe.get_all(
		"OmniQuery Project Member",
		filters={"user": user, "project_role": ["in", allowed_roles]},
		pluck="parent",
	)
	if not projects:
		return surveyor_cond

	escaped_projects = ", ".join(frappe.db.escape(p) for p in projects)
	return (
		f"(`tabOmniQuery Response`.`survey_template` IN (SELECT `name` FROM `tabOmniQuery Template` WHERE `project` IN ({escaped_projects})) "
		f"OR {surveyor_cond})"
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

	# Read, print, email, share: user must have read access on this specific response
	if ptype in ("read", "print", "email", "share"):
		return _can_read_response(doc, user)

	if ptype in ("write", "submit"):
		return _can_write_response(doc, user)

	if ptype in ("export", "report"):
		return _can_export_response(doc, user)

	if ptype in ("create", "delete", "cancel"):
		return _can_write_response(doc, user)

	return False


def _can_read_response(doc, user: str) -> bool:
	if _is_response_surveyor_or_owner(doc, user):
		return True
	roles = _get_user_project_roles(_get_doc_project(doc), user)
	allowed = {"Project Admin", "Project Manager", "Project Analyst", "Project Viewer"}
	return bool(set(roles) & allowed)


def _can_write_response(doc, user: str) -> bool:
	# Project-level roles on this specific response's project decide write access
	proj = _get_doc_project(doc)
	roles = set(_get_user_project_roles(proj, user)) if proj else set()

	# If user is only Project Analyst or Project Viewer on this project, deny write
	if (roles & {"Project Analyst", "Project Viewer"}) and not (roles & {"Project Admin", "Project Manager"}):
		return False

	if _is_response_surveyor_or_owner(doc, user):
		return True

	return bool(roles & {"Project User", "Project Admin", "Project Manager"})


def _can_export_response(doc, user: str) -> bool:
	# Export on a document requires read access AND analyst/manager/admin on THAT project
	if not _can_read_response(doc, user):
		return False
	proj = _get_doc_project(doc)
	roles = set(_get_user_project_roles(proj, user)) if proj else set()
	return bool(roles & {"Project Admin", "Project Manager", "Project Analyst"})


def sync_user_project_roles(user: str):
	"""
	Synchronizes native Frappe roles based on active project memberships across ALL projects.
	If a user no longer holds a role in any project, the role is revoked.
	"""
	if not user or not frappe.db.exists("User", user):
		return

	# Gather all project roles the user currently holds across all projects
	held_project_roles = set(
		frappe.get_all(
			"OmniQuery Project Member",
			filters={"user": user},
			pluck="project_role",
		)
	)

	# Compute desired Frappe roles based on active project memberships
	desired_roles = set()
	for proj_role in held_project_roles:
		frappe_role = PROJECT_ROLE_TO_FRAPPE_ROLE.get(proj_role)
		if frappe_role:
			desired_roles.add(frappe_role)

	managed_roles = set(PROJECT_ROLE_TO_FRAPPE_ROLE.values())

	user_doc = frappe.get_doc("User", user)
	existing_roles = {r.role for r in user_doc.roles}
	roles_to_add = [r for r in desired_roles if r not in existing_roles and frappe.db.exists("Role", r)]
	roles_to_remove = [r for r in managed_roles if r not in desired_roles and r in existing_roles]

	if roles_to_add:
		user_doc.add_roles(*roles_to_add)
	if roles_to_remove:
		user_doc.remove_roles(*roles_to_remove)
