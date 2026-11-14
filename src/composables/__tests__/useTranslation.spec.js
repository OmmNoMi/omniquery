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
