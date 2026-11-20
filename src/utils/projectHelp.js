// A project's helpline and SOPs as survey.project_help sends them: on get_project_details' project
// and on every template the bootstrap lists, so the help still shows offline (#14). The server
// sanitizes the SOP HTML; this only fills a missing field with "".
export const PROJECT_HELP_FIELDS = ["support_email", "helpline_phone", "sop_sections"];

export function projectHelp(source = {}) {
  return Object.fromEntries(PROJECT_HELP_FIELDS.map((field) => [field, (source && source[field]) || ""]));
}
