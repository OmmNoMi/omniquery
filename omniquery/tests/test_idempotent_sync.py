import frappe, unittest, uuid, json
try:
	from omniquery.api.sync import batch_push
except ImportError:
	from omniservey.api.sync import batch_push

class TestIdempotentSync(unittest.TestCase):
	def setUp(self):
		# Setup dummy surveyor
		if not frappe.db.exists("OmniServey Surveyor", {"surveyor_name": "Test Surveyor Nomesh"}):
			frappe.get_doc({
				"doctype": "OmniServey Surveyor",
				"surveyor_name": "Test Surveyor Nomesh",
				"user": "Administrator",
				"status": "Active"
			}).insert(ignore_permissions=True)
			
	def test_zero_data_loss_and_idempotency(self):
		test_uuid = str(uuid.uuid4())
		
		submission_payload = {
			"idempotency_key": test_uuid,
			"survey_template": "TMPL-Test Women Dairy Assessment 2026-1",
			"template_version": 1,
			"surveyor": "SURV-Test Surveyor Nomesh",
			"gps_latitude": 31.7088,
			"gps_longitude": 76.9320,
			"gps_accuracy": 4.5,
			"items": [
				{
					"question_code": "Q_HERD_COUNT",
					"question_label": "Total number of milch cattle?",
					"value": 6
				},
				{
					"question_code": "Q_DAILY_MILK_LITERS",
					"question_label": "Average daily milk output (Liters)?",
					"value": 42.5
				}
			]
		}
		
		# 1. First push: must succeed
		frappe.form_dict.data = json.dumps({"submissions": [submission_payload]})
		response_1 = batch_push()
		
		self.assertEqual(response_1["results"][0]["status"], "SUCCESS")
		doc_name = response_1["results"][0]["doc_name"]
		
		# Verify Response doc exists
		resp_doc = frappe.get_doc("OmniServey Response", doc_name)
		self.assertEqual(resp_doc.idempotency_key, test_uuid)
		self.assertEqual(len(resp_doc.items), 2)
		self.assertEqual(resp_doc.items[0].value_numeric, 6.0)
		self.assertEqual(resp_doc.items[1].value_numeric, 42.5)
		
		# Verify Sync Audit Log exists
		audit = frappe.get_doc("OmniServey Sync Audit Log", f"SYNC-{test_uuid}")
		self.assertEqual(audit.sync_status, "SUCCESS")
		
		# 2. Second push with same UUID (simulating network timeout retry): must skip duplicate
		response_2 = batch_push()
		self.assertEqual(response_2["results"][0]["status"], "DUPLICATE_SKIPPED")
		self.assertEqual(response_2["results"][0]["doc_name"], doc_name)
		
		# Assert no duplicate responses created in DB
		count = frappe.db.count("OmniServey Response", {"idempotency_key": test_uuid})
		self.assertEqual(count, 1)
