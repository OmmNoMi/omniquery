// UI tests: `bench --site <site> run-ui-tests omniquery --headless`. Frappe 16 runs Playwright for an
// app with this file (Cypress is deprecated there), and the specs reuse Frappe's own fixtures.
// CommonJS, like Frappe's own config: the runner finds @playwright/test in frappe/node_modules
// through NODE_PATH, which ESM imports ignore, and this app's package.json is "type": "module".
const { defineConfig } = require("@playwright/test");
const { WORKERS } = require("../frappe/playwright/support/config");

module.exports = defineConfig({
  testDir: "./playwright/tests",
  fullyParallel: false,
  workers: WORKERS,
  forbidOnly: Boolean(process.env.CI),
  retries: 1,
  timeout: 120000,
  expect: { timeout: 20000 },
  reporter: [["list"]],
  use: {
    viewport: { width: 1280, height: 900 },
    actionTimeout: 20000,
    navigationTimeout: 30000,
    trace: "on-first-retry",
    screenshot: "only-on-failure",
  },
});
