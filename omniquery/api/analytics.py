import frappe
from frappe import _
from frappe.query_builder import Case, Order, functions as fn
from frappe.utils import add_days, nowdate


@frappe.whitelist()
def get_project_analytics(project_id=None):
	"""
	Returns executive telemetry analytics for study directors:
	1. Status distribution (Submitted, Approved, Audit Flagged).
	2. 14-day daily velocity curve.
	3. Surveyor leaderboard with total responses, approval score, and outlier flags.
	Zero raw SQL: Uses parameterized frappe.qb (Frappe Query Builder).
	"""
	Response = frappe.qb.DocType("OmniQuery Response")

	# Base query filtering
	base_query = frappe.qb.from_(Response).where(Response.survey_status != "Draft")
	if project_id and project_id != "ALL":
		Template = frappe.qb.DocType("OmniQuery Template")
		tmpl_subquery = (
			frappe.qb.from_(Template)
			.select(Template.name)
			.where((Template.project == project_id) | (Template.name == project_id))
		)
		base_query = base_query.where(Response.survey_template.isin(tmpl_subquery))

	# 1. Status Distribution
	status_query = (
		base_query
		.select(Response.survey_status, fn.Count(Response.name).as_("count"))
		.groupby(Response.survey_status)
	)
	status_rows = status_query.run(as_dict=True) or []
	status_distribution = {r.survey_status: r.count for r in status_rows}

	total_responses = sum(status_distribution.values())
	approved_count = status_distribution.get("Approved", 0)
	flagged_count = status_distribution.get("Audit Flagged", 0)
	approval_rate = round((approved_count / total_responses) * 100, 1) if total_responses > 0 else 0

	# 2. 14-Day Velocity Trend
	start_date = add_days(nowdate(), -14) + " 00:00:00"
	velocity_query = (
		base_query
		.select(
			fn.Date(Response.creation).as_("date"),
			fn.Count(Response.name).as_("count")
		)
		.where(Response.creation >= start_date)
		.groupby(fn.Date(Response.creation))
		.orderby(fn.Date(Response.creation))
	)
	velocity_rows = velocity_query.run(as_dict=True) or []
	daily_velocity = [{"date": str(r.date), "count": r.count} for r in velocity_rows]

	# 3. Surveyor Leaderboard (fully scoped to base_query / project)
	surveyor_totals = (
		base_query
		.select(
			Response.surveyor,
			fn.Count(Response.name).as_("total"),
			fn.Sum(Case().when(Response.survey_status == "Approved", 1).else_(0)).as_("approved"),
			fn.Sum(Case().when(Response.survey_status == "Audit Flagged", 1).else_(0)).as_("flagged"),
		)
		.groupby(Response.surveyor)
		.orderby("total", order=Order.desc)
		.limit(10)
		.run(as_dict=True) or []
	)

	leaderboard = []
	for s in surveyor_totals:
		surv_name = s.surveyor or "Unassigned"
		total = int(s.total or 0)
		appr = int(s.approved or 0)
		flagged = int(s.flagged or 0)
		score = round((appr / total) * 100, 1) if total > 0 else 0
		leaderboard.append({
			"surveyor": surv_name,
			"total_responses": total,
			"approved": appr,
			"flagged": flagged,
			"quality_score": score,
		})

	return {
		"total_responses": total_responses,
		"approved_count": approved_count,
		"flagged_count": flagged_count,
		"approval_rate": approval_rate,
		"status_distribution": status_distribution,
		"daily_velocity": daily_velocity,
		"leaderboard": leaderboard,
	}
