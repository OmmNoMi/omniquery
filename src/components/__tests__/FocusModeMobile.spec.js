import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { mount } from "@vue/test-utils";
import FocusModeModal from "../survey/FocusModeModal.vue";
import MatrixQuestionCard from "../survey/MatrixQuestionCard.vue";
import QuestionCard from "../survey/QuestionCard.vue";
import { useTranslation } from "../../composables/useTranslation.js";
import { ruleDeclarations } from "../../../test/guards/sourceFiles.js";

// Field surveyors fill focus mode on a phone, one question at a time, with auto-advance on. The
// advance waits long enough to see the choice the finger landed on, a second tap can't answer the
// next question unseen, a grid never moves on while it is being typed into (#170), and the dialog
// fills the screen.

const QUESTIONS = [
  { question_code: "q_name", label: "Farmer name", field_type: "Data" },
  { question_code: "q_herd", label: "Herd size", field_type: "Int" },
];

// one row and one cell, so the cell is the grid's last
const grid = (question_code) => ({
  question_code,
  label: "Herd size",
  field_type: "Matrix",
  rows: [{ id: "r1", label: "Cows" }],
  columns: [{ key: "c1", label: "Count", type: "text" }],
});

let wrappers = [];
function mountFocusMode(props = {}) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const wrapper = mount(FocusModeModal, {
    props: { isOpen: true, questions: QUESTIONS, currentIndex: 0, responses: {}, autoAdvance: true, sectionTitle: "Household", ...props },
    attachTo: host,
  });
  wrappers.push(wrapper);
  return wrapper;
}

const body = () => document.querySelector("[data-focus-mode]");
const openDialog = () => vi.waitFor(() => expect(body()).not.toBeNull());
const moves = (modal) => (modal.emitted("next-question") || []).length + (modal.emitted("finish-section") || []).length;
const button = (label) => [...document.querySelectorAll("[data-focus-mode] footer button")].find((b) => b.textContent.trim() === label);

describe("Focus mode on a phone", () => {
  beforeEach(() => useTranslation().setLanguage("en"));
  afterEach(() => {
    wrappers.forEach((w) => w.unmount());
    wrappers = [];
    document.body.innerHTML = "";
    vi.useRealTimers();
    useTranslation().setLanguage("en");
  });

  it("moves on 450 ms after an answer, so the surveyor sees the choice they tapped", async () => {
    const modal = mountFocusMode();
    await openDialog();
    vi.useFakeTimers();

    modal.findComponent(QuestionCard).vm.$emit("answered");
    vi.advanceTimersByTime(449);
    expect(moves(modal), "still on the answered question").toBe(0);
    vi.advanceTimersByTime(1);
    expect(moves(modal)).toBe(1);
  });

  it("takes no tap on the next question for 350 ms after a move, so a double tap answers nothing unseen", async () => {
    const modal = mountFocusMode();
    await openDialog();
    const question = () => body().querySelector("[data-question-card]").closest(".overflow-y-auto > div");
    vi.useFakeTimers();

    button("Next").click();
    expect(moves(modal)).toBe(1);
    await modal.vm.$nextTick();
    expect(question().classList.contains("pointer-events-none")).toBe(true);
    button("Next").click();
    expect(moves(modal), "the second tap moves nowhere").toBe(1);

    vi.advanceTimersByTime(350);
    await modal.vm.$nextTick();
    expect(question().classList.contains("pointer-events-none")).toBe(false);
  });

  it("never moves on from a grid while it is typed into, only on Enter in its last cell or Next (#170)", async () => {
    const modal = mountFocusMode({ questions: [grid("q_grid"), QUESTIONS[0]] });
    await openDialog();
    const cell = body().querySelector("[data-cell='0_0'] input, input[data-cell='0_0']");

    for (const typed of ["1", "12", "120"]) {
      cell.value = typed;
      cell.dispatchEvent(new Event("input", { bubbles: true }));
      await vi.waitFor(() => expect(Object.values(modal.emitted("update-response")?.at(-1)?.[0].value || {})).toEqual([typed]));
    }
    await new Promise((resolve) => setTimeout(resolve, 600));
    expect(moves(modal), "the grid stays while it is being filled").toBe(0);

    cell.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(moves(modal)).toBe(1);
  });

  it("shows the question count as text, with the progress bar hidden from screen readers", async () => {
    mountFocusMode({ currentIndex: 1 });
    await openDialog();
    expect(body().querySelector("header").textContent).toContain("Question 2 of 2");
    const bar = body().querySelector("[role='progressbar']");
    expect(bar.closest("[aria-hidden='true']")).not.toBeNull();
    expect(button("Finish"), "the last question finishes the section").toBeDefined();
  });

  it("speaks Hindi on a Hindi device before hi.po loads", async () => {
    useTranslation().setLanguage("hi");
    mountFocusMode();
    await openDialog();
    expect(body().querySelector("header").textContent).toContain("प्रश्न 1 / 2");
    expect(document.querySelector("[role='dialog']").getAttribute("aria-labelledby")).toBeTruthy();
    expect(document.getElementById(document.querySelector("[role='dialog']").getAttribute("aria-labelledby")).textContent.trim()).toBe("फ़ोकस मोड");
    expect(body().querySelector("button[aria-label='फ़ोकस मोड से बाहर निकलें']")).not.toBeNull();
  });

  it("fills a phone's screen: no margin, gutter or corners round it under 640px", () => {
    const css = fs.readFileSync(path.resolve(__dirname, "../../styles/main.css"), "utf8");
    const phone = ["@media (max-width: 639.98px)"];
    const at = (selector, prop) => ruleDeclarations(css, selector, prop).find((d) => d.atRules.join() === phone.join())?.value;
    expect(at(".dialog-content:has(> [data-focus-mode])", "margin")).toBe("0");
    expect(at(".dialog-content:has(> [data-focus-mode])", "max-width")).toBe("none");
    expect(at(".dialog-content:has(> [data-focus-mode])", "border-radius")).toBe("0");
    expect(at(":has(> .dialog-content > [data-focus-mode])", "padding")).toBe("0");
  });

  it("puts the [data-focus-mode] body straight inside frappe-ui's dialog content, where that rule looks", async () => {
    mountFocusMode();
    await openDialog();
    expect(body().parentElement.classList.contains("dialog-content")).toBe(true);
    expect(body().classList.contains("h-[100dvh]")).toBe(true);
  });
});

describe("A grid's answers (#170)", () => {
  it("are sent on every cell change but never as answered, so no one moves the survey on mid-typing", async () => {
    const wrapper = mount(MatrixQuestionCard, { props: { question: grid("q_grid"), modelValue: {} } });
    await wrapper.find("input").setValue("4");
    expect(Object.values(wrapper.emitted("update:modelValue").at(-1)[0])).toEqual(["4"]);
    expect(wrapper.emitted("answered")).toBeUndefined();
    wrapper.unmount();
  });
});
