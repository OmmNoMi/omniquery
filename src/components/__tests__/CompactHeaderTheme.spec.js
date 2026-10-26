import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { mount } from "@vue/test-utils";
import CompactHeader from "../header/CompactHeader.vue";

describe("CompactHeader Theme & Data-Theme Invariants (#39)", () => {
  let matchMediaListeners = [];
  let isDarkMode = false;

  beforeEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    matchMediaListeners = [];
    isDarkMode = false;

    window.matchMedia = vi.fn().mockImplementation((query) => ({
      matches: isDarkMode,
      media: query,
      onchange: null,
      addListener: vi.fn((fn) => matchMediaListeners.push(fn)),
      removeListener: vi.fn(),
      addEventListener: vi.fn((event, fn) => {
        if (event === "change") matchMediaListeners.push(fn);
      }),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  afterEach(() => {
    localStorage.clear();
    document.documentElement.className = "";
    document.documentElement.removeAttribute("data-theme");
    vi.restoreAllMocks();
  });

  it("defaults to System theme and applies prefers-color-scheme: dark", async () => {
    isDarkMode = true;
    const wrapper = mount(CompactHeader, {
      props: {
        surveyTitle: "Test Survey",
        showBack: true,
      },
    });

    expect(wrapper.vm.activeTheme).toBe("system");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });

  it("sets both .dark class and data-theme when switching between light, dark, and system", async () => {
    const wrapper = mount(CompactHeader, {
      props: {
        surveyTitle: "Test Survey",
      },
    });

    // Switch to dark
    wrapper.vm.setAppTheme("dark");
    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
    expect(localStorage.getItem("omniquery_theme")).toBe("dark");

    // Switch to light
    wrapper.vm.setAppTheme("light");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("omniquery_theme")).toBe("light");

    // Switch back to system (with isDarkMode = false)
    isDarkMode = false;
    wrapper.vm.setAppTheme("system");
    expect(document.documentElement.classList.contains("dark")).toBe(false);
    expect(document.documentElement.getAttribute("data-theme")).toBe("light");
    expect(localStorage.getItem("omniquery_theme")).toBe("system");
  });

  it("reacts dynamically to OS system color scheme changes when theme is system", async () => {
    isDarkMode = false;
    const wrapper = mount(CompactHeader, {
      props: {
        surveyTitle: "Test Survey",
      },
    });

    expect(document.documentElement.getAttribute("data-theme")).toBe("light");

    // OS switches to dark
    isDarkMode = true;
    for (const listener of matchMediaListeners) {
      listener({ matches: true });
    }

    expect(document.documentElement.classList.contains("dark")).toBe(true);
    expect(document.documentElement.getAttribute("data-theme")).toBe("dark");
  });
});
