from collections import Counter

import frappe

SURVEYOR = "OmniQuery Surveyor"


def execute():
	"""Detach duplicate Surveyor-to-User links before model sync adds the unique index on user.

	The oldest Surveyor for each User keeps the link. Later ones keep their responses and
	history but lose the user, become Inactive and get a comment saying why. MariaDB allows
	many NULLs in a unique column, so the index can then be added.
	"""
	if not frappe.db.table_exists(SURVEYOR):
		return
	for user in duplicate_users():
		for name in frappe.get_all(SURVEYOR, filters={"user": user}, order_by="creation asc", pluck="name")[1:]:
			detach(name, user)


def duplicate_users():
	"""Users linked from more than one Surveyor."""
	counts = Counter(frappe.get_all(SURVEYOR, filters={"user": ["is", "set"]}, pluck="user"))
	return [user for user, count in counts.items() if count > 1]


def detach(name, user):
	frappe.db.set_value(SURVEYOR, name, {"user": None, "status": "Inactive"}, update_modified=False)
	frappe.get_doc(SURVEYOR, name).add_comment(
		"Comment", f"Unlinked from {user} by a migration: another Surveyor already uses that login."
	)
