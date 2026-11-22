import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import QuestionCard from "../survey/QuestionCard.vue";
import FocusModeModal from "../survey/FocusModeModal.vue";
import { useTranslation } from "../../composables/useTranslation";

// #140: a question under a grid shows the grid above it, once, in the surveyor's language
const { __, setLanguage } = useTranslation();

const activity = {
  question_code: "activity",
  label_en: "Activity Involvements",
  label_hi: "गतिविधियाँ",
  description: "One row per activity",
  description_translated: "हर गतिविधि की एक पंक्ति",
  field_type: "Dynamic Grid",
};
const share = { question_code: "a_share", label_en: "a. Own share", field_type: "Data", _parentQuestion: activity };

let wrappers = [];
afterEach(() => {
  wrappers.forEach((w) => w.unmount());
  wrappers = [];
  document.body.innerHTML = "";
  setLanguage("hi");
});

describe("the grid a question sits under (#140)", () => {
  it("is shown by its own label and description, in the surveyor's language", () => {
    setLanguage("hi");
    const text = mount(QuestionCard, { props: { question: share, modelValue: "" } }).text();
    expect(text).toContain("गतिविधियाँ");
    expect(text).toContain("हर गतिविधि की एक पंक्ति");
    setLanguage("en");
    expect(mount(QuestionCard, { props: { question: share, modelValue: "" } }).text()).toContain("Activity Involvements");
  });

  it("is not shown for a question under no grid", () => {
    const text = mount(QuestionCard, { props: { question: { ...share, _parentQuestion: null }, modelValue: "" } }).text();
    expect(text).not.toContain(__("Main Table Question"));
  });

  it("is shown once in focus mode", async () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    wrappers.push(
      mount(FocusModeModal, {
        props: { isOpen: true, questions: [share], currentIndex: 0, responses: {}, autoAdvance: false, sectionTitle: "SEC C" },
        attachTo: host,
      })
    );
    await vi.waitFor(() => expect(document.querySelector("[data-question-card]")).not.toBeNull());
    const heading = __("Main Table Question");
    expect(document.body.textContent.split(heading).length - 1).toBe(1);
  });
});
