import { describe, it, expect } from "vitest";
import { ALL_PROJECTS, inProject, templatesOfProject } from "../projectTemplates";

const TEMPLATES = [
  { name: "T1", project: "OQP-001", project_name: "Baseline 2026" },
  { name: "T2", project: "OQP-002", project_name: "Baseline 2026" },
  { name: "T3", project: "OQP-003", project_name: "Endline" },
  { name: "T4" },
];
const names = (list) => list.map((t) => t.name);

describe("templatesOfProject (#15)", () => {
  it("returns only the project's own templates", () => {
    expect(names(templatesOfProject(TEMPLATES, "OQP-001"))).toEqual(["T1"]);
  });

  it("returns none for a project with no templates, never every template", () => {
    expect(templatesOfProject(TEMPLATES, "OQP-404")).toEqual([]);
  });

  it("matches a project's title, as older links pass it", () => {
    expect(names(templatesOfProject(TEMPLATES, "Endline"))).toEqual(["T3"]);
  });

  it("matches any of several ids, and ignores an empty one", () => {
    expect(names(templatesOfProject(TEMPLATES, "OQP-001", "OQP-003"))).toEqual(["T1", "T3"]);
    expect(names(templatesOfProject(TEMPLATES, "", undefined))).toEqual([]);
  });

  it("selects every template for ALL_PROJECTS", () => {
    expect(names(templatesOfProject(TEMPLATES, ALL_PROJECTS))).toEqual(["T1", "T2", "T3", "T4"]);
  });

  it("does not put a template with no project into an unnamed one", () => {
    expect(inProject(TEMPLATES[3], "")).toBe(false);
    expect(inProject(TEMPLATES[3], undefined)).toBe(false);
  });
});
