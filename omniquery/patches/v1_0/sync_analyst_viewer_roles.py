import frappe


def execute():
	"""
	Ensures users assigned as Project Analyst or Project Viewer in OmniQuery Project Member
	are synchronized with the corresponding native Frappe roles (OmniQuery Analyst, OmniQuery Viewer).
	"""
	role_map = {
		"Project Analyst": "OmniQuery Analyst",
		"Project Viewer": "OmniQuery Viewer",
	}

	for member_role, frappe_role in role_map.items():
		if not frappe.db.exists("Role", frappe_role):
			continue

		users = frappe.get_all(
			"OmniQuery Project Member",
			filters={"project_role": member_role},
			pluck="user",
			distinct=True,
		)

		for u in users:
			if u and frappe.db.exists("User", u):
				user_doc = frappe.get_doc("User", u)
				if not any(r.role == frappe_role for r in user_doc.roles):
					user_doc.append("roles", {"role": frappe_role})
					user_doc.save(ignore_permissions=True)
