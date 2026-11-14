import { describe, it, expect } from "vitest";
import { bootRoute, catalogRoute, projectRoute, routeFromPath, routeFromState, routeUrl, surveyRoute } from "../route";

describe("PWA routes (#38)", () => {
  it("reads each kind of path the portal page serves", () => {
    expect(routeFromPath("/omniquery")).toEqual(catalogRoute());
    expect(routeFromPath("/omniquery/")).toEqual(catalogRoute());
    expect(routeFromPath("/omniquery/project/P-1")).toEqual(projectRoute("P-1"));
    expect(routeFromPath("/omniquery/project/")).toEqual(catalogRoute());
    expect(routeFromPath("/omniquery/OQS-WATER")).toEqual(surveyRoute("OQS-WATER"));
    expect(routeFromPath("/somewhere-else")).toEqual(catalogRoute());
  });

  it("round-trips any ID through its URL, as omniquery.py reads it", () => {
    for (const id of ["Water & Sanitation / 2026", "गाँव सर्वे", "100%", "a/b"]) {
      expect(routeFromPath(routeUrl(surveyRoute(id)))).toEqual(surveyRoute(id));
      expect(routeFromPath(routeUrl(projectRoute(id)))).toEqual(projectRoute(id));
    }
    expect(routeFromPath("/omniquery/project/a/b"), "everything after project/ is the ID").toEqual(projectRoute("a/b"));
    expect(routeFromPath("/omniquery/100%"), "a stray % is used as written").toEqual(surveyRoute("100%"));
  });

  it("boots from the IDs the server resolved before the path, which may be a slug", () => {
    const boot = { initial_project_id: "", initial_survey_id: "OQS-WATER" };
    expect(bootRoute(boot, "/omniquery/water-access")).toEqual(surveyRoute("OQS-WATER"));
    expect(bootRoute({ initial_project_id: "P-1" }, "/omniquery/project/p-1-slug")).toEqual(projectRoute("P-1"));
    // the service worker's offline shell was rendered for /omniquery and boots no IDs
    expect(bootRoute({}, "/omniquery/project/P-1")).toEqual(projectRoute("P-1"));
  });

  it("takes only a route this app wrote as an entry's state", () => {
    expect(routeFromState(surveyRoute("OQS-WATER"))).toEqual(surveyRoute("OQS-WATER"));
    expect(routeFromState(catalogRoute())).toEqual(catalogRoute());
    for (const state of [null, undefined, {}, { type: "elsewhere" }, "survey"]) expect(routeFromState(state)).toBeNull();
  });
});
