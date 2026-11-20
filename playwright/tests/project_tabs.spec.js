// The project page's tabs (#17): frappe-ui Tabs, one tab stop, arrow keys, and a strip that never
// clips a tab or shows a scrollbar, at desktop and phone widths. The header and the strip stay at
// the top while the page scrolls (#141).
import { test, expect } from "../../../frappe/playwright/support/index.js";

const PROJECT_NAME = "UI Test Tabs Project";
const TEMPLATE_TITLE = "UI Test Tabs Survey";
// long enough that the Guide tab scrolls the page on a phone and on a desktop
const SOP = "<p>Introduce yourself before the first question.</p>" + "<p>Read each question exactly as it is written.</p>".repeat(60);

test.describe.configure({ mode: "serial" });

let project;

test.beforeAll(async ({ playwright, baseURL, storageState }) => {
  const request = await playwright.request.newContext({ baseURL, storageState });
  await removeTestRecords(request);
  project = await insert(request, "OmniQuery Project", {
    project_name: PROJECT_NAME,
    grantor_organization: "UI Test Grantor",
    support_email: "helpdesk@example.org",
    helpline_phone: "+91 1800 000 111",
    sop_sections: SOP,
    status: "Active",
  });
  const template = await insert(request, "OmniQuery Template", {
    title: TEMPLATE_TITLE,
    project: project.name,
    version: 1,
    sections: [{ section_code: "SEC_1", section_title: "Basic section" }],
    questions: [{ section_code: "SEC_1", question_code: "q1", label_en: "Question 1" }],
  });
  await call(request, "frappe.client.submit", { doc: template });
  await request.dispose();
});

test.afterAll(async ({ playwright, baseURL, storageState }) => {
  const request = await playwright.request.newContext({ baseURL, storageState });
  await removeTestRecords(request);
  await request.dispose();
});

async function openProject(page) {
  await page.addInitScript(() => localStorage.setItem("omniquery_lang", "en"));
  await page.goto("/omniquery");
  const card = page.locator("div").filter({ hasText: PROJECT_NAME }).filter({ has: page.getByRole("button", { name: /Project details/ }) }).last();
  await card.getByRole("button", { name: /Project details/ }).click();
  await expect(page.getByRole("heading", { name: PROJECT_NAME })).toBeVisible();
  return page.getByRole("tablist");
}

for (const [width, height] of [[1280, 900], [375, 812]]) {
  test(`tabs at ${width}px: one tab stop, arrow keys, nothing clipped`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const tablist = await openProject(page);
    const surveys = page.getByRole("tab", { name: /Surveys in this Project \(1\)/ });
    const sops = page.getByRole("tab", { name: "Field SOPs & Protocols" });
    await expect(page.getByRole("tab")).toHaveCount(2);

    // the helpline is one action in the header, with no tab of its own
    await expect(page.locator("a[href^='tel:']")).toHaveCount(1);
    await expect(page.locator("a[href^='mailto:']")).toHaveCount(1);

    // Tab from the back button reaches the selected tab, and only it
    await page.getByRole("button", { name: /Back to Dashboard/ }).focus();
    let reached = false;
    for (let i = 0; i < 20 && !reached; i++) {
      await page.keyboard.press("Tab");
      reached = await surveys.evaluate((el) => el === document.activeElement);
      expect(await sops.evaluate((el) => el === document.activeElement)).toBe(false);
    }
    expect(reached).toBe(true);
    await expect(surveys).toHaveAttribute("aria-selected", "true");

    // ArrowRight moves focus and selection, and the panel follows
    await page.keyboard.press("ArrowRight");
    await expect(sops).toBeFocused();
    await expect(sops).toHaveAttribute("aria-selected", "true");
    await expect(surveys).toHaveAttribute("aria-selected", "false");
    await expect(page.getByRole("tabpanel")).toContainText("Introduce yourself before the first question.");

    // the next Tab leaves the tablist for the panel, not the other tab
    await page.keyboard.press("Tab");
    await expect(page.getByRole("tabpanel")).toBeFocused();
    await page.keyboard.press("Shift+Tab");
    await expect(sops).toBeFocused();

    // every tab sits fully inside the strip, which shows no scrollbar
    const strip = await tablist.boundingBox();
    for (const tab of [surveys, sops]) {
      const box = await tab.boundingBox();
      expect(box.x).toBeGreaterThanOrEqual(strip.x);
      expect(box.x + box.width).toBeLessThanOrEqual(strip.x + strip.width + 0.5);
    }
    const { scrollWidth, clientWidth, scrollbar } = await tablist.evaluate((el) => ({
      scrollWidth: el.scrollWidth,
      clientWidth: el.clientWidth,
      scrollbar: el.offsetHeight - el.clientHeight - parseFloat(getComputedStyle(el).borderBottomWidth),
    }));
    expect(scrollWidth).toBeLessThanOrEqual(clientWidth);
    expect(scrollbar).toBe(0);
  });
}

for (const [width, height] of [[1280, 700], [375, 640]]) {
  test(`header and tab strip stay at the top while the page scrolls, at ${width}px (#141)`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    const tablist = await openProject(page);
    await page.getByRole("tab", { name: "Field SOPs & Protocols" }).click();
    await expect(page.getByRole("tabpanel")).toContainText("Read each question exactly as it is written.");
    const header = page.locator("header").first();

    await page.mouse.wheel(0, 1500);
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBeGreaterThan(500);

    // overflow-x: hidden on #app or the shell made them scroll containers, so both scrolled away
    const headerBox = await header.boundingBox();
    const stripBox = await tablist.boundingBox();
    expect(headerBox.y).toBe(0);
    // the strip sits just under the header (its top-[52px]/sm:top-[56px] is a few px off the
    // header's 53px, logged on ROADMAP), not scrolled out of view
    const headerBottom = headerBox.y + headerBox.height;
    expect(stripBox.y).toBeGreaterThanOrEqual(headerBottom - 2);
    expect(stripBox.y).toBeLessThanOrEqual(headerBottom + 4);
    // clip still keeps the page from scrolling sideways
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
  });
}

async function call(request, method, args) {
  const res = await request.post(`/api/method/${method}`, { data: args, headers: { Accept: "application/json" } });
  expect(res.status(), `${method}: ${await res.text()}`).toBe(200);
  return (await res.json()).message;
}

async function insert(request, doctype, doc) {
  const res = await request.post(`/api/resource/${doctype}`, { data: doc, headers: { Accept: "application/json" } });
  expect(res.status(), `insert ${doctype}: ${await res.text()}`).toBe(200);
  return (await res.json()).data;
}

async function names(request, doctype, filters) {
  const res = await request.get(`/api/resource/${doctype}`, {
    params: { fields: JSON.stringify(["name", "docstatus"]), filters: JSON.stringify(filters) },
  });
  expect(res.status()).toBe(200);
  return (await res.json()).data;
}

async function removeTestRecords(request) {
  for (const t of await names(request, "OmniQuery Template", [["title", "=", TEMPLATE_TITLE]])) {
    if (t.docstatus === 1) await call(request, "frappe.client.cancel", { doctype: "OmniQuery Template", name: t.name });
    await call(request, "frappe.client.delete", { doctype: "OmniQuery Template", name: t.name });
  }
  for (const p of await names(request, "OmniQuery Project", [["project_name", "=", PROJECT_NAME]])) {
    await call(request, "frappe.client.delete", { doctype: "OmniQuery Project", name: p.name });
  }
}
