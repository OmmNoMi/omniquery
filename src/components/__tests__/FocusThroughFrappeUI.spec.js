import { describe, it, expect, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import { nextTick } from "vue";
import QuestionCard from "../survey/QuestionCard.vue";
import MatrixQuestionCard from "../survey/MatrixQuestionCard.vue";
import FCombobox from "../common/FCombobox.vue";
import FCurrencyInput from "../common/FCurrencyInput.vue";
import FRating from "../common/FRating.vue";
import FRangeSlider from "../common/FRangeSlider.vue";
import GroupedQuestionCard from "../survey/GroupedQuestionCard.vue";

// A ref on a frappe-ui component holds the component, not its element: TextInput exposes its <input>
// as `el`, and Button its <button> as `rootRef`. Calling focus() on the component throws.
// Button's $el is not its <button> either: it is the text node Vue anchors the component's fragment
// with, so `el.$el || el` stores a node that has no focus().

const press = (key) => focused().dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));

let wrapper;
const mountHere = (component, props) => (wrapper = mount(component, { props, attachTo: document.body }));
const focused = () => document.activeElement;

afterEach(() => wrapper?.unmount());

describe("focus reaches the element frappe-ui exposes", () => {
  // more than 7 options, so the card shows its quick search box
  const villages = ["Amer", "Bassi", "Chomu", "Dudu", "Jamwa Ramgarh", "Kotputli", "Phagi", "Sanganer"];
  const choiceQuestion = { question_code: "q_village", label_en: "Village", field_type: "Select", options: villages };

  it("puts a question card's focus in its search box", async () => {
    mountHere(QuestionCard, { question: choiceQuestion, modelValue: "" });
    wrapper.vm.focus();
    await nextTick();
    expect(focused()).toBe(wrapper.find("input[data-search-input]").element);
  });

  it("types into the search box from an option, with the caret after what was typed", async () => {
    mountHere(QuestionCard, { question: choiceQuestion, modelValue: "" });
    const option = wrapper.find("button[role=radio]");
    option.element.focus();
    const search = wrapper.find("input[data-search-input]").element;
    option.element.dispatchEvent(new KeyboardEvent("keydown", { key: "k", bubbles: true, cancelable: true }));
    // already in the box before "k" narrows the options: the browser blurs a focused option as it is
    // filtered out, and focus leaving the card clears the search (jsdom does not, so check it here)
    expect(focused()).toBe(search);
    await nextTick();
    await nextTick();

    expect(focused()).toBe(search);
    expect(search.value).toBe("k");
    expect(search.selectionStart).toBe(1);
  });

  it("moves from the search box to the first option, and between options, with the arrow keys", async () => {
    mountHere(QuestionCard, { question: choiceQuestion, modelValue: "" });
    const options = wrapper.findAll("button[role=radio]").map((o) => o.element);
    wrapper.find("input[data-search-input]").element.focus();
    press("ArrowDown");
    expect(focused()).toBe(options[0]);
    press("ArrowRight");
    expect(focused()).toBe(options[1]);
  });

  it("moves focus to the option a number key picks, when there is no search box", async () => {
    mountHere(QuestionCard, { question: { ...choiceQuestion, options: villages.slice(0, 3) }, modelValue: "" });
    const options = wrapper.findAll("button[role=radio]").map((o) => o.element);
    options[0].focus();
    press("3");
    expect(focused()).toBe(options[2]);
  });

  it("keeps what is typed in the search box while it narrows the options", async () => {
    mountHere(QuestionCard, { question: choiceQuestion, modelValue: "" });
    const search = wrapper.find("input[data-search-input]");
    await search.setValue("ph");
    await nextTick();
    expect(search.element.value).toBe("ph");
    const shown = wrapper.findAll("button[role=radio]");
    expect(shown).toHaveLength(1);
    expect(shown[0].text()).toContain("Phagi");
  });

  it("clears the search when the card moves to another question", async () => {
    mountHere(QuestionCard, { question: choiceQuestion, modelValue: "" });
    await wrapper.find("input[data-search-input]").setValue("ph");
    await wrapper.setProps({ question: { ...choiceQuestion, question_code: "q_block" } });
    expect(wrapper.find("input[data-search-input]").element.value).toBe("");
    expect(wrapper.findAll("button[role=radio]")).toHaveLength(villages.length);
  });

  it("puts a matrix's focus in its first cell, not on the card", async () => {
    mountHere(MatrixQuestionCard, { question: { question_code: "q_capital", label_en: "Capital source" }, modelValue: {} });
    await nextTick();
    wrapper.vm.focus();
    expect(focused().matches("input, select, button"), `focus is on ${focused().outerHTML.slice(0, 80)}`).toBe(true);
  });

  describe("a matrix renders a table and a card layout, and CSS hides one", () => {
    const matrix = {
      question_code: "q_herd",
      label_en: "Herd by season",
      field_type: "Matrix",
      // the card reads rows and columns, not the *_schema_json fields (ROADMAP)
      columns: [{ key: "count", label: "Count", type: "number" }],
      rows: [{ id: "summer", label: "Summer" }, { id: "winter", label: "Winter" }],
    };
    // the table shows from Tailwind's sm breakpoint up
    const screenIsWide = (wide) =>
      vi.stubGlobal("matchMedia", () => ({ matches: wide, addEventListener() {}, removeEventListener() {} }));
    afterEach(() => vi.unstubAllGlobals());

    it("moves between the rows of a dropdown column", async () => {
      screenIsWide(true);
      const withSelect = { ...matrix, columns: [{ key: "breed", label: "Breed", type: "select", options: ["Gir", "Sahiwal"] }] };
      mountHere(MatrixQuestionCard, { question: withSelect, modelValue: {} });
      await nextTick();
      const cells = wrapper.findAll("[data-matrix-layout=table] button[data-cell]").map((c) => c.element);
      expect(cells).toHaveLength(2);

      wrapper.vm.focus();
      expect(focused()).toBe(cells[0]);
      press("ArrowDown");
      expect(focused()).toBe(cells[1]);
    });

    for (const [wide, layout] of [[true, "table"], [false, "cards"]]) {
      it(`keeps focus and arrow keys in the ${layout} on a ${wide ? "wide" : "narrow"} screen`, async () => {
        screenIsWide(wide);
        mountHere(MatrixQuestionCard, { question: matrix, modelValue: {} });
        await nextTick();
        const cells = wrapper.findAll(`[data-matrix-layout=${layout}] input[type=number]`).map((c) => c.element);
        expect(cells).toHaveLength(2);

        wrapper.vm.focus();
        expect(focused()).toBe(cells[0]);
        focused().dispatchEvent(new KeyboardEvent("keydown", { key: "ArrowDown", bubbles: true }));
        expect(focused()).toBe(cells[1]);
      });
    }
  });

  it("opens a combobox into its search box and closes it back to its trigger", async () => {
    mountHere(FCombobox, { modelValue: "", options: [{ label: "Jaipur", value: "JPR" }] });
    const trigger = wrapper.find('button[role="combobox"]');
    await trigger.trigger("click");
    await nextTick();
    expect(focused().tagName).toBe("INPUT");

    await wrapper.find("input").trigger("keydown", { key: "Escape" });
    expect(focused()).toBe(trigger.element);
  });

  it("puts a currency field's focus in its input", () => {
    mountHere(FCurrencyInput, { id: "q_revenue", modelValue: 0, increments: [100] });
    wrapper.vm.focus();
    expect(focused()).toBe(wrapper.find("#q_revenue").element);
  });

  it("moves between a currency field's amount chips with the arrow keys", () => {
    mountHere(FCurrencyInput, { id: "q_revenue", modelValue: 0, increments: [100, 500] });
    const chips = wrapper.findAll("button").filter((b) => b.text().startsWith("+")).map((b) => b.element);
    chips[0].focus();
    press("ArrowRight");
    expect(focused()).toBe(chips[1]);
  });

  it("scrolls a combobox's highlighted option into view", async () => {
    const options = ["Amer", "Bassi", "Chomu"].map((v) => ({ label: v, value: v }));
    mountHere(FCombobox, { modelValue: "", options });
    await wrapper.find('button[role="combobox"]').trigger("click");
    await nextTick();
    const scrolled = [];
    for (const option of wrapper.findAll("[role=option]")) option.element.scrollIntoView = () => scrolled.push(option.text());
    await wrapper.find("input").trigger("keydown", { key: "ArrowDown" });
    await nextTick();
    expect(scrolled).toEqual(["Bassi"]);
  });

  it("keeps focus on the star a rating moves to", async () => {
    mountHere(FRating, { modelValue: 1, maxStars: 5 });
    const stars = wrapper.findAll("[role=radio]").map((s) => s.element);
    stars[0].focus();
    press("ArrowRight");
    await nextTick();
    expect(focused()).toBe(stars[1]);
  });

  it("keeps focus on the step a button scale moves to", async () => {
    mountHere(FRangeSlider, { modelValue: 1, min: 1, max: 5, step: 1, format: "buttons" });
    const steps = wrapper.findAll("[role=radio]").map((s) => s.element);
    steps[0].focus();
    press("ArrowRight");
    await nextTick();
    expect(focused()).toBe(steps[1]);
  });

  it("moves between a grouped card's options, and down to the next question's", () => {
    const yesNo = (code) => ({ question_code: code, label_en: code, field_type: "Single Choice (Radio)", options: ["Yes", "No"] });
    mountHere(GroupedQuestionCard, { group: { group_code: "g_assets", questions: [yesNo("q_cow"), yesNo("q_goat")] }, responses: {} });
    const [cowYes, cowNo, goatYes] = wrapper.findAll("[role=radio]").map((o) => o.element);
    cowYes.focus();
    press("ArrowRight");
    expect(focused()).toBe(cowNo);
    press("ArrowDown");
    expect(focused()).toBe(goatYes);
  });
});
