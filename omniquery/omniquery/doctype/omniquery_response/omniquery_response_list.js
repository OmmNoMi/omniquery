frappe.listview_settings["OmniQuery Response"] = {
	add_fields: ["survey_status", "audio_recording", "gps_latitude", "gps_longitude", "captured_at_local"],
	get_indicator: function(doc) {
		if (doc.survey_status === "Approved") {
			return [__("Approved"), "green", "survey_status,=,Approved"];
		} else if (doc.survey_status === "Audit Flagged") {
			return [__("Audit Flagged"), "red", "survey_status,=,Audit Flagged"];
		} else if (doc.survey_status === "Supervisor Verified") {
			return [__("Verified"), "blue", "survey_status,=,Supervisor Verified"];
		} else if (doc.survey_status === "Submitted") {
			return [__("Submitted"), "orange", "survey_status,=,Submitted"];
		} else {
			return [__("Draft"), "gray", "survey_status,=,Draft"];
		}
	},
	onload: function(listview) {
		// Bulk Supervisor Approval Action
		listview.page.add_action_item(__("Approve Selected"), function() {
			const checked = listview.get_checked_items();
			if (!checked.length) return;

			frappe.confirm(
				__("Approve {0} selected responses as supervisor verified?", [checked.length]),
				function() {
					frappe.call({
						method: "frappe.client.bulk_update",
						args: {
							docs: checked.map(d => ({ doctype: "OmniQuery Response", name: d.name, survey_status: "Approved" }))
						},
						callback: function() {
							frappe.show_alert({ message: __("Responses approved successfully"), indicator: "green" });
							listview.refresh();
						}
					});
				}
			);
		});

		// Bulk Outlier / Re-Survey Flag Action
		listview.page.add_action_item(__("Flag for Re-Survey"), function() {
			const checked = listview.get_checked_items();
			if (!checked.length) return;

			frappe.prompt(
				[{ fieldname: "reason", fieldtype: "Small Text", label: __("Reason for Re-Survey"), reqd: 1 }],
				function(values) {
					frappe.call({
						method: "frappe.client.bulk_update",
						args: {
							docs: checked.map(d => ({ doctype: "OmniQuery Response", name: d.name, survey_status: "Audit Flagged" }))
						},
						callback: function() {
							frappe.show_alert({ message: __("Responses flagged for re-survey"), indicator: "orange" });
							listview.refresh();
						}
					});
				},
				__("Flag Responses")
			);
		});
	},
	button: {
		show: function(doc) {
			return Boolean(doc.audio_recording);
		},
		get_label: function() {
			return __("▶ Audio");
		},
		get_description: function(doc) {
			return __("Play interview audio recording");
		},
		action: function(doc) {
			if (!doc.audio_recording) return;

			const d = new frappe.ui.Dialog({
				title: __("Interview Audio Preview: {0}", [doc.name]),
				fields: [
					{
						fieldtype: "HTML",
						fieldname: "audio_html",
						options: `
							<div class="p-3 text-center">
								<p class="text-muted small mb-2">${doc.survey_template || ""} · ${doc.surveyor || ""}</p>
								<audio controls autoplay style="width: 100%; height: 44px; border-radius: 8px;">
									<source src="${doc.audio_recording}">
									Your browser does not support audio playback.
								</audio>
							</div>
						`
					}
				],
				primary_action_label: __("Close"),
				primary_action: function() {
					d.hide();
				}
			});
			d.show();
		}
	}
};
