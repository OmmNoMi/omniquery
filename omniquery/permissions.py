import frappe
from frappe import _

# Site-wide roles with unrestricted access across all templates and responses
SUPER_ROLES = {"Administrator", "System Manager", "OmniQuery Admin"}
# Site-wide reviewer: a User Permission would restrict it, so sync never scopes it
REVIEWER_ROLE = "OmniQuery Manager"

# Desk roles that project membership grants and takes away (#62). Each is site-wide in its
# DocPerms and scoped to the member's projects by the User Permissions sync keeps beside it.
MEMBER_ROLE_GRANTS = {
	"Project Admin": "OmniQuery Analyst",
	"Project Manager": "OmniQuery Analyst",
	"Project Analyst": "OmniQuery Analyst",
	"Project Viewer": "OmniQuery Viewer",
}
SYNCED_ROLES = set(MEMBER_ROLE_GRANTS.values())
# who gets the OmniQuery Desk app: its workspace, desktop icon and Apps screen entry (#53).
# Field surveyors (OmniQuery User) work in the PWA and are left out.
DESK_APP_ROLES = ("System Manager", "OmniQuery Admin", REVIEWER_ROLE, *sorted(SYNCED_ROLES))
# project roles that may export the project's responses through api.export
EXPORT_PROJECT_ROLES = ("Project Admin", "Project Manager", "Project Analyst")
# project roles that read the project's responses in Desk, and so its analytics (#47)
READ_PROJECT_ROLES = tuple(MEMBER_ROLE_GRANTS)
# the scoped doctype: sync owns every User Permission on OmniQuery Project applicable to it
SCOPED_DOCTYPE = "OmniQuery Response"

TEMPLATE_READ_PTYPES = ("read", "print", "email", "share", "export", "report")
TEMPLATE_WRITE_PTYPES = ("write", "submit", "amend", "cancel", "delete")


def is_super_user(user: str | None) -> bool:
	if not user:
		return False
	return user == "Administrator" or bool(set(frappe.get_roles(user)) & SUPER_ROLES)


def can_open_desk_app() -> bool:
	"""The add_to_apps_screen has_permission hook: only DESK_APP_ROLES see OmniQuery on /apps."""
	user = frappe.session.user
	return user == "Administrator" or bool(set(frappe.get_roles(user)) & set(DESK_APP_ROLES))


def is_site_wide_reviewer(user: str) -> bool:
	return is_super_user(user) or REVIEWER_ROLE in frappe.get_roles(user)


def is_unassigned(user: str) -> bool:
	"""Signed in, but in no project and with no site-wide role: the PWA asks them to see their supervisor (#57)."""
	return bool(user) and user != "Guest" and not is_site_wide_reviewer(user) and not get_member_projects(user)


def can_view_project(project: str, user: str) -> bool:
	"""Project details are for its members and site-wide reviewers, or anyone when it runs a public survey (#57)."""
	if is_site_wide_reviewer(user) or _get_user_project_roles(project, user):
		return True
	public = {"project": project, "status": "Published", "docstatus": 1}
	return bool(frappe.get_all("OmniQuery Template", filters=public, or_filters={"is_public": 1, "is_public_citizen_link": 1}, limit=1))


def has_template_permission(doc, ptype: str = "read", user: str | None = None) -> bool:
	user = user or frappe.session.user
	if is_super_user(user):
		return True
	if ptype in TEMPLATE_READ_PTYPES:
		return _can_read_template(doc, user)
	if ptype in TEMPLATE_WRITE_PTYPES:
		return _can_write_template(doc, user)
	return ptype in ("create", "import") and _can_create_template(doc, user)


def _can_read_template(doc, user: str) -> bool:
	if getattr(doc, "is_public", 0) or getattr(doc, "is_public_citizen_link", 0):
		return True
	return bool(_get_user_project_roles(getattr(doc, "project", None), user))


def _can_write_template(doc, user: str) -> bool:
	return "Project Admin" in _get_user_project_roles(getattr(doc, "project", None), user)


def _can_create_template(doc, user: str) -> bool:
	if REVIEWER_ROLE in frappe.get_roles(user) or not getattr(doc, "project", None):
		return True
	return _can_write_template(doc, user)


def _get_user_project_roles(project: str | None, user: str) -> list[str]:
	if not project or not user:
		return []
	return frappe.get_all(
		"OmniQuery Project Member",
		filters={"parent": project, "parenttype": "OmniQuery Project", "user": user},
		pluck="project_role",
	)


