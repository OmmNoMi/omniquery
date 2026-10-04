frappe.pages["omniquery-analytics"].on_page_load = function (wrapper) {
	const page = frappe.ui.make_app_page({
		parent: wrapper,
		title: __("OmniQuery Analytics & Telemetry"),
		single_column: true,
	});

	wrapper.page_obj = page;

	page.set_primary_action(
		__("Refresh Analytics"),
		() => {
			load_analytics_data(wrapper);
		},
		"refresh"
	);

	page.add_secondary_action(__("View Supervisor Audits"), () => {
		frappe.set_route("List", "OmniQuery Supervisor Audit");
	});

	page.add_inner_button(__("All Responses"), () => {
		frappe.set_route("List", "OmniQuery Response");
	});

	const $body = $(wrapper).find(".page-content");
	$body.empty();

	$(`
		<div class="omniquery-analytics-container layout-main-section" style="max-width: 1200px; margin: 0 auto; padding: 20px;">
			<style>
				.oq-metric-grid {
					display: grid;
					grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
					gap: 16px;
					margin-bottom: 24px;
				}
				.oq-card {
					background: var(--card-bg, #ffffff);
					border: 1px solid var(--border-color, #e2e8f0);
					border-radius: 8px;
					padding: 20px;
					box-shadow: 0 1px 3px rgba(0,0,0,0.05);
				}
				.oq-card-title {
					font-size: 13px;
					font-weight: 600;
					text-transform: uppercase;
					letter-spacing: 0.05em;
					color: var(--text-muted, #64748b);
					margin-bottom: 8px;
				}
				.oq-metric-value {
					font-size: 28px;
					font-weight: 700;
					color: var(--text-color, #0f172a);
				}
				.oq-metric-sub {
					font-size: 12px;
					margin-top: 4px;
					color: var(--text-muted, #64748b);
				}
				.oq-chart-grid {
					display: grid;
					grid-template-columns: 2fr 1fr;
					gap: 16px;
					margin-bottom: 24px;
				}
				@media (max-width: 900px) {
					.oq-chart-grid {
						grid-template-columns: 1fr;
					}
				}
				.oq-table {
					width: 100%;
					border-collapse: collapse;
					margin-top: 12px;
				}
				.oq-table th {
					text-align: left;
					padding: 10px 12px;
					font-size: 12px;
					font-weight: 600;
					border-bottom: 2px solid var(--border-color, #e2e8f0);
					color: var(--text-muted, #64748b);
				}
				.oq-table td {
					padding: 12px;
					font-size: 13px;
					border-bottom: 1px solid var(--border-color, #f1f5f9);
				}
				.oq-badge {
					display: inline-block;
					padding: 2px 8px;
					border-radius: 9999px;
					font-size: 11px;
					font-weight: 600;
				}
				.oq-badge-success { background: #dcfce7; color: #166534; }
				.oq-badge-warning { background: #fef3c7; color: #92400e; }
				.oq-badge-danger { background: #fee2e2; color: #991b1b; }
			</style>

			<!-- Metrics Section -->
			<div class="oq-metric-grid">
				<div class="oq-card" tabindex="0">
					<div class="oq-card-title">${__("Total Submissions")}</div>
					<div class="oq-metric-value" id="val-total-responses">-</div>
					<div class="oq-metric-sub">${__("Across active surveys")}</div>
				</div>
				<div class="oq-card" tabindex="0">
					<div class="oq-card-title">${__("Approved Responses")}</div>
					<div class="oq-metric-value" id="val-approved" style="color: #16a34a;">-</div>
					<div class="oq-metric-sub" id="val-approval-rate">-</div>
				</div>
				<div class="oq-card" tabindex="0">
					<div class="oq-card-title">${__("Audit Flagged (Outliers)")}</div>
					<div class="oq-metric-value" id="val-flagged" style="color: #dc2626;">-</div>
					<div class="oq-metric-sub">${__("Requires supervisor check")}</div>
				</div>
				<div class="oq-card" tabindex="0">
					<div class="oq-card-title">${__("Field Quality Index")}</div>
					<div class="oq-metric-value" id="val-quality-index" style="color: #2563eb;">-</div>
					<div class="oq-metric-sub">${__("Speedrun & GPS compliance")}</div>
				</div>
			</div>

			<!-- Visual Charts Section -->
			<div class="oq-chart-grid">
				<div class="oq-card">
					<div class="oq-card-title">${__("14-Day Submission Velocity")}</div>
					<div id="oq-velocity-chart" style="min-height: 250px;"></div>
				</div>
				<div class="oq-card">
					<div class="oq-card-title">${__("Quality & Review Ratio")}</div>
					<div id="oq-status-donut" style="min-height: 250px;"></div>
				</div>
			</div>

			<!-- Surveyor Leaderboard Section -->
			<div class="oq-card">
				<div class="d-flex justify-content-between align-items-center mb-2">
					<div class="oq-card-title" style="margin-bottom:0;">${__("Field Surveyor Performance Leaderboard")}</div>
					<span class="text-muted small">${__("Ranked by total submissions & audit pass rate")}</span>
				</div>
				<div class="table-responsive">
					<table class="oq-table">
						<thead>
							<tr>
								<th>${__("Surveyor")}</th>
								<th style="text-align: right;">${__("Total Submissions")}</th>
								<th style="text-align: right;">${__("Approved")}</th>
								<th style="text-align: right;">${__("Flagged")}</th>
								<th style="text-align: right;">${__("Quality Score")}</th>
								<th style="text-align: center;">${__("Action")}</th>
							</tr>
						</thead>
						<tbody id="oq-leaderboard-rows">
							<tr><td colspan="6" class="text-center text-muted p-4">${__("Loading analytics data...")}</td></tr>
						</tbody>
					</table>
				</div>
			</div>
		</div>
	`).appendTo($body);

	load_analytics_data(wrapper);
};

