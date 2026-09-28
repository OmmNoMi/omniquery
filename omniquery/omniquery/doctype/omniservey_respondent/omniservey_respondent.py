import frappe, hashlib
from frappe.model.document import Document

class OmniServeyRespondent(Document):
	def before_save(self):
		if self.phone_number and not self.phone_hash:
			self.phone_hash = hashlib.sha256(self.phone_number.strip().encode("utf-8")).hexdigest()
