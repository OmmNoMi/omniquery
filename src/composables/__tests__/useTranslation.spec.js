import { describe, it, expect, beforeEach, vi } from "vitest";

// <html lang> must name the language on screen from the moment the app loads, not only after a toggle (#45).
describe("useTranslation sets <html lang>", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
    document.documentElement.lang = "en";
    document.documentElement.dir = "rtl";
  });

  async function load() {
    return (await import("../useTranslation")).useTranslation();
  }

  it("to the PWA's default language as soon as it loads", async () => {
    const { currentLang } = await load();
    expect(currentLang.value).toBe("hi");
    expect(document.documentElement.lang).toBe("hi");
    expect(document.documentElement.dir).toBe("ltr");
  });

  it("to the surveyor's saved language as soon as it loads", async () => {
    localStorage.setItem("omniquery_lang", "en");
    document.documentElement.lang = "hi";
    await load();
    expect(document.documentElement.lang).toBe("en");
  });

  it("whenever the surveyor switches language", async () => {
    const { setLanguage, toggleLanguage } = await load();
    setLanguage("en");
    expect(document.documentElement.lang).toBe("en");
    toggleLanguage();
    expect(document.documentElement.lang).toBe("hi");
  });
});

// #159: an answer comparison's message, picked for the surveyor's language as a question's label is
describe("getRuleMessage", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  const rule = { message: "Expenses cannot exceed income", message_translated: "Expenses (site)", message_hi: "खर्च आय से अधिक नहीं हो सकता" };

  it("prefers the rule's Hindi, then the site's translation, then the message, in Hindi", async () => {
    const { getRuleMessage } = (await import("../useTranslation")).useTranslation();
    expect(getRuleMessage(rule)).toBe("खर्च आय से अधिक नहीं हो सकता");
    expect(getRuleMessage({ ...rule, message_hi: "" })).toBe("Expenses (site)");
    expect(getRuleMessage({ message: "Expenses cannot exceed income" })).toBe("Expenses cannot exceed income");
  });

  it("shows the message as written in English", async () => {
    const { getRuleMessage, setLanguage } = (await import("../useTranslation")).useTranslation();
    setLanguage("en");
    expect(getRuleMessage(rule)).toBe("Expenses cannot exceed income");
  });

  it("reads only text, and nothing from a rule with no message", async () => {
    const { getRuleMessage } = (await import("../useTranslation")).useTranslation();
    expect(getRuleMessage({ message: 5, message_hi: ["x"] })).toBe("");
    expect(getRuleMessage(null)).toBe("");
  });
});

// #140: a question's or a section's description, shared by the question card, the matrix card, the
// section card and the grid a question sits under. description_translated is compiled in the
// language of whoever submitted the template, so it is shown only in Hindi.
describe("getDescription", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  async function load(lang) {
    const t = (await import("../useTranslation")).useTranslation();
    t.setLanguage(lang);
    return t;
  }

  it("shows a Hindi surveyor the compiled Hindi", async () => {
    const { getDescription } = await load("hi");
    expect(getDescription({ description: "One row per activity", description_translated: "हर गतिविधि की एक पंक्ति" })).toBe(
      "हर गतिविधि की एक पंक्ति"
    );
  });

  it("puts an English-compiled description through __() for a Hindi surveyor", async () => {
    const { __, getDescription } = await load("hi");
    expect(__("Next")).not.toBe("Next");
    expect(getDescription({ description: "Next", description_translated: "Next" })).toBe(__("Next"));
    expect(getDescription({ description: "Next" })).toBe(__("Next"));
  });

  it("shows an English surveyor the description, never a Hindi-compiled one", async () => {
    const { getDescription } = await load("en");
    expect(getDescription({ description: "Next", description_translated: "अगला" })).toBe("Next");
  });

  it("is nothing with no description", async () => {
    const { getDescription } = await load("hi");
    expect(getDescription({})).toBe("");
    expect(getDescription(null)).toBe("");
  });
});

