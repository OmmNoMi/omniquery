// The PWA's routes: the catalog, a project page, and a survey (#38). src/main.js has no vue-router
// yet (ROADMAP), so every history entry carries the route it shows in history.state, and Back and
// Forward read it back from there rather than from a global that only describes the first page.
const BASE = "/omniquery";
const TYPES = ["catalog", "project", "survey"];

export const catalogRoute = () => ({ type: "catalog" });
export const projectRoute = (projectId) => ({ type: "project", projectId });
export const surveyRoute = (surveyName) => ({ type: "survey", surveyName });

export function routeUrl(route) {
  if (route.type === "project") return `${BASE}/project/${encodeURIComponent(route.projectId)}`;
  if (route.type === "survey") return `${BASE}/${encodeURIComponent(route.surveyName)}`;
  return BASE;
}

function decodeSegment(segment) {
  try {
    return decodeURIComponent(segment);
  } catch {
    return segment; // a stray % in a typed link: use it as written
  }
}

// The route a path shows, for an entry that carries none: a link opened from outside the app
export function routeFromPath(pathname = "") {
  const [base, first, ...rest] = pathname.split("/").filter(Boolean).map(decodeSegment);
  if (base !== "omniquery" || !first) return catalogRoute();
  if (first !== "project") return surveyRoute(first);
  // as omniquery/www/omniquery.py reads it: everything after project/ is the ID
  return rest.length ? projectRoute(rest.join("/")) : catalogRoute();
}

export function routeFromState(state) {
  return state && TYPES.includes(state.type) ? state : null;
}

// The first page's route. The server resolved a survey's slug or title to its name
// (omniquery/www/omniquery.py), so its IDs come first; the path covers the shell the service worker
// serves offline, which was rendered for /omniquery and boots no IDs.
export function bootRoute(boot = window.frappe || {}, pathname = window.location.pathname) {
  if (boot.initial_project_id) return projectRoute(boot.initial_project_id);
  if (boot.initial_survey_id) return surveyRoute(boot.initial_survey_id);
  return routeFromPath(pathname);
}

// Opening a page adds an entry; landing on one only records its route on the entry it is already on
export const pushRoute = (route) => window.history.pushState(route, "", routeUrl(route));
export const replaceRoute = (route) => window.history.replaceState(route, "", window.location.href);
