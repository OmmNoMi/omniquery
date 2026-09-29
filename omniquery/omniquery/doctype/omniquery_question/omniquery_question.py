import frappe
from frappe.model.document import Document


def _extract_workspace_sequence(workspace_name: str | None) -> str:
	if not workspace_name:
		return "001"
	clean = workspace_name.replace("OQW-", "").replace("WSP-", "").strip()
	digits = "".join(char for char in clean if char.isdigit())
	return digits if digits else "001"


def _extract_project_sequence(project_name: str | None, workspace_name: str | None = None) -> tuple[str, str]:
	workspace_seq = _extract_workspace_sequence(workspace_name)
	if not project_name:
		return workspace_seq, "001"
	clean = project_name.replace("OQP-", "").replace("PRO-", "").strip()
	parts = clean.split("-")
	if len(parts) >= 2 and parts[0].isdigit() and parts[1].isdigit():
		return parts[0], parts[1]
	digits = "".join(char for char in clean if char.isdigit())
	return workspace_seq, (digits if digits else "001")


def _extract_survey_sequence(
	template_name: str | None, project_name: str | None = None, workspace_name: str | None = None
) -> tuple[str, str, str]:
	workspace_seq, project_seq = _extract_project_sequence(project_name, workspace_name)
	if not template_name:
		return workspace_seq, project_seq, "001"
	clean = template_name.replace("OQS-", "").replace("SVY-", "").strip()
	parts = clean.split("-")
	if len(parts) >= 3 and parts[0].isdigit() and parts[1].isdigit() and parts[2].isdigit():
		return parts[0], parts[1], parts[2]
	digits = "".join(char for char in clean if char.isdigit())
	return workspace_seq, project_seq, (digits if digits else "001")


def get_question_series(question_doc) -> str:
	if question_doc.scope == "Workspace":
		workspace_seq = _extract_workspace_sequence(question_doc.workspace)
		return f"OQQ-{workspace_seq}-.####"
	if question_doc.scope == "Project":
		workspace_seq, project_seq = _extract_project_sequence(question_doc.project, question_doc.workspace)
		return f"OQQ-{workspace_seq}-{project_seq}-.####"
	if question_doc.scope == "Survey":
		ws_seq, prj_seq, srv_seq = _extract_survey_sequence(
			question_doc.survey_template, question_doc.project, question_doc.workspace
		)
		return f"OQQ-{ws_seq}-{prj_seq}-{srv_seq}-.####"
	return "OQQ-.#####"


class OmniQueryQuestion(Document):
	def autoname(self):
		if self.amended_from or (self.name and not self.name.startswith("format:")):
			return
		self._cascade_scope_parents()
		self.name = frappe.model.naming.make_autoname(get_question_series(self))
		if not self.question_code:
			self.question_code = self.name
		else:
			self.question_code = self.question_code.strip()

	def _cascade_scope_parents(self):
		if self.scope == "Survey" and self.survey_template and not self.project:
			self.project = frappe.db.get_value("OmniQuery Template", self.survey_template, "project")
		if self.scope in ("Project", "Survey") and self.project and not self.workspace:
			self.workspace = frappe.db.get_value("OmniQuery Project", self.project, "workspace")

	def before_insert(self):
		self._sync_version_number()

	def before_save(self):
		self._sync_version_number()
		self._validate_scope_relations()
		self._validate_immutability()

	def on_submit(self):
		self.status = "Active"

	def on_cancel(self):
		self.status = "Inactive"

	def validate_amended_from(self):
		if not self.amended_from:
			return
		if not frappe.db.exists(self.doctype, self.amended_from):
			frappe.throw(frappe._("Amended question {0} does not exist").format(self.amended_from))

	def _sync_version_number(self):
		if not self.amended_from:
			self.question_version = 1
			return
		previous_version = frappe.db.get_value(self.doctype, self.amended_from, "question_version")
		self.question_version = (int(previous_version) + 1) if previous_version else 2

	def _validate_immutability(self):
		if self.docstatus == 1 and not self.flags.in_submit:
			frappe.throw(frappe._("Cannot modify active submitted question. Create a new version via Amend."))

	def _validate_scope_relations(self):
		if self.scope == "Workspace" and not self.workspace:
			frappe.throw(frappe._("Workspace is required when Scope is Workspace"))
		if self.scope == "Project" and not self.project:
			frappe.throw(frappe._("Project is required when Scope is Project"))
		if self.scope == "Survey" and not self.survey_template:
			frappe.throw(frappe._("Survey Template is required when Scope is Survey"))


@frappe.whitelist()
def elevate_question(
	question_name: str, target_scope: str, target_workspace: str = None, target_project: str = None
):
	if not frappe.has_permission("OmniQuery Question", "create"):
		frappe.throw(frappe._("Not permitted to create Questions"), frappe.PermissionError)
	source_document = frappe.get_doc("OmniQuery Question", question_name)
	elevated_document = frappe.copy_doc(source_document)
	_prepare_elevated_document(elevated_document, target_scope, target_workspace, target_project)
	elevated_document.insert()
	return {"name": elevated_document.name, "scope": elevated_document.scope}


def _prepare_elevated_document(
	question_doc, target_scope: str, target_workspace: str | None, target_project: str | None
):
	question_doc.amended_from = None
	question_doc.question_version = 1
	question_doc.status = "Draft"
	question_doc.docstatus = 0
	question_doc.scope = target_scope
	question_doc.workspace = target_workspace if target_scope in ("Workspace", "Project") else None
	question_doc.project = target_project if target_scope == "Project" else None
	question_doc.survey_template = None
	if question_doc.question_code and question_doc.question_code.startswith("OQQ-"):
		question_doc.question_code = None
