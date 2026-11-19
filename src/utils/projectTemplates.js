// Which templates belong to a project: the one rule the catalog, the project cards, the project
// page, the dashboard and the offline download share, so their counts and lists agree (#15).
// A template names its project by `project` (the OmniQuery Project's name). Older links pass the
// project's title instead, so `project_name` matches too. ALL_PROJECTS selects every template.
export const ALL_PROJECTS = "ALL";

export function inProject(template, ...projectIds) {
  return projectIds.some(
    (id) => Boolean(id) && (id === ALL_PROJECTS || template.project === id || template.project_name === id)
  );
}

// A project with no templates of its own gets none, never another project's (#15)
export function templatesOfProject(templates, ...projectIds) {
  return templates.filter((template) => inProject(template, ...projectIds));
}
