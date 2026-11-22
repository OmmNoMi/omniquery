import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { useSurveyApp } from "../useSurveyApp";
import { db } from "../../services/db";

// #155: Finish on a focus-mode section's last question moves on only when the section passes
// validation. When it does not, focus mode goes to the first question that still needs the surveyor,
// where its error shows, and does not start the section again from question 1. Finish on the last
// section checks it before returning to the page, and every Finish saves the section it lands on.

const question = (section_code, question_code, extra = {}) => ({
  section_code,
  question_code,
  label_en: question_code,
  ...extra,
});

// each test has its own draft: a save the last test left pending lands after it ends
let draftNo = 0;
const draftId = () => `OQS-TEST-155-${draftNo}`;

const template = () => ({
  name: "TMPL-TEST-155",
  title: "Test Survey",
  version: 1,
  sections: [{ section_code: "s1" }, { section_code: "s2" }],
  questions: [
    question("s1", "q_name"),
    question("s1", "q_owns_land"),
    // required only for a surveyor who owns land, and the answers say they do not
    question("s1", "q_land_area", { is_mandatory: 1, conditional_logic: { depends_on: "q_owns_land", equals: "Yes" } }),
    question("s1", "q_age", { is_mandatory: 1 }),
    question("s1", "q_phone", { field_type: "Phone" }),
    question("s1", "q_village", { is_mandatory: 1 }),
    question("s1", "q_notes"),
    question("s2", "q_crop"),
    question("s2", "q_crop_area", {
      is_mandatory: 1, // a new section's own empty required question is no error yet
      validation_rules: { operator: "lte", compare_to: "q_age", message: "Crop area is more than the age" },
    }),
  ],
});

let wrapper;

// waits out the app's own start (the catalog load), so it can't overwrite the survey a test opens
async function openOnLastQuestion(answers, { section = 0, fullForm = false } = {}) {
  let app;
  draftNo += 1;
  wrapper = mount(defineComponent({ setup: () => ((app = useSurveyApp()), () => h("div")) }));
  await vi.waitFor(() => expect(app.isLoading.value).toBe(false));
  app.activeTemplate.value = template();
  app.currentDraftId.value = draftId();
  app.isFullForm.value = fullForm;
  app.responses.value = { q_owns_land: "No", ...answers };
  app.activeSectionIndex.value = section;
  await nextTick();
  app.focusQuestionIndex.value = app.activeQuestions.value.length - 1;
  app.isFocusMode.value = true;
  await nextTick();
  return app;
}

const focused = (app) => app.activeQuestions.value[app.focusQuestionIndex.value]?.question_code;

const savedSection = async () => (await db.responses.get(draftId()))?.active_section_index;
// the answers' own debounced save lands first, as it has long before a surveyor presses Next, so
// the save that follows is the move's own
const answersSaved = () => vi.waitFor(async () => expect(await savedSection()).toBe(0));

beforeEach(async () => {
  await db.responses.clear();
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({}) })));
});

afterEach(() => {
  wrapper?.unmount();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("Finish section in focus mode (#155)", () => {
  it("goes to the first required question left empty, not to question 1", async () => {
    const app = await openOnLastQuestion({ q_name: "Asha", q_age: 30 });

    app.onFocusModeFinishSection();
    await nextTick();
    expect(app.activeSectionIndex.value, "the section does not change").toBe(0);
    expect(focused(app)).toBe("q_village");
    expect(app.validationErrors.value.q_village).toBeTruthy();
    expect(app.isFocusMode.value).toBe(true);
  });

  it("goes to the first question with any error, in template order", async () => {
    const app = await openOnLastQuestion({ q_age: 30, q_phone: "12345" });

    app.onFocusModeFinishSection();
    await nextTick();
    expect(focused(app), "the wrong phone number comes before the empty village").toBe("q_phone");
    expect(app.validationErrors.value.q_phone).toBeTruthy();
    expect(app.validationErrors.value.q_village).toBeTruthy();
  });

  it("moves to the next section's first question when the section passes", async () => {
    const app = await openOnLastQuestion({ q_age: 30, q_village: "Kotri" });

    app.onFocusModeFinishSection();
    await nextTick();
    expect(app.activeSectionIndex.value).toBe(1);
    expect(focused(app)).toBe("q_crop");
    expect(app.isFocusMode.value).toBe(true);
  });

  it("passes a required question the answers hide, which Full Form shows", async () => {
    const app = await openOnLastQuestion({ q_age: 30 }, { fullForm: true });
    expect(app.activeQuestions.value.map((q) => q.question_code), "Full Form shows the hidden question").toContain("q_land_area");

    app.onFocusModeFinishSection();
    await nextTick();
    expect(focused(app), "the hidden question needs no answer").toBe("q_village");
    expect(app.validationErrors.value.q_land_area).toBeUndefined();
  });

  it("is not held by a rule on a question in a later section", async () => {
    // q_crop_area's rule fails, but the surveyor has not reached its section yet
    const app = await openOnLastQuestion({ q_age: 30, q_village: "Kotri", q_crop_area: 99 });

    app.onFocusModeFinishSection();
    await nextTick();
    expect(app.activeSectionIndex.value).toBe(1);
    expect(focused(app)).toBe("q_crop");
  });

  it("returns to the page from the last section only when it passes", async () => {
    const app = await openOnLastQuestion({ q_age: 30, q_village: "Kotri", q_crop: "Wheat" }, { section: 1 });

    app.onFocusModeFinishSection();
    await nextTick();
    expect(app.isFocusMode.value, "the empty crop area keeps focus mode open").toBe(true);
    expect(focused(app)).toBe("q_crop_area");
    expect(app.validationErrors.value.q_crop_area).toBeTruthy();

    app.responses.value.q_crop_area = 12;
    app.onFocusModeFinishSection();
    await nextTick();
    expect(app.isFocusMode.value).toBe(false);
    expect(app.activeSectionIndex.value, "the page opens on the last section, where Submit is").toBe(1);
  });

  it("saves the draft on the section Finish moves to", async () => {
    const app = await openOnLastQuestion({ q_age: 30, q_village: "Kotri" });
    await answersSaved();

    app.onFocusModeFinishSection();
    await vi.waitFor(async () => expect(await savedSection()).toBe(1));
  });
});

describe("Next and Previous on the page (#155)", () => {
  it("save the draft on the section they move to", async () => {
    const app = await openOnLastQuestion({ q_age: 30, q_village: "Kotri" });
    app.isFocusMode.value = false;
    await answersSaved();

    app.handleNextSection();
    await vi.waitFor(async () => expect(await savedSection()).toBe(1));

    app.handlePrevSection();
    await vi.waitFor(async () => expect(await savedSection()).toBe(0));
  });
});
