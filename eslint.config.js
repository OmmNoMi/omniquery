import pluginVue from "eslint-plugin-vue";
import globals from "globals";

// The PWA's lint gate (#31): an undeclared name throws only when its line runs, and an empty catch
// hides that throw, so a submitted interview stayed a Draft with no error. These two rules are the
// gate; test/guards/eslint.test.js runs them in `yarn test`. Frappe Builder lints its Vue frontend
// with the same tools. The repo's .eslintrc is the Frappe app boilerplate for Desk JS.
export default [
  { ignores: ["omniquery/public/dist/**", "node_modules/**"] },
  ...pluginVue.configs["flat/base"],
  {
    files: ["src/**/*.{js,vue}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      globals: { ...globals.browser, __APP_VERSION__: "readonly" },
    },
    rules: {
      // a catch that means to ignore says why in a comment, which no-empty counts as a body
      "no-empty": ["error", { allowEmptyCatch: false }],
      "no-undef": "error",
    },
  },
  {
    files: ["src/**/__tests__/**"],
    languageOptions: { globals: { ...globals.node } },
  },
];
