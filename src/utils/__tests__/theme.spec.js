import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { effectScope, nextTick } from "vue";
import { applyTheme, useTheme, THEME_COLORS, DEFAULT_THEME } from "../theme";

// A device that prefers dark (or not), whose setting can flip while the app is open
function stubDevice(prefersDark) {
  const listeners = new Set();
  const query = {
    matches: prefersDark,
    media: "(prefers-color-scheme: dark)",
    addEventListener: (_, fn) => listeners.add(fn),
    removeEventListener: (_, fn) => listeners.delete(fn),
    addListener: (fn) => listeners.add(fn),
    removeListener: (fn) => listeners.delete(fn),
  };
  vi.stubGlobal("matchMedia", vi.fn(() => query));
  return {
    flip(dark) {
      query.matches = dark;
      listeners.forEach((fn) => fn({ matches: dark }));
    },
  };
}

const root = () => document.documentElement;
const themeColor = () => document.querySelector('meta[name="theme-color"]').getAttribute("content");

describe("theme (#39, #45)", () => {
  let scope;

  // useTheme is shared: it lives while one scope holds it, as App.vue does, and resets when that stops
  function mountTheme() {
    scope = effectScope();
    return scope.run(() => useTheme());
  }

  beforeEach(() => {
    localStorage.clear();
    root().className = "";
    delete root().dataset.theme;
    document.head.innerHTML = `<meta name="theme-color" content="${THEME_COLORS.light}">`;
  });

  afterEach(() => {
    scope?.stop();
    scope = null;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("switches Tailwind's .dark class, frappe-ui's data-theme and the browser bar colour", () => {
    applyTheme("dark");
    expect(root().classList.contains("dark")).toBe(true);
    expect(root().dataset.theme).toBe("dark");
    expect(themeColor()).toBe(THEME_COLORS.dark);
    applyTheme("light");
    expect(root().classList.contains("dark")).toBe(false);
    expect(root().dataset.theme).toBe("light");
    expect(themeColor()).toBe(THEME_COLORS.light);
  });

  it("keeps light for someone who never picked a theme, even on a dark device", async () => {
    stubDevice(true);
    const { theme } = mountTheme();
    await nextTick();
    expect(DEFAULT_THEME).toBe("light");
    expect(theme.value).toBe("light");
    expect(root().dataset.theme).toBe("light");
  });

  it("applies and saves a picked theme", async () => {
    stubDevice(false);
    const { theme } = mountTheme();
    theme.value = "dark";
    await nextTick();
    expect(localStorage.getItem("omniquery_theme")).toBe("dark");
    expect(root().classList.contains("dark")).toBe(true);
    expect(themeColor()).toBe(THEME_COLORS.dark);
  });

  it("follows the device while on System, as it changes", async () => {
    const device = stubDevice(true);
    localStorage.setItem("omniquery_theme", "auto");
    const { theme, resolvedTheme } = mountTheme();
    await nextTick();
    expect(theme.value).toBe("auto");
    expect(resolvedTheme.value).toBe("dark");
    expect(root().dataset.theme).toBe("dark");
    device.flip(false);
    await nextTick();
    expect(root().dataset.theme).toBe("light");
    expect(themeColor()).toBe(THEME_COLORS.light);
  });

  it("reads a stale saved value as the default", async () => {
    stubDevice(true);
    localStorage.setItem("omniquery_theme", "solarized");
    const { theme } = mountTheme();
    await nextTick();
    expect(theme.value).toBe(DEFAULT_THEME);
    expect(root().classList.contains("dark")).toBe(false);
  });

  it("still works when storage is blocked", async () => {
    stubDevice(false);
    vi.spyOn(Storage.prototype, "getItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(Storage.prototype, "setItem").mockImplementation(() => {
      throw new Error("blocked");
    });
    vi.spyOn(console, "error").mockImplementation(() => {});
    const { theme } = mountTheme();
    theme.value = "dark";
    await nextTick();
    expect(root().dataset.theme).toBe("dark");
  });
});
