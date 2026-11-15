import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { defineComponent, h, ref } from "vue";
import { mount } from "@vue/test-utils";
import FocusModeModal from "../survey/FocusModeModal.vue";
import SectionCard from "../survey/SectionCard.vue";
import { useTranslation } from "../../composables/useTranslation.js";

// #42: focus mode is a frappe-ui Dialog, so reka's layer stack decides which layer an Escape
// closes. Each press closes one thing: a field hands focus back to its card, the mode menu or
// Question Settings closes before focus mode, and only then does focus mode close.

const QUESTIONS = [
  { question_code: "q_name", label: "Farmer name", field_type: "Data" },
  { question_code: "q_herd", label: "Herd size", field_type: "Int" },
];

let wrappers = [];
function mountAttached(component, props) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const wrapper = mount(component, { props, attachTo: host });
  wrappers.push(wrapper);
  return wrapper;
}

function mountFocusMode(props = {}) {
  return mountAttached(FocusModeModal, {
    isOpen: true,
    questions: QUESTIONS,
    currentIndex: 0,
    responses: {},
    autoAdvance: false,
    sectionTitle: "Household",
    ...props,
  });
}

const dialogs = () => [...document.querySelectorAll("[role='dialog']")];
const card = () => document.querySelector("[data-question-card]");
const field = () => document.getElementById("q_input_q_name");
const modeTrigger = () => document.querySelector("button[aria-haspopup='menu']");
const menu = () => document.querySelector("[role='menu']");

function press(key, target = document.activeElement || document.body) {
  target.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
}

async function openFocusModeWithFieldFocused(props) {
  const modal = mountFocusMode(props);
  await vi.waitFor(() => expect(dialogs()).toHaveLength(1));
  await vi.waitFor(() => expect(dialogs()[0].contains(document.activeElement)).toBe(true));
  field().focus();
  expect(document.activeElement).toBe(field());
  return modal;
}

describe("Focus mode Escape and focus (#42)", () => {
  beforeEach(() => {
    useTranslation().setLanguage("en");
  });

  afterEach(() => {
    wrappers.forEach((w) => w.unmount());
    wrappers = [];
    document.body.innerHTML = "";
    vi.restoreAllMocks();
  });

  it("is a modal dialog named Focus Mode, described by the section, hiding the page behind it", async () => {
    const page = document.createElement("main");
    page.textContent = "section behind focus mode";
    document.body.appendChild(page);
    mountFocusMode();

    await vi.waitFor(() => expect(dialogs()).toHaveLength(1));
    const [dialog] = dialogs();
    await vi.waitFor(() => expect(page.getAttribute("aria-hidden")).toBe("true"));
    expect(document.getElementById(dialog.getAttribute("aria-labelledby")).textContent.trim()).toBe("Focus Mode");
    expect(document.getElementById(dialog.getAttribute("aria-describedby")).textContent.trim()).toBe("Household");
  });

  it("moves focus from a field to its card on the first Escape and keeps focus mode open", async () => {
    const modal = await openFocusModeWithFieldFocused();

    press("Escape");

    expect(document.activeElement).toBe(card());
    await new Promise((r) => setTimeout(r, 20));
    expect(modal.emitted("close"), "a field's Escape must stop at its card").toBeFalsy();
    expect(dialogs()).toHaveLength(1);
  });

  it("closes focus mode on a second Escape, from the card", async () => {
    const modal = await openFocusModeWithFieldFocused();

    press("Escape");
    expect(document.activeElement).toBe(card());
    press("Escape");

    await vi.waitFor(() => expect(modal.emitted("close")).toBeTruthy());
  });

  it("closes the matrix card's field the same way: card first, then focus mode", async () => {
    const matrix = {
      question_code: "q_grid",
      label: "Herd by season",
      field_type: "Matrix",
      columns_schema_json: JSON.stringify([{ code: "c1", label: "Count", type: "Int" }]),
      rows_schema_json: JSON.stringify([{ code: "r1", label: "Summer" }]),
    };
    const modal = mountFocusMode({ questions: [matrix] });
    await vi.waitFor(() => expect(dialogs()).toHaveLength(1));
    const matrixCard = document.querySelector("[data-matrix-question-card]");
    const input = matrixCard.querySelector("input");
    expect(input, "the matrix renders a cell input").toBeTruthy();
    input.focus();

    press("Escape");
    expect(document.activeElement).toBe(matrixCard);
    await new Promise((r) => setTimeout(r, 20));
    expect(modal.emitted("close")).toBeFalsy();

    press("Escape");
    await vi.waitFor(() => expect(modal.emitted("close")).toBeTruthy());
  });

  it("closes only the Survey Mode menu on Escape, with focus back on its trigger", async () => {
    const modal = mountFocusMode();
    await vi.waitFor(() => expect(modeTrigger()).toBeTruthy());
    const trigger = modeTrigger();
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    trigger.focus();
    press("Enter", trigger);
    await vi.waitFor(() => expect(menu()).toBeTruthy());
    expect(trigger.getAttribute("aria-expanded")).toBe("true");
    await vi.waitFor(() => expect(menu().contains(document.activeElement)).toBe(true));

    press("Escape");
    await vi.waitFor(() => expect(menu()).toBeFalsy());
    expect(modal.emitted("close"), "the menu's Escape must not close focus mode").toBeFalsy();
    await vi.waitFor(() => expect(document.activeElement).toBe(trigger));
  });

  it("reaches every toggle by arrow key, flips it with Enter, and exits from Focus Form", async () => {
    const modal = mountFocusMode({ isFullForm: true });
    await vi.waitFor(() => expect(modeTrigger()).toBeTruthy());
    press("Enter", modeTrigger());
    await vi.waitFor(() => expect(menu()).toBeTruthy());

    const items = [...menu().querySelectorAll("[role='menuitemcheckbox']")];
    expect(items.map((i) => i.textContent)).toEqual([
      expect.stringContaining("Auto advance"),
      expect.stringContaining("Full form"),
      expect.stringContaining("Focus form"),
    ]);
    expect(items.map((i) => i.getAttribute("aria-checked"))).toEqual(["false", "true", "true"]);

    // keyboard: the first arrow press lands on a toggle, not on a row the keyboard cannot reach
    press("ArrowDown");
    await vi.waitFor(() => expect(items).toContain(document.activeElement));
    const autoAdvance = items[0];
    autoAdvance.focus();
    press("Enter", autoAdvance);
    await vi.waitFor(() => expect(modal.emitted("toggle-auto-advance")).toHaveLength(1));
    await new Promise((r) => setTimeout(r, 20));
    expect(modeTrigger().getAttribute("aria-expanded"), "a settings toggle keeps the menu open").toBe("true");
    expect(menu()).toBeTruthy();
    expect(modal.emitted("close")).toBeFalsy();

    items[2].focus();
    press("Enter", items[2]);
    await vi.waitFor(() => expect(modal.emitted("close")).toBeTruthy());
  });

  it("closes Question Settings alone on Escape, then focus mode on the next", async () => {
    const modal = mountFocusMode();
    await vi.waitFor(() => expect(dialogs()).toHaveLength(1));
    card().focus();
    press("c", card());
    await vi.waitFor(() => expect(dialogs()).toHaveLength(2));
    await vi.waitFor(() => expect(dialogs()[1].contains(document.activeElement)).toBe(true));

    press("Escape");
    await vi.waitFor(() => expect(dialogs()).toHaveLength(1));
    expect(modal.emitted("close"), "Question Settings' Escape must not close focus mode").toBeFalsy();

    await vi.waitFor(() => expect(dialogs()[0].contains(document.activeElement)).toBe(true));
    card().focus();
    press("Escape");
    await vi.waitFor(() => expect(modal.emitted("close")).toBeTruthy());
  });

  it("gives focus back to what opened it when it closes", async () => {
    const opener = document.createElement("button");
    opener.textContent = "Open focus mode";
    document.body.appendChild(opener);
    opener.focus();

    const modal = mountFocusMode();
    await vi.waitFor(() => expect(dialogs()[0]?.contains(document.activeElement)).toBe(true));

    await modal.setProps({ isOpen: false });
    await vi.waitFor(() => expect(document.activeElement).toBe(opener));
  });
});

