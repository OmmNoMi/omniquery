import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { mount } from "@vue/test-utils";
import { defineComponent, h, nextTick } from "vue";
import { useSurveyApp } from "../useSurveyApp";
import { templateElements } from "../../../test/guards/sourceFiles.js";

// On the full form an answer moves the page to the next question only with auto-advance on, but
// Enter, which a phone keyboard labels Next (enterkeyhint), always does: a surveyor who turned
// auto-advance off still gets the key's word kept.

const template = () => ({
  name: "TMPL-TEST-ENTER",
  title: "Test Survey",
  version: 1,
  auto_advance: false,
  sections: [{ section_code: "s1" }],
  questions: ["q_name", "q_age"].map((question_code) => ({ section_code: "s1", question_code, label_en: question_code })),
});

let wrapper;
async function openFullForm() {
  let app;
  wrapper = mount(defineComponent({ setup: () => ((app = useSurveyApp()), () => h("div")) }));
  await vi.waitFor(() => expect(app.isLoading.value).toBe(false));
  app.activeTemplate.value = template();
  app.autoAdvance.value = false;
  await nextTick();
  // the page's two question cards, each with its answer field
  document.body.insertAdjacentHTML("beforeend", `<div id="qc_q_name"><input></div><div id="qc_q_age"><input></div>`);
  Element.prototype.scrollIntoView = vi.fn(); // jsdom has none
  return app;
}

const ageField = () => document.querySelector("#qc_q_age input");
const settle = () => new Promise((resolve) => setTimeout(resolve, 150));

beforeEach(() => {
  vi.stubGlobal("fetch", vi.fn(async () => ({ ok: true, status: 200, headers: new Headers(), json: async () => ({}) })));
});

afterEach(() => {
  delete Element.prototype.scrollIntoView;
  wrapper?.unmount();
  document.body.innerHTML = "";
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("Enter on the full form", () => {
  it("moves to the next question with auto-advance off, where an answer stays put", async () => {
    const app = await openFullForm();
    const name = app.activeQuestions.value[0];

    app.onQuestionAnswered(name);
    await settle();
    expect(document.activeElement, "auto-advance is off").not.toBe(ageField());

    app.goToNextQuestion(name);
    await vi.waitFor(() => expect(document.activeElement).toBe(ageField()));
  });

  it("is what Survey.vue's question cards send next to, and an answer goes to onQuestionAnswered", () => {
    const source = fs.readFileSync(path.resolve(__dirname, "../../views/Survey.vue"), "utf8");
    const handler = (node, event) => node.props.find((p) => p.type === 7 && p.name === "on" && p.arg?.content === event)?.exp?.content;
    const cards = templateElements(source).filter((node) => ["QuestionCard", "MatrixQuestionCard"].includes(node.tag));
    expect(cards.map((node) => node.tag)).toEqual(["MatrixQuestionCard", "QuestionCard"]);
    for (const card of cards) {
      expect(handler(card, "next"), `${card.tag} @next`).toBe("s.goToNextQuestion(item.question)");
      expect(handler(card, "answered"), `${card.tag} @answered`).toBe("s.onQuestionAnswered(item.question)");
    }
  });
});
