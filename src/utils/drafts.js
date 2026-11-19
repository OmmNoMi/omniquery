import { ALL_PROJECTS, templatesOfProject } from "./projectTemplates";

// The draft the dashboard offers to resume: the most recently saved one among the selected
// project's surveys. The catalog uses the same pick, so it does not offer that Resume a second
// time (#18).
export function latestDraft(activeDrafts, templates, projectId) {
  let drafts = Object.values(activeDrafts || {});
  if (projectId && projectId !== ALL_PROJECTS) {
    const names = new Set(templatesOfProject(templates, projectId).map((t) => t.name || t.template_name));
    drafts = drafts.filter((d) => names.has(d.template_name));
  }
  return drafts.reduce(
    (latest, d) => (!latest || new Date(d.updated_at || 0) > new Date(latest.updated_at || 0) ? d : latest),
    null
  );
}
