import uuid
import frappe
from frappe.model.document import Document
from frappe.utils import now_datetime


class OmniQueryResponse(Document):
	def autoname(self):
		if self.name:
			return
		if self.idempotency_key and self.idempotency_key.startswith("OQS-"):
			self.name = self.idempotency_key
		else:
			clean_tmpl = (self.survey_template or "SURVEY").replace("OQS-", "")
			rand = uuid.uuid4().hex[:6]
			self.name = f"OQS-{clean_tmpl}-{rand}"

	def before_insert(self):
		if not self.synced_at:
			self.synced_at = now_datetime()
		self.set_title()

	def before_save(self):
		self.set_title()

	def set_title(self):
		import json
		from omniquery.services.response_title import resolve_response_title

		format_str = ""
		if self.survey_template and frappe.db.exists("OmniQuery Template", self.survey_template):
			format_str = (
				frappe.db.get_value("OmniQuery Template", self.survey_template, "response_title_format") or ""
			)

		answers = {}
		if self.response_payload:
			try:
				payload = (
					json.loads(self.response_payload)
					if isinstance(self.response_payload, str)
					else self.response_payload
				)
				if isinstance(payload, dict):
					if isinstance(payload.get("responses"), dict):
						answers.update(payload.get("responses"))
					for k, v in payload.items():
						if k != "responses" and not isinstance(v, (dict, list)):
							answers[k] = v
			except Exception:
				pass

		for item in self.items or []:
			code = getattr(item, "question_code", None)
			if code and code not in answers:
				val = (
					getattr(item, "value_text", None)
					or getattr(item, "value_numeric", None)
					or getattr(item, "value_json", None)
				)
				if val is not None:
					answers[code] = val

		self.title = resolve_response_title(answers, format_str, fallback_title=self.name or "Survey Response")
