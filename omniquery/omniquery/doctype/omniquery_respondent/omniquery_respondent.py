import hashlib

import frappe
from frappe.model.document import Document

from omniquery.services.location import resolve_gps_status


class OmniQueryRespondent(Document):
	def validate(self):
		# a location typed in the form or imported counts as much as one the field app sent
		self.gps_status = resolve_gps_status(self.gps_latitude, self.gps_longitude, self.gps_status)

	def before_save(self):
		if self.phone_number and not self.phone_hash:
			self.phone_hash = hashlib.sha256(self.phone_number.strip().encode("utf-8")).hexdigest()
