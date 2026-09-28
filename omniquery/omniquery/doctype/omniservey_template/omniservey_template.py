import frappe, json, hashlib
from frappe.model.document import Document
from frappe.utils import now_datetime

class OmniServeyTemplate(Document):
	def before_save(self):
		# Automatically compile sections and questions into a minified, optimized JSON schema bundle
		schema_data = {
			"template_name": self.name or self.title,
			"title": self.title,
			"project": self.project,
			"version": self.version or 1,
			"status": self.status,
			"sections": [
				{
					"section_code": s.section_code,
					"section_title": s.section_title,
					"description": s.description,
					"display_order": s.display_order or s.idx
				}
				for s in (self.sections or [])
			],
			"questions": [
				{
					"section_code": q.section_code,
					"question_code": q.question_code,
					"label_en": q.label_en,
					"field_type": q.field_type,
					"is_mandatory": bool(q.is_mandatory),
					"display_order": q.display_order or q.idx,
					"options": json.loads(q.options_json) if q.options_json else None,
					"conditional_logic": json.loads(q.conditional_logic_json) if q.conditional_logic_json else None,
					"validation_rules": json.loads(q.validation_rules_json) if q.validation_rules_json else None,
					"audio_prompt": q.audio_prompt
				}
				for q in (self.questions or [])
			]
		}
		
		raw_json = json.dumps(schema_data, separators=(",", ":"))
		self.compiled_schema_json = raw_json
		self.schema_hash_sha256 = hashlib.sha256(raw_json.encode("utf-8")).hexdigest()
		
		if self.status == "Published" and not self.published_at:
			self.published_at = now_datetime()
