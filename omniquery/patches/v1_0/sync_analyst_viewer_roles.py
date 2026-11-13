import frappe

from omniquery.install import ensure_roles
from omniquery.permissions import sync_user_project_roles


def execute():
	"""#62: give every response its project, then the Desk roles and User Permissions members need."""
	ensure_roles()  # after_migrate creates them too, but only after this patch has run
	for template, project in frappe.get_all("OmniQuery Template", fields=["name", "project"], as_list=True):
		frappe.db.set_value("OmniQuery Response", {"survey_template": template}, "project", project, update_modified=False)
	users = frappe.get_all("OmniQuery Project Member", filters={"parenttype": "OmniQuery Project"}, pluck="user", distinct=True)
	for user in filter(None, users):
		sync_user_project_roles(user)
