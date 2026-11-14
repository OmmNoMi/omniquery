import frappe
from frappe import _
from frappe.query_builder import Case, Order
from frappe.query_builder import functions as fn
from frappe.utils import add_days, nowdate

from omniquery.permissions import READ_PROJECT_ROLES, permitted_projects

RESPONSE = "OmniQuery Response"
VELOCITY_DAYS = 14
LEADERBOARD_SIZE = 10


@frappe.whitelist()
def get_project_analytics(project_id=None):
	"""Status mix, 14-day velocity and surveyor leaderboard, over only the projects the user may read (#47)."""
	frappe.has_permission(RESPONSE, "read", throw=True)
	project = None if project_id in (None, "", "ALL") else project_id
	projects = permitted_projects(project, READ_PROJECT_ROLES, _("Not permitted to view analytics for this project"))
	base = _base_query(projects)
	status = _status_distribution(base)
	return {**_totals(status), "status_distribution": status, "daily_velocity": _velocity(base), "leaderboard": _leaderboard(base)}


def _response():
	return frappe.qb.DocType(RESPONSE)


def _count():
	return fn.Count(_response().name).as_("count")


def _status_sum(status: str, alias: str):
	return fn.Sum(Case().when(_response().survey_status == status, 1).else_(0)).as_(alias)


def _status_distribution(base) -> dict:
	status = _response().survey_status
	return {r.survey_status: r.count for r in base.select(status, _count()).groupby(status).run(as_dict=True)}


def _base_query(projects: list[str] | None):
	response = _response()
	query = frappe.qb.from_(response).where(response.survey_status != "Draft")
	return query if projects is None else query.where(response.project.isin(projects))


def _totals(status: dict) -> dict:
	total, approved, flagged = sum(status.values()), status.get("Approved", 0), status.get("Audit Flagged", 0)
	return {
		"total_responses": total, "approved_count": approved, "flagged_count": flagged,
		"approval_rate": round(approved / total * 100, 1) if total else 0,
	}


def _velocity(base) -> list[dict]:
	day = fn.Date(_response().creation)
	since = add_days(nowdate(), -VELOCITY_DAYS) + " 00:00:00"
	rows = base.select(day.as_("date"), _count()).where(_response().creation >= since).groupby(day).orderby(day).run(as_dict=True)
	return [{"date": str(r.date), "count": r.count} for r in rows]


def _leaderboard(base) -> list[dict]:
	response = _response()
	rows = (
		base.select(response.surveyor, fn.Count(response.name).as_("total"), _status_sum("Approved", "approved"), _status_sum("Audit Flagged", "flagged"))
		.groupby(response.surveyor).orderby("total", order=Order.desc).limit(LEADERBOARD_SIZE).run(as_dict=True)
	)
	return [_leaderboard_row(r) for r in rows]


def _leaderboard_row(row) -> dict:
	total, approved = int(row.total or 0), int(row.approved or 0)
	return {
		"surveyor": row.surveyor or "Unassigned", "total_responses": total, "approved": approved,
		"flagged": int(row.flagged or 0), "quality_score": round(approved / total * 100, 1) if total else 0,
	}
