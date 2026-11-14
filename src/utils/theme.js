// The page's <head> applies the saved theme before first paint (omniquery/www/omniquery.html);
// this applies it at runtime. test/guards/thin_shell_boot.test.js keeps the two in step.
export const THEME_KEY = "omniquery_theme";

export function storedTheme() {
  try {
    return localStorage.getItem(THEME_KEY) === "dark" ? "dark" : "light";
  } catch (e) {
    return "light";
  }
}

export function applyTheme(theme) {
  const root = document.documentElement;
  // Tailwind's dark: variants (darkMode "class") and frappe-ui's colours ([data-theme="dark"]) both need switching
  root.classList.toggle("dark", theme === "dark");
  root.dataset.theme = theme === "dark" ? "dark" : "light";
}
