import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { useSurveyApp } from "../useSurveyApp";

// #155: Finish on a focus-mode section's last question moves on only when the section passes
// validation. When it does not, focus mode goes to the first question that still needs the surveyor,
// where its error shows, and does not start the section again from question 1.

const question = (section_code, question_code, extra = {}) => ({
  section_code,
  question_code,
  label_en: question_code,
  ...extra,
});

const template = () => ({
  name: "TMPL-TEST-155",
  title: "Test Survey",
  version: 1,
  sections: [{ section_code: "s1" }, { section_code: "s2" }],
  questions: [
    question("s1", "q_name"),
    question("s1", "q_age", { is_mandatory: 1 }),
    question("s1", "q_phone", { field_type: "Phone" }),
    question("s1", "q_village", { is_mandatory: 1 }),
    question("s1", "q_notes"),
    question("s2", "q_crop"),
    question("s2", "q_crop_area", { is_mandatory: 1 }), // a new section's own empty required question is no error yet
  ],
});

let wrapper;

// waits out the app's own start (the catalog load), so it can't overwrite the survey a test opens
async function openOnLastQuestion(answers) {
  let app;
  wrapper = mount(defineComponent({ setup: () => ((app = useSurveyApp()), () => h("div")) }));
  await vi.waitFor(() => expect(app.isLoading.value).toBe(false));
  app.activeTemplate.value = template();
  app.responses.value = answers;
  await nextTick();
  app.focusQuestionIndex.value = app.activeQuestions.value.length - 1;
  app.isFocusMode.value = true;
  await nextTick();
  return app;
}

const focused = (app) => app.activeQuestions.value[app.focusQuestionIndex.value]?.question_code;

beforeEach(() => {
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
});
