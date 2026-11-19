import colors from "tailwindcss/colors";

// Colour helpers shared by the guards that measure contrast (focus_rings, button_variants). They
// live here, not in a .test.js file, so a guard can import them without running another guard's
// tests a second time.

// WCAG 2.2 contrast ratio of two #rrggbb colours
export function contrastRatio(a, b) {
  const luminance = (hex) => {
    const [r, g, b] = [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16) / 255);
    const lin = (c) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
    return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
  };
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

// The Tailwind colour a CSS `theme("colors.<name>.<shade>")` call names, or null
export const themeColour = (text) => {
  const m = text?.match(/theme\(\s*["']colors\.([a-z]+)\.(\d+)["']\s*\)/);
  return m ? colors[m[1]]?.[m[2]] || null : null;
};