def get_member_projects(user: str, project_roles=None) -> list[str]:
	"""Projects the user is a member of, optionally only through one of project_roles."""
	filters = {"parenttype": "OmniQuery Project", "user": user}
	if project_roles:
		filters["project_role"] = ["in", list(project_roles)]
	return frappe.get_all("OmniQuery Project Member", filters=filters, pluck="parent", distinct=True)


def permitted_projects(project, project_roles, message: str) -> list[str] | None:
	"""The projects the session user reaches through project_roles; None means every project (site-wide reviewer)."""
	user = frappe.session.user
	if is_site_wide_reviewer(user):
		return [project] if project else None
	allowed = get_member_projects(user, project_roles)
	if not allowed or (project and project not in allowed):
		frappe.throw(message, frappe.PermissionError)
	return [project] if project else allowed


def get_template_query_conditions(user: str | None = None) -> str:
	user = user or frappe.session.user
	if is_super_user(user):
		return ""
	public_cond = "(`tabOmniQuery Template`.`is_public` = 1 OR `tabOmniQuery Template`.`is_public_citizen_link` = 1)"
	projects = get_member_projects(user)
	if not projects:
		return public_cond
	escaped = ", ".join(frappe.db.escape(p) for p in projects)
	return f"({public_cond} OR `tabOmniQuery Template`.`project` IN ({escaped}))"


def sync_user_project_roles(user: str) -> set[str]:
	"""Grant the Desk roles and per-project User Permissions the user's memberships call for (#62).

	Only SYNCED_ROLES and the User Permissions sync owns are touched; roles an administrator
	assigned (OmniQuery Manager, OmniQuery User...) are left alone.
	"""
	if not user or user == "Administrator" or not frappe.db.exists("User", user):
		return set()
	memberships = frappe.get_all(
		"OmniQuery Project Member", filters={"parenttype": "OmniQuery Project", "user": user}, fields=["parent", "project_role"]
	)
	desired = {MEMBER_ROLE_GRANTS[m.project_role] for m in memberships if m.project_role in MEMBER_ROLE_GRANTS}
	_sync_roles(user, desired)
	_sync_user_permissions(user, {m.parent for m in memberships if m.project_role in MEMBER_ROLE_GRANTS})
	return desired


def _sync_roles(user: str, desired: set[str]):
	user_doc = frappe.get_doc("User", user)
	held = {r.role for r in user_doc.roles}
	if (held & SYNCED_ROLES) == desired:
		return
	user_doc.set("roles", [r for r in user_doc.roles if r.role not in SYNCED_ROLES - desired])
	user_doc.append_roles(*desired)
	user_doc.save(ignore_permissions=True)
	_warn_if_role_profile_stripped(user_doc, desired)


def _warn_if_role_profile_stripped(user_doc, desired: set[str]):
	# User.validate keeps only the roles of the user's Role Profiles, so a profile can undo the grant
	missing = desired - {r.role for r in user_doc.roles}
	if missing:
		frappe.msgprint(
			_("{0} has a Role Profile without {1}, so their project access is not active. Add the role to that Role Profile.").format(
				frappe.bold(user_doc.name), ", ".join(sorted(missing))
			),
			title=_("Role Profile blocks project access"),
			indicator="orange",
		)


def _sync_user_permissions(user: str, projects: set[str]):
	"""Scope the synced roles to the user's projects; a site-wide reviewer must not be scoped."""
	if is_site_wide_reviewer(user):
		projects = set()
	existing = dict(frappe.get_all("User Permission", filters=_owned_user_permissions(user), fields=["for_value", "name"], as_list=True))
	for project in projects - set(existing):
		frappe.permissions.add_user_permission("OmniQuery Project", project, user, ignore_permissions=True, applicable_for=SCOPED_DOCTYPE)
	for project in set(existing) - projects:
		frappe.delete_doc("User Permission", existing[project], ignore_permissions=True, force=True)


def remove_project_user_permissions(project: str):
	"""A project cannot be deleted while a User Permission still points at it."""
	filters = {**_owned_user_permissions(None), "for_value": project}
	for name in frappe.get_all("User Permission", filters=filters, pluck="name"):
		frappe.delete_doc("User Permission", name, ignore_permissions=True, force=True)


def _owned_user_permissions(user: str | None) -> dict:
	filters = {"allow": "OmniQuery Project", "applicable_for": SCOPED_DOCTYPE, "apply_to_all_doctypes": 0}
	return {**filters, "user": user} if user else filters
