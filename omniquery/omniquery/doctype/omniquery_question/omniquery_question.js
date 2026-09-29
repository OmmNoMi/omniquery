frappe.ui.form.on("OmniQuery Question", {
	refresh(frm) {
		if (!frm.is_new() && frm.doc.scope !== "Platform") {
			frm.add_custom_button(__("🚀 Elevate Scope"), () => {
				open_elevate_scope_dialog(frm);
			}, __("Actions"));
		}
	},
});

function open_elevate_scope_dialog(frm) {
	const currentScope = frm.doc.scope || "Survey";
	const scopeOptions = currentScope === "Survey"
		? ["Project", "Workspace", "Platform"]
		: (currentScope === "Project" ? ["Workspace", "Platform"] : ["Platform"]);

	const d = new frappe.ui.Dialog({
		title: __("Elevate Question Scope"),
		fields: [
			{
				fieldname: "target_scope",
				fieldtype: "Select",
				label: __("Target Higher Scope"),
				options: scopeOptions,
				default: scopeOptions[0],
				reqd: 1,
				onchange: () => {
					const val = d.get_value("target_scope");
					d.toggle_display("target_workspace", val === "Workspace" || val === "Project");
					d.toggle_display("target_project", val === "Project");
				}
			},
			{
				fieldname: "target_workspace",
				fieldtype: "Link",
				options: "OmniQuery Workspace",
				label: __("Target Workspace"),
				default: frm.doc.workspace,
				depends_on: "eval:doc.target_scope == 'Workspace' || doc.target_scope == 'Project'"
			},
			{
				fieldname: "target_project",
				fieldtype: "Link",
				options: "OmniQuery Project",
				label: __("Target Project"),
				default: frm.doc.project,
				depends_on: "eval:doc.target_scope == 'Project'"
			}
		],
		primary_action_label: __("Elevate & Open"),
		primary_action: (values) => {
			d.hide();
			frappe.call({
				method: "omniquery.omniquery.doctype.omniquery_question.omniquery_question.elevate_question",
				args: {
					question_name: frm.doc.name,
					target_scope: values.target_scope,
					target_workspace: values.target_workspace,
					target_project: values.target_project
				},
				freeze: true,
				freeze_message: __("Elevating question to new scope..."),
				callback: (r) => {
					if (r.message && r.message.name) {
						frappe.show_alert({
							message: __("Question elevated to {0}: {1}", [r.message.scope, r.message.name]),
							indicator: "green"
						});
						frappe.set_route("Form", "OmniQuery Question", r.message.name);
					}
				}
			});
		}
	});
	d.show();
}
