import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { useSurveyApp } from "../useSurveyApp";

// #154: focus mode shows activeQuestions[focusQuestionIndex]. When that list changes under it, it stays
// on its question, and when the list is empty it closes, so isFocusMode never claims a focus mode that
// shows nothing.

const ifLand = { depends_on: "q_has_land", equals: "Yes" };
const question = (section_code, question_code, conditional_logic) => ({
  section_code,
  question_code,
  label_en: question_code,
  ...(conditional_logic && { conditional_logic }),
});

const template = (sections) => ({
  name: "TMPL-TEST-154",
  title: "Test Survey",
  version: 1,
  sections: sections.map((section_code) => ({ section_code })),
  questions: [
    question("s1", "q_has_land"),
    question("s1", "q_land_size", ifLand),
    question("s1", "q_crop", ifLand),
    question("s1", "q_name"),
    question("s1", "q_age"),
    question("s2", "q_land_owner", ifLand), // the whole of s2 hides without land
    question("s3", "q_phone"),
  ].filter((q) => sections.includes(q.section_code)),
});

let wrapper;

// waits out the app's own start (the catalog load), so it can't overwrite the survey a test opens
async function openSurvey({ sections = ["s1", "s2", "s3"], fullForm = false, answers = {} } = {}) {
  let app;
  wrapper = mount(defineComponent({ setup: () => ((app = useSurveyApp()), () => h("div")) }));
  await vi.waitFor(() => expect(app.isLoading.value).toBe(false));
  app.isFullForm.value = fullForm;
  app.activeTemplate.value = template(sections);
  app.responses.value = answers;
  return app;
}

async function focusOn(app, code) {
  await nextTick();
  app.focusQuestionIndex.value = app.activeQuestions.value.findIndex((q) => q.question_code === code);
  app.isFocusMode.value = true;
  await nextTick();
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

describe("focus mode follows its question (#154)", () => {
  it("moves to the next question still shown when Full Form hides the one it is on", async () => {
    const app = await openSurvey({ fullForm: true });
    await focusOn(app, "q_crop");

    app.toggleFullForm();
    await nextTick();
    expect(focused(app), "q_crop is hidden without land, so q_name, which came after it").toBe("q_name");
    expect(app.isFocusMode.value).toBe(true);
  });

  it("stays on its question when Full Form hides the ones before it", async () => {
    const app = await openSurvey({ fullForm: true });
    await focusOn(app, "q_name");

    app.toggleFullForm();
    await nextTick();
    expect(focused(app)).toBe("q_name");
  });

  it("stays on its question when an answer shows questions before it", async () => {
    const app = await openSurvey();
    await focusOn(app, "q_name");
    expect(app.focusQuestionIndex.value).toBe(1);

    app.setResponse("q_has_land", "Yes");
    await nextTick();
    expect(focused(app)).toBe("q_name");
  });

  it("goes to the last question shown when the hidden one was the section's last", async () => {
    const app = await openSurvey({ sections: ["s1"], fullForm: true, answers: { q_has_land: "Yes" } });
    app.activeTemplate.value.questions.push(question("s1", "q_land_notes", ifLand));
    await focusOn(app, "q_land_notes");

    app.setResponse("q_has_land", "No");
    await nextTick();
    app.toggleFullForm();
    await nextTick();
    expect(focused(app)).toBe("q_age");
    expect(app.isFocusMode.value).toBe(true);
  });

  it("leaves the index alone when focus mode is closed", async () => {
    const app = await openSurvey({ fullForm: true });
    await focusOn(app, "q_crop");
    app.isFocusMode.value = false;

    app.toggleFullForm();
    await nextTick();
    expect(app.focusQuestionIndex.value, "opening focus mode picks its own question").toBe(2);
  });

  it("skips a section whose questions are all hidden when a section is finished", async () => {
    const app = await openSurvey({ answers: { q_has_land: "No" } });
    await focusOn(app, "q_name");

    app.onFocusModeFinishSection();
    await nextTick();
    expect(app.activeSection.value.section_code, "s2 has nothing to show without land").toBe("s3");
    expect(focused(app)).toBe("q_phone");
    expect(app.isFocusMode.value).toBe(true);
  });

  it("closes when the section it moves to is the last and shows nothing", async () => {
    const app = await openSurvey({ sections: ["s1", "s2"], answers: { q_has_land: "No" } });
    await focusOn(app, "q_name");

    app.onFocusModeFinishSection();
    await nextTick();
    expect(app.activeSection.value.section_code).toBe("s2");
    expect(app.isFocusMode.value, "the page shows the section and its Submit").toBe(false);
  });

  it("starts the next section at its first question, wherever the template lists that question", async () => {
    const app = await openSurvey({ sections: ["s1", "s3"] });
    app.activeTemplate.value.questions.unshift(question("s3", "q_phone_alt")); // listed before all of s1
    await focusOn(app, "q_name");

    app.onFocusModeFinishSection();
    await nextTick();
    expect(app.activeSection.value.section_code).toBe("s3");
    expect(focused(app), "a new section is not a list change to follow").toBe("q_phone_alt");
  });

  it("keeps a section that has questions to show", async () => {
    const app = await openSurvey({ answers: { q_has_land: "Yes", q_land_size: "2", q_crop: "Wheat" } });
    await focusOn(app, "q_name");

    app.onFocusModeFinishSection();
    await nextTick();
    expect(app.activeSection.value.section_code).toBe("s2");
    expect(focused(app)).toBe("q_land_owner");
  });
});
