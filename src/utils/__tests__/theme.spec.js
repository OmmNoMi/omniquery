import { describe, it, expect, beforeEach, vi } from "vitest";
import { applyTheme, storedTheme } from "../theme";

describe("theme (#45)", () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    vi.restoreAllMocks();
  });

  it("switches both Tailwind's .dark class and frappe-ui's data-theme", () => {
    applyTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.dataset.theme).toBe("dark");
    applyTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.dataset.theme).toBe("light");
  });

  it("reads the saved theme, and anything else as light", () => {
    expect(storedTheme()).toBe("light");
    localStorage.setItem("omniquery_theme", "dark");
    expect(storedTheme()).toBe("dark");
    localStorage.setItem("omniquery_theme", "solarized");
    expect(storedTheme()).toBe("light");
  });

  it("falls back to light when storage is blocked", () => {
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    expect(storedTheme()).toBe("light");
  });
});
