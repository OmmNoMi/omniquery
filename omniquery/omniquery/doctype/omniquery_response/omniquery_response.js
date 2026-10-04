frappe.ui.form.on("OmniQuery Response", {
	refresh(frm) {
		render_audio_player(frm);
		render_gps_preview(frm);
		setup_supervisor_workflow(frm);
	},
	audio_recording(frm) {
		render_audio_player(frm);
	},
	gps_latitude(frm) {
		render_gps_preview(frm);
	},
	gps_longitude(frm) {
		render_gps_preview(frm);
	},
});

function render_audio_player(frm) {
	if (!frm.doc.audio_recording) {
		frm.get_field("audio_recording").set_description("");
		return;
	}

	const audioUrl = frm.doc.audio_recording;
	const playerId = `audio_el_${frm.doc.name.replace(/[^a-zA-Z0-9]/g, '_')}`;
	const audioHtml = `
		<div class="mt-2 p-3 border rounded shadow-xs" style="background-color: var(--fg-color, #f8fafc); border-color: var(--border-color, #e2e8f0); border-radius: 8px;">
			<div class="d-flex align-items-center justify-content-between mb-2">
				<div class="text-muted small" style="font-weight: 600;">
					<i class="fa fa-headphones mr-1 text-primary"></i> Interview Audio Recording
				</div>
				<div class="btn-group btn-group-sm" role="group" aria-label="Playback Speed">
					<button type="button" class="btn btn-default btn-xs speed-btn" data-speed="0.8">0.8x</button>
					<button type="button" class="btn btn-primary btn-xs speed-btn font-weight-bold" data-speed="1.0">1.0x</button>
					<button type="button" class="btn btn-default btn-xs speed-btn" data-speed="1.5">1.5x</button>
					<button type="button" class="btn btn-default btn-xs speed-btn" data-speed="2.0">2.0x</button>
				</div>
			</div>
			<audio id="${playerId}" controls preload="metadata" style="width: 100%; height: 40px; border-radius: 6px;">
				<source src="${audioUrl}">
				Your browser does not support the audio element.
			</audio>
		</div>
	`;
	frm.get_field("audio_recording").set_description(audioHtml);

	// Bind speed controls
	setTimeout(() => {
		const $wrapper = frm.get_field("audio_recording").$wrapper;
		if (!$wrapper) return;
		const audioEl = $wrapper.find(`#${playerId}`)[0];
		if (!audioEl) return;

		$wrapper.find(".speed-btn").on("click", function() {
			const speed = parseFloat($(this).data("speed"));
			if (audioEl) audioEl.playbackRate = speed;
			$wrapper.find(".speed-btn").removeClass("btn-primary font-weight-bold").addClass("btn-default");
			$(this).removeClass("btn-default").addClass("btn-primary font-weight-bold");
		});
	}, 100);
}

function render_gps_preview(frm) {
	const lat = frm.doc.gps_latitude;
	const lng = frm.doc.gps_longitude;
	const acc = frm.doc.gps_accuracy ? `±${frm.doc.gps_accuracy}m` : '';

	if (!lat || !lng) {
		if (frm.get_field("column_break_geo")) {
			frm.get_field("column_break_geo").set_description("");
		}
		return;
	}

	const osmEmbedUrl = `https://www.openstreetmap.org/export/embed.html?bbox=${lng - 0.005}%2C${lat - 0.005}%2C${lng + 0.005}%2C${lat + 0.005}&layer=mapnik&marker=${lat}%2C${lng}`;
	const mapHtml = `
		<div class="mt-2 p-2 border rounded" style="background-color: var(--fg-color, #f8fafc); border-color: var(--border-color, #e2e8f0); border-radius: 8px;">
			<div class="d-flex align-items-center justify-content-between mb-1">
				<span class="text-muted small" style="font-weight: 600;">
					<i class="fa fa-map-marker text-danger mr-1"></i> Field Location (${lat.toFixed(5)}, ${lng.toFixed(5)})
				</span>
				<span class="badge badge-secondary small">${acc}</span>
			</div>
			<div style="height: 140px; width: 100%; border-radius: 6px; overflow: hidden; border: 1px solid var(--border-color, #e2e8f0);">
				<iframe width="100%" height="140" frameborder="0" scrolling="no" marginheight="0" marginwidth="0" src="${osmEmbedUrl}"></iframe>
			</div>
		</div>
	`;
	if (frm.get_field("column_break_geo")) {
		frm.get_field("column_break_geo").set_description(mapHtml);
	}
}

function setup_supervisor_workflow(frm) {
	if (frm.is_new()) return;

	const status = frm.doc.survey_status;
	if (["Submitted", "Draft"].includes(status)) {
		frm.add_custom_button(__("Approve Response"), () => {
			frappe.confirm(__("Approve this survey response as verified?"), () => {
				frm.set_value("survey_status", "Approved");
				frm.save();
			});
		}, __("Supervisor Audit")).addClass("btn-primary");

		frm.add_custom_button(__("Flag for Audit"), () => {
			frappe.prompt(
				[{ fieldname: "reason", fieldtype: "Small Text", label: __("Audit Flag Reason"), reqd: 1 }],
				(vals) => {
					frm.set_value("survey_status", "Audit Flagged");
					frm.save().then(() => {
						frappe.msgprint(__("Survey marked as Audit Flagged"));
					});
				},
				__("Audit Review")
			);
		}, __("Supervisor Audit"));
	} else if (status === "Audit Flagged") {
		frm.add_custom_button(__("Clear & Approve"), () => {
			frm.set_value("survey_status", "Approved");
			frm.save();
		}, __("Supervisor Audit")).addClass("btn-primary");
	}
}
