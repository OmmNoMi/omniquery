// What the OmniQuery specs share: a project with one submitted survey, made and removed as the test
// user through Frappe's own Playwright Api, and the steps that open it in /omniquery.
import { Api } from "../../../frappe/playwright/support/api.js";
import { expect } from "../../../frappe/playwright/support/index.js";

// Runs fn with an Api signed in as the test user, for beforeAll/afterAll, which have no page
export async function withApi({ playwright, baseURL, storageState }, fn) {
  const request = await playwright.request.newContext({ baseURL, storageState });
  try {
    return await fn(new Api(request));
  } finally {
    await request.dispose();
  }
}

// project: the OmniQuery Project's fields; template: the OmniQuery Template's, with its sections
// and questions. The template is submitted, so the project page lists it.
export async function createSurvey(api, project, template) {
  await removeSurvey(api, project.project_name, template.title);
  const projectDoc = await api.insert_doc("OmniQuery Project", { status: "Active", ...project });
  const templateDoc = await api.insert_doc("OmniQuery Template", { version: 1, ...template, project: projectDoc.name });
  await api.call("frappe.client.submit", { doc: templateDoc });
  return projectDoc;
}

export async function removeSurvey(api, projectName, templateTitle) {
  const { data: templates } = await api.get_list("OmniQuery Template", ["name", "docstatus"], [["title", "=", templateTitle]]);
  for (const t of templates) {
    if (t.docstatus === 1) await api.call("frappe.client.cancel", { doctype: "OmniQuery Template", name: t.name });
    await api.remove_doc("OmniQuery Template", t.name);
  }
  const { data: projects } = await api.get_list("OmniQuery Project", ["name"], [["project_name", "=", projectName]]);
  for (const p of projects) await api.remove_doc("OmniQuery Project", p.name);
}

// Opens the project's page from the dashboard, in English
export async function openProject(page, projectName) {
  await page.addInitScript(() => localStorage.setItem("omniquery_lang", "en"));
  await page.goto("/omniquery");
  const card = page.locator("div").filter({ hasText: projectName }).filter({ has: page.getByRole("button", { name: /Project details/ }) }).last();
  await card.getByRole("button", { name: /Project details/ }).click();
  await expect(page.getByRole("heading", { name: projectName })).toBeVisible();
}

// Opens the project's only survey at its first section
export async function startSurvey(page, projectName) {
  await openProject(page, projectName);
  await page.getByRole("button", { name: "Start Survey" }).click();
  await expect(page.locator("#section_heading")).toBeVisible();
}
