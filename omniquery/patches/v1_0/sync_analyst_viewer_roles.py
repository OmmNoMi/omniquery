import frappe
from omniquery.permissions import sync_user_project_roles


def execute():
	"""
	Ensures users assigned as Project Analyst or Project Viewer in OmniQuery Project Member
	are synchronized with the corresponding native Frappe roles (OmniQuery Analyst, OmniQuery Viewer).
	"""
	users = frappe.get_all(
		"OmniQuery Project Member",
		pluck="user",
		distinct=True,
	)

	for u in users:
		if u:
			sync_user_project_roles(u)
