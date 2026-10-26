frappe.ui.form.on("OmniQuery Sync Audit Log", {
	refresh(frm) {
		if (frm.doc.sync_status === "FAILED" && frm.doc.raw_payload) {
			frm.add_custom_button(__("Replay Payload"), () => {
				frappe.show_alert({
					message: __("Replaying submission payload..."),
					indicator: "blue",
				});
				frm.call("replay").then((r) => {
					if (r.message && r.message.status === "SUCCESS") {
						frappe.show_alert({
							message: __("Payload replayed successfully! Response linked: {0}", [r.message.doc_name]),
							indicator: "green",
						});
						frm.reload_doc();
					} else {
						frappe.msgprint({
							title: __("Replay Failed"),
							indicator: "red",
							message: r.message ? r.message.error : __("Unknown error during replay"),
						});
					}
				});
			}).addClass("btn-primary");
		}
	},
});
