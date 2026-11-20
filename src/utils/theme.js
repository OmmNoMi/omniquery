import { computed } from "vue";
import { createSharedComposable, useColorMode } from "@vueuse/core";

// The page's <head> applies the saved theme before first paint (omniquery/www/omniquery.html);
// this applies it at runtime. test/guards/thin_shell_boot.test.js keeps the two in step.
export const THEME_KEY = "omniquery_theme";
// "auto" follows the device (prefers-color-scheme), as VueUse's useColorMode stores it
export const THEMES = ["auto", "light", "dark"];
// Someone who never picked a theme keeps the light look the app has always had (#39)
export const DEFAULT_THEME = "light";
// The browser bar and task switcher colour (<meta name="theme-color">): brand green, or the dark page
export const THEME_COLORS = { light: "#15803d", dark: "#020617" };

// Puts a resolved theme ("light" or "dark") on the page; anything but "dark" is light
export function applyTheme(theme) {
  const dark = theme === "dark";
  const root = document.documentElement;
  // Tailwind's dark: variants (darkMode "class") and frappe-ui's colours ([data-theme="dark"]) both need switching
  root.classList.toggle("dark", dark);
  root.dataset.theme = dark ? "dark" : "light";
  document.querySelector('meta[name="theme-color"]')?.setAttribute("content", dark ? THEME_COLORS.dark : THEME_COLORS.light);
}

// The saved theme choice and the theme on the page. VueUse's useColorMode keeps the choice in
// localStorage (and survives storage being blocked), follows the device while it is "auto", and
// calls applyTheme whenever the resolved theme changes. Shared, so one media-query listener serves
// the whole app; App.vue holds it for the app's lifetime.
export const useTheme = createSharedComposable(() => {
  const mode = useColorMode({
    storageKey: THEME_KEY,
    initialValue: DEFAULT_THEME,
    onChanged: (resolved) => applyTheme(resolved),
  });
  // A stale or hand-edited saved value reads as the default
  const theme = computed({
    get: () => (THEMES.includes(mode.store.value) ? mode.store.value : DEFAULT_THEME),
    set: (value) => {
      mode.store.value = value;
    },
  });
  return { theme, resolvedTheme: mode.state };
});
