frappe.ui.form.on("OmniQuery Template", {
	refresh: function(frm) {
		if (!frm.is_new()) {
			frm.add_custom_button(__("📱 Preview in Field App (PWA)"), function() {
				const pwaUrl = `/omniquery/${encodeURIComponent(frm.doc.name)}`;
				window.open(pwaUrl, "_blank");
			});
			frm.change_custom_button_type(__("📱 Preview in Field App (PWA)"), null, "primary");
		}
	}
});