// #165: a question's label, a section's title and a choice's label. The text goes through __() first,
// which reads the surveyor's own translations. Each *_translated field is frappe._() run once at
// template submit, in the submitter's language, so it is the fallback only in Hindi.
describe("labels, section titles and choices in the surveyor's language", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  async function load(lang) {
    const t = (await import("../useTranslation")).useTranslation();
    t.setLanguage(lang);
    return t;
  }

  it("shows a Hindi surveyor the compiled Hindi", async () => {
    const { getQuestionLabel, getSectionTitle, getOptionLabel } = await load("hi");
    expect(getQuestionLabel({ label_en: "Village", label_translated: "गाँव" })).toBe("गाँव");
    expect(getSectionTitle({ section_title: "Household", section_title_translated: "परिवार" })).toBe("परिवार");
    expect(getOptionLabel({ value: "Yes", label: "Yes", compiled: "हाँ (साइट)" })).toBe("हाँ (साइट)");
  });

  it("puts English-compiled text through __() for a Hindi surveyor", async () => {
    const { __, getQuestionLabel, getSectionTitle, getOptionLabel } = await load("hi");
    expect(__("Next")).not.toBe("Next");
    expect(getQuestionLabel({ label_en: "Next", label_translated: "Next" })).toBe(__("Next"));
    expect(getQuestionLabel({ label: "Next", label_translated: "Next" })).toBe(__("Next"));
    expect(getSectionTitle({ section_title: "Next", section_title_translated: "Next" })).toBe(__("Next"));
    expect(getOptionLabel({ value: "Next", label: "Next", compiled: "Next" })).toBe(__("Next"));
    expect(getOptionLabel({ value: "Next", label: "Next", compiled: "" })).toBe(__("Next"));
  });

  it("shows an English surveyor the authored text, never Hindi-compiled", async () => {
    const { getQuestionLabel, getSectionTitle, getOptionLabel } = await load("en");
    expect(getQuestionLabel({ label_en: "Village", label_translated: "गाँव" })).toBe("Village");
    expect(getSectionTitle({ section_title: "Household", section_title_translated: "परिवार" })).toBe("Household");
    expect(getOptionLabel({ value: "Yes", label: "Yes", compiled: "हाँ" })).toBe("Yes");
  });

  it("keeps a template's own Hindi ahead of the compiled text", async () => {
    const { getQuestionLabel, getSectionTitle } = await load("hi");
    expect(getQuestionLabel({ label_en: "Village", label_hi: "ग्राम", label_translated: "गाँव" })).toBe("ग्राम");
    expect(getSectionTitle({ section_title: "Household", section_title_hi: "घर", section_title_translated: "परिवार" })).toBe("घर");
  });

  // a translation fixed on the site after the template was submitted shows at once, not the
  // compiled word from the submit
  it("shows a Hindi surveyor the live translation ahead of the compiled text", async () => {
    window.__messages = { Village: "ग्राम (साइट)", Household: "परिवार (साइट)", Yes: "हाँ (साइट)", "Expenses cannot exceed income": "खर्च (साइट)" };
    try {
      const { getQuestionLabel, getSectionTitle, getOptionLabel, getDescription, getRuleMessage } = await load("hi");
      expect(getQuestionLabel({ label_en: "Village", label_translated: "गाँव" })).toBe("ग्राम (साइट)");
      expect(getSectionTitle({ section_title: "Household", section_title_translated: "परिवार" })).toBe("परिवार (साइट)");
      expect(getOptionLabel({ value: "Yes", label: "Yes", compiled: "हाँ" })).toBe("हाँ (साइट)");
      expect(getDescription({ description: "Village", description_translated: "गाँव" })).toBe("ग्राम (साइट)");
      expect(getRuleMessage({ message: "Expenses cannot exceed income", message_translated: "खर्च" })).toBe("खर्च (साइट)");
    } finally {
      delete window.__messages;
    }
  });

  it("is nothing with no text, and reads only text", async () => {
    const { getQuestionLabel, getSectionTitle, getOptionLabel } = await load("hi");
    expect(getQuestionLabel(null)).toBe("");
    expect(getSectionTitle(null)).toBe("");
    expect(getOptionLabel(null)).toBe("");
    expect(getQuestionLabel({ question_code: "q1", label_translated: ["x"] })).toBe("q1");
    expect(getOptionLabel({ value: 0, label: "0", compiled: 0 })).toBe("0");
  });
});