describe("Section footer Survey Mode menu (#42)", () => {
  beforeEach(() => useTranslation().setLanguage("en"));
  afterEach(() => {
    wrappers.forEach((w) => w.unmount());
    wrappers = [];
    document.body.innerHTML = "";
  });

  const section = { section_code: "S1", section_title: "Household" };

  it("is a frappe-ui menu whose Focus Form toggle asks to toggle focus mode", async () => {
    const wrapper = mountAttached(SectionCard, { section, currentIndex: 0, totalSections: 2, autoAdvance: false });
    const trigger = modeTrigger();
    expect(trigger.textContent).toContain("Standard");
    expect(trigger.getAttribute("aria-expanded")).toBe("false");

    press("Enter", trigger);
    await vi.waitFor(() => expect(menu()).toBeTruthy());
    const focusItem = [...menu().querySelectorAll("[role='menuitemcheckbox']")].find((i) => i.textContent.includes("Focus form"));
    expect(focusItem.getAttribute("aria-checked")).toBe("false");
    focusItem.click();
    await vi.waitFor(() => expect(wrapper.emitted("toggle-focus-mode")).toHaveLength(1));
  });

  it("gives focus back to its own button when focus mode, opened from it, closes", async () => {
    // what Survey.vue does: the section's Focus form toggle opens focus mode, its close shuts it
    const Page = defineComponent(() => {
      const open = ref(false);
      return () => [
        h(SectionCard, { section, currentIndex: 0, totalSections: 2, isFocusMode: open.value, onToggleFocusMode: () => (open.value = !open.value) }),
        h(FocusModeModal, { isOpen: open.value, questions: QUESTIONS, responses: {}, sectionTitle: "Household", onClose: () => (open.value = false) }),
      ];
    });
    mountAttached(Page, {});
    const trigger = modeTrigger();
    trigger.focus();
    press("Enter", trigger);
    await vi.waitFor(() => expect(menu()).toBeTruthy());
    const focusItem = [...menu().querySelectorAll("[role='menuitemcheckbox']")].find((i) => i.textContent.includes("Focus form"));
    focusItem.focus();
    press("Enter", focusItem);
    await vi.waitFor(() => expect(dialogs()).toHaveLength(1));
    await vi.waitFor(() => expect(dialogs()[0].contains(document.activeElement)).toBe(true));

    card().focus();
    press("Escape");
    await vi.waitFor(() => expect(dialogs()).toHaveLength(0));
    await vi.waitFor(() => expect(document.activeElement, "focus returns to the section's mode button").toBe(trigger));
  });

  it("names the toggles that are on in its label", async () => {
    const wrapper = mountAttached(SectionCard, { section, currentIndex: 0, totalSections: 2, autoAdvance: true, isFullForm: true });
    expect(modeTrigger().textContent).toContain("Full (auto)");
    await wrapper.setProps({ autoAdvance: false });
    expect(modeTrigger().textContent).toContain("Full form");
  });
});
