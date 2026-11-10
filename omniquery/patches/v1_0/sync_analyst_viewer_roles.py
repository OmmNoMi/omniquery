import frappe
from omniquery.permissions import sync_user_project_roles


def execute():
	"""
	Ensures users assigned as Project Analyst, Project Viewer, or Project User in OmniQuery Project Member
	are synchronized with the corresponding native Frappe roles (OmniQuery Analyst, OmniQuery Viewer, OmniQuery User).
	"""
	users = frappe.get_all(
		"OmniQuery Project Member",
		pluck="user",
		distinct=True,
	)

	for u in users:
		if u:
			sync_user_project_roles(u)
