// A grouped question's header stays under the app header while its rows scroll (#141), at the
// header's height (#146), and a row brought into view lands below that header and above the
// section footer, not behind either (useRevealInPage, scroll-margin and scroll-padding in main.css).
import { test, expect } from "../../../frappe/playwright/support/index.js";
import { withApi, createSurvey, removeSurvey, startSurvey } from "../support/omniquery.js";

const PROJECT_NAME = "UI Test Card Headers Project";
const TEMPLATE_TITLE = "UI Test Card Headers Survey";
const ANIMALS = ["Cows", "Buffaloes", "Goats", "Sheep", "Pigs", "Hens", "Ducks", "Horses", "Donkeys", "Camels", "Rabbits", "Bees"];

test.describe.configure({ mode: "serial" });

test.beforeAll(async ({ playwright, baseURL, storageState }) => {
  await withApi({ playwright, baseURL, storageState }, (api) =>
    createSurvey(
      api,
      { project_name: PROJECT_NAME, grantor_organization: "UI Test Grantor" },
      {
        title: TEMPLATE_TITLE,
        sections: [{ section_code: "SEC_1", section_title: "Livestock" }],
        questions: [
          { section_code: "SEC_1", question_code: "q1", label_en: "Village name" },
          // Q3a. … Q3l. form one group, titled by its first question's group_title
          ...ANIMALS.map((animal, i) => ({
            section_code: "SEC_1",
            question_code: `q3${String.fromCharCode(97 + i)}`,
            label_en: `Q3${String.fromCharCode(97 + i)}. ${animal}`,
            field_type: "Integer",
            group_code: "ui_herd",
            group_title: "Herd size",
          })),
          { section_code: "SEC_1", question_code: "q4", label_en: "Anything else?" },
        ],
      },
    ),
  );
});

test.afterAll(async ({ playwright, baseURL, storageState }) => {
  await withApi({ playwright, baseURL, storageState }, (api) => removeSurvey(api, PROJECT_NAME, TEMPLATE_TITLE));
});

const box = (locator) => locator.evaluate((el) => el.getBoundingClientRect().toJSON());

for (const [width, height] of [[1280, 700], [375, 640]]) {
  test(`grouped header sticks under the app header, and rows land clear of it, at ${width}px`, async ({ page }) => {
    await page.setViewportSize({ width, height });
    await startSurvey(page, PROJECT_NAME);
    const card = page.locator("#qc_ui_herd");
    const cardHeader = card.locator("[data-card-header]");
    const rows = card.locator("[data-subquestion-code]");
    await expect(rows).toHaveCount(ANIMALS.length);
    const appHeader = await box(page.locator("header").first());

    // scroll the card's top well past the header: its own header stays, right under the app header
    await card.evaluate((el) => window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY + 300, behavior: "instant" }));
    const stuck = await box(cardHeader);
    expect(Math.abs(stuck.top - appHeader.bottom)).toBeLessThanOrEqual(1);
    expect((await box(card)).top).toBeLessThan(appHeader.bottom);

    // a row brought to the top lands below the card header, not under it
    const middle = rows.nth(6);
    await middle.evaluate((el) => el.scrollIntoView({ block: "start", behavior: "instant" }));
    expect((await box(middle)).top).toBeGreaterThanOrEqual((await box(cardHeader)).bottom - 1);

    // the last row brought to the bottom lands above the section footer
    await page.evaluate(() => window.scrollTo({ top: 0, behavior: "instant" }));
    const last = rows.last();
    await last.evaluate((el) => el.scrollIntoView({ block: "end", behavior: "instant" }));
    const footer = await page.evaluate(() => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--app-footer-height")));
    expect(footer).toBeGreaterThan(0);
    expect((await box(last)).bottom).toBeLessThanOrEqual(height - footer + 1);
  });
}
