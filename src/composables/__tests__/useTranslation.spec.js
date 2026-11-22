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

// #140: a question's description, shared by the question card, the matrix card and the grid a
// question sits under
describe("getQuestionDescription", () => {
  beforeEach(() => {
    vi.resetModules();
    localStorage.clear();
  });

  it("prefers the site's translation, then puts the description through __()", async () => {
    const { __, getQuestionDescription } = (await import("../useTranslation")).useTranslation();
    expect(getQuestionDescription({ description: "Next", description_translated: "साइट" })).toBe("साइट");
    expect(__("Next")).not.toBe("Next");
    expect(getQuestionDescription({ description: "Next" })).toBe(__("Next"));
  });

  it("is nothing for a question with no description", async () => {
    const { getQuestionDescription } = (await import("../useTranslation")).useTranslation();
    expect(getQuestionDescription({})).toBe("");
    expect(getQuestionDescription(null)).toBe("");
  });
});
