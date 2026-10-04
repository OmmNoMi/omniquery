frappe.ui.form.on("OmniQuery Template", {
	refresh: function(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("📱 Preview in Field App (PWA)"), function() {
				const pwaUrl = `/omniquery/${encodeURIComponent(frm.doc.name)}`;
				window.open(pwaUrl, "_blank");
			});
			frm.change_custom_button_type(__("📱 Preview in Field App (PWA)"), null, "primary");

			frm.add_custom_button(__("Export Responses (CSV)"), function() {
				const exportUrl = `/api/method/omniquery.api.export.export_flattened_responses?template_name=${encodeURIComponent(frm.doc.name)}`;
				window.open(exportUrl, "_blank");
			}, __("Actions"));
		}
	}
});