function load_analytics_data(wrapper) {
	frappe.call({
		method: "omniquery.api.analytics.get_project_analytics",
		callback: function (r) {
			if (!r.message) return;
			const data = r.message;

			// Metrics
			$("#val-total-responses").text(data.total_responses || 0);
			$("#val-approved").text(data.approved_count || 0);
			$("#val-approval-rate").text((data.approval_rate || 0) + "% " + __("Approval Rate"));
			$("#val-flagged").text(data.flagged_count || 0);

			const qualityIndex = data.total_responses > 0
				? Math.max(0, Math.round(100 - ((data.flagged_count / data.total_responses) * 100)))
				: 100;
			$("#val-quality-index").text(qualityIndex + "%");

			// 14-day velocity chart
			const velocityLabels = (data.daily_velocity || []).map((d) => d.date.slice(5));
			const velocityValues = (data.daily_velocity || []).map((d) => d.count);

			if (window.frappe && frappe.Chart) {
				new frappe.Chart("#oq-velocity-chart", {
					title: "",
					data: {
						labels: velocityLabels.length > 0 ? velocityLabels : [__("No Activity")],
						datasets: [
							{
								name: __("Submissions"),
								values: velocityValues.length > 0 ? velocityValues : [0],
								chartType: "bar",
							},
						],
					},
					type: "bar",
					height: 240,
					colors: ["#2563eb"],
					axisOptions: {
						xIsSeries: true,
					},
				});

				// Status Donut Chart
				const statusLabels = Object.keys(data.status_distribution || {});
				const statusValues = Object.values(data.status_distribution || {});

				new frappe.Chart("#oq-status-donut", {
					title: "",
					data: {
						labels: statusLabels.length > 0 ? statusLabels : [__("No Data")],
						datasets: [
							{
								values: statusValues.length > 0 ? statusValues : [1],
							},
						],
					},
					type: "donut",
					height: 240,
					colors: ["#16a34a", "#dc2626", "#eab308", "#64748b"],
				});
			}

			// Leaderboard rows
			const $tbody = $("#oq-leaderboard-rows");
			$tbody.empty();

			if (!data.leaderboard || data.leaderboard.length === 0) {
				$tbody.append(`<tr><td colspan="6" class="text-center text-muted p-4">${__("No surveyor submissions recorded yet")}</td></tr>`);
				return;
			}

			data.leaderboard.forEach((row) => {
				const badgeClass = row.quality_score >= 80 ? "oq-badge-success" : (row.quality_score >= 50 ? "oq-badge-warning" : "oq-badge-danger");
				const $tr = $(`
					<tr>
						<td style="font-weight: 500;">${frappe.utils.escape_html(row.surveyor)}</td>
						<td style="text-align: right; font-weight: 600;">${row.total_responses}</td>
						<td style="text-align: right; color: #16a34a;">${row.approved}</td>
						<td style="text-align: right; color: #dc2626;">${row.flagged}</td>
						<td style="text-align: right;">
							<span class="oq-badge ${badgeClass}">${row.quality_score}%</span>
						</td>
						<td style="text-align: center;">
							<button class="btn btn-xs btn-default btn-view-surveyor-responses" data-surveyor="${frappe.utils.escape_html(row.surveyor)}">
								${__("Inspect")}
							</button>
						</td>
					</tr>
				`);
				$tbody.append($tr);
			});

			$(".btn-view-surveyor-responses").on("click", function () {
				const surveyor = $(this).attr("data-surveyor");
				frappe.set_route("List", "OmniQuery Response", { surveyor: surveyor });
			});
		},
	});
}
