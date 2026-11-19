"""The key a field device files an interview under, which is also the Response's name (#25).

A device makes the key offline with crypto.randomUUID, so two devices never pick the same one and a
retried sync finds the Response it already made. Builds before #25 made OQS-{template}-{random} for an
interview and WAL-{time}-{random} for a queue entry; devices still hold those in their queue and their
saved drafts, so they are accepted as they are until no such build is left in the field.
"""

import uuid

import frappe
from frappe import _

LEGACY_KEY_PREFIXES = ("OQS-", "WAL-")


class InvalidIdempotencyKey(frappe.ValidationError):
	pass


def canonical_key(key):
	"""The key one interview is filed under: a UUIDv4 in its 8-4-4-4-12 lower-case form, however it was
	spelled, or a legacy key as it was sent. None when it is neither."""
	if not isinstance(key, str):
		return None
	if key.startswith(LEGACY_KEY_PREFIXES):
		return key
	try:
		value = uuid.UUID(key)
	except ValueError:
		return None
	if value.version != 4:  # None unless the variant is RFC 4122, so this checks both
		return None
	return str(value)


def new_key():
	return str(uuid.uuid4())


def invalid_key_message():
	return _("The idempotency key must be a UUIDv4")


def require_key(key):
	"""The canonical key, a new one when none was given, or an InvalidIdempotencyKey error."""
	if not key:
		return new_key()
	canonical = canonical_key(key)
	if not canonical:
		frappe.throw(invalid_key_message(), InvalidIdempotencyKey)
	return canonical
