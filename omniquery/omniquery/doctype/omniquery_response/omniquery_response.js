frappe.ui.form.on("OmniQuery Response", {
	refresh(frm) {
		render_audio_player(frm);
	},
	audio_recording(frm) {
		render_audio_player(frm);
	},
});

function render_audio_player(frm) {
	if (!frm.doc.audio_recording) {
		frm.get_field("audio_recording").set_description("");
		return;
	}

	const audioUrl = frm.doc.audio_recording;
	const audioHtml = `
		<div class="mt-2 p-2 border rounded" style="background-color: var(--fg-color, #f8fafc); border-color: var(--border-color, #e2e8f0);">
			<div class="text-muted small mb-1" style="font-weight: 500;">
				<i class="fa fa-headphones mr-1 text-primary"></i> Audio Playback Preview
			</div>
			<audio controls preload="metadata" style="width: 100%; height: 36px; border-radius: 4px;">
				<source src="${audioUrl}">
				Your browser does not support the audio element.
			</audio>
		</div>
	`;
	frm.get_field("audio_recording").set_description(audioHtml);
}
