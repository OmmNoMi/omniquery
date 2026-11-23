import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mount } from "@vue/test-utils";
import { Select } from "frappe-ui";
import MatrixQuestionCard from "../survey/MatrixQuestionCard.vue";
import GroupedQuestionCard from "../survey/GroupedQuestionCard.vue";
import { useTranslation } from "../../composables/useTranslation";
import { layoutQuestions } from "../../utils/questionLayout";

// #165: the text a template authors (a grid's title, rows, columns and cell choices, a group's title
// and its sub-questions' labels) is shown in the surveyor's language, as a single question card's is
const t = useTranslation();
// a site Translation is keyed on the whole authored label, its number included
const SITE = {
  "Q4. Herd": "Q4. पशु",
  Cows: "गायें",
  Kind: "प्रकार",
  Regular: "नियमित",
  "Herd size": "पशु संख्या",
  "a. Own share": "a. अपना हिस्सा",
};

let wrappers = [];
const track = (wrapper) => (wrappers.push(wrapper), wrapper);

beforeEach(() => {
  window.__messages = { ...SITE };
  t.setLanguage("hi");
});
afterEach(() => {
  wrappers.forEach((w) => w.unmount());
  wrappers = [];
  delete window.__messages;
  t.setLanguage("hi");
});

const grid = {
  question_code: "herd",
  label_en: "Q4. Herd",
  field_type: "Matrix",
  rows: [{ id: "cows", label: "Cows" }],
  columns: [{ key: "kind", label: "Kind", type: "select", options: ["Regular", { label: "Cows", value: "cow" }] }],
};

describe("a grid card", () => {
  it("shows its title, rows, columns and cell choices in the surveyor's language", () => {
    const card = track(mount(MatrixQuestionCard, { props: { question: grid, modelValue: {} } }));
    expect(card.attributes("aria-label")).toBe("पशु");
    expect(card.text()).toContain("Q4");
    expect(card.text()).toContain("गायें");
    expect(card.text()).toContain("प्रकार");
    expect(card.text()).not.toMatch(/Herd|Cows|Kind/);
    const options = card.findComponent(Select).props("options");
    expect(options).toEqual([
      { label: "नियमित", value: "Regular" },
      { label: "गायें", value: "cow" },
    ]);
  });

  it("shows them as authored to an English surveyor", () => {
    t.setLanguage("en");
    const card = track(mount(MatrixQuestionCard, { props: { question: grid, modelValue: {} } }));
    expect(card.attributes("aria-label")).toBe("Herd");
    expect(card.text()).toContain("Cows");
    expect(card.findComponent(Select).props("options")[0]).toEqual({ label: "Regular", value: "Regular" });
  });

  it("puts the template's own Hindi label ahead of a translation", () => {
    const card = track(mount(MatrixQuestionCard, { props: { question: { ...grid, label_hi: "मवेशी" }, modelValue: {} } }));
    expect(card.attributes("aria-label")).toBe("मवेशी");
  });
});

describe("a grouped card", () => {
  const run = [
    { question_code: "a_share", label_en: "a. Own share", field_type: "Data", group_title: "Herd size" },
    { question_code: "b_share", label_en: "b. Partner share", field_type: "Data", label_hi: "साथी का हिस्सा" },
  ];
  const mountGroup = () => {
    const [group] = layoutQuestions(run, { __: t.__, getQuestionLabel: t.getQuestionLabel });
    return track(mount(GroupedQuestionCard, { props: { group, responses: {}, validationErrors: { a_share: "required" } } }));
  };

  it("shows its title and its sub-questions' labels in the surveyor's language", () => {
    const card = mountGroup();
    expect(card.attributes("aria-label")).toBe("पशु संख्या");
    expect(card.get("h3").text()).toBe("पशु संख्या");
    const labels = card.findAll("label[id^='sub_label_']").map((l) => l.text());
    expect(labels).toEqual(["अपना हिस्सा", "साथी का हिस्सा"]);
    expect(card.text()).not.toMatch(/Own share|Partner share|Herd size/);
  });

  it("shows them as authored to an English surveyor", () => {
    t.setLanguage("en");
    const card = mountGroup();
    expect(card.get("h3").text()).toBe("Herd size");
    expect(card.findAll("label[id^='sub_label_']").map((l) => l.text())).toEqual(["Own share", "Partner share"]);
  });
});
