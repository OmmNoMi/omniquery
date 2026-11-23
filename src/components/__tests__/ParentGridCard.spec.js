import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import QuestionCard from "../survey/QuestionCard.vue";
import MatrixQuestionCard from "../survey/MatrixQuestionCard.vue";
import SectionCard from "../survey/SectionCard.vue";
import FocusModeModal from "../survey/FocusModeModal.vue";
import { useTranslation } from "../../composables/useTranslation";
import { gridsByCode } from "../../utils/questionLayout";

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
const share = { question_code: "a_share", label_en: "a. Own share", field_type: "Data", group_code: "activity" };
const card = (props) => mount(QuestionCard, { props: { question: share, modelValue: "", ...props } });
const gridCard = (wrapper) => wrapper.get("[data-parent-grid]");

let wrappers = [];
afterEach(() => {
  wrappers.forEach((w) => w.unmount());
  wrappers = [];
  document.body.innerHTML = "";
  setLanguage("hi");
});

function openFocusMode(props) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  wrappers.push(
    mount(FocusModeModal, {
      props: { isOpen: true, questions: [share], currentIndex: 0, responses: {}, autoAdvance: false, sectionTitle: "SEC C", ...props },
      attachTo: host,
    })
  );
  return vi.waitFor(() => expect(document.querySelector("[data-question-card]")).not.toBeNull());
}

describe("the grid a question sits under (#140)", () => {
  it("is shown by its own label and description, in the surveyor's language", () => {
    setLanguage("hi");
    const text = card({ parentQuestion: activity }).text();
    expect(text).toContain("गतिविधियाँ");
    expect(text).toContain("हर गतिविधि की एक पंक्ति");
    setLanguage("en");
    const english = card({ parentQuestion: activity }).text();
    expect(english).toContain("Activity Involvements");
    expect(english).toContain("One row per activity");
  });

  it("is headed in the surveyor's language", () => {
    setLanguage("hi");
    expect(card({ parentQuestion: activity }).text()).toContain("मुख्य तालिका प्रश्न");
  });

  it("is not shown for a question under no grid", () => {
    expect(card().text()).not.toContain(__("Main table question"));
  });

  it("scrolls with the question on the page", () => {
    expect(gridCard(card({ parentQuestion: activity })).classes()).not.toContain("sticky");
  });

  it("is shown once in focus mode, pinned, from the section's grids", async () => {
    await openFocusMode({ sectionGrids: gridsByCode([activity]) });
    const heading = __("Main table question");
    expect(document.body.textContent.split(heading).length - 1).toBe(1);
    expect(document.querySelector("[data-parent-grid]").classList).toContain("sticky");
  });

  it("is not shown in focus mode when the section has no such grid", async () => {
    await openFocusMode({});
    expect(document.body.textContent).not.toContain(__("Main table question"));
  });
});

// #140: every card shows a description compiled in English to a Hindi surveyor through __(), and a
// Hindi-compiled one never to an English surveyor. A description __() has no translation for shows
// the compiled Hindi (#165).
describe("a description on a card", () => {
  const english = { description: "Next", description_translated: "Next" };
  const hindi = { description: "One row per activity", description_translated: "अगला अनुवाद" };

  const matrixText = (extra) =>
    mount(MatrixQuestionCard, {
      props: { question: { question_code: "herd", label_en: "Herd", field_type: "Matrix", columns: [], rows: [], ...extra }, modelValue: {} },
    }).text();
  const sectionText = (extra) =>
    mount(SectionCard, { props: { section: { section_code: "s1", section_title: "Shop", ...extra }, currentIndex: 0, totalSections: 1 } }).text();

  for (const [name, text] of [["matrix", matrixText], ["section", sectionText]]) {
    it(`on a ${name} card is in the surveyor's language`, () => {
      setLanguage("hi");
      expect(text(english)).toContain(__("Next"));
      expect(text(hindi)).toContain("अगला अनुवाद");
      setLanguage("en");
      expect(text(hindi)).not.toContain("अगला अनुवाद");
    });
  }
});
