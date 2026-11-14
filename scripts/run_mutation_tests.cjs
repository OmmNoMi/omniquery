#!/usr/bin/env node
// Each mutant breaks one rule in the real source, runs the test that guards it, and restores the file.
// A test that still passes has stopped guarding its rule. Backend mutants need the bench and site up.
const fs = require("node:fs");
const path = require("node:path");
const { spawnSync } = require("node:child_process");

const appDir = path.resolve(__dirname, "..");
const benchDir = path.resolve(appDir, "..", "..");
const site = process.env.SITE || "ommnomi.local";
const src = (...parts) => path.join(appDir, ...parts);

const vitest = (file) => ({
  cmd: "npx",
  args: ["vitest", "run", file],
  cwd: appDir,
});
const benchTest = (module) => ({
  cmd: "bench",
  args: ["--site", site, "run-tests", "--app", "omniquery", "--module", module],
  cwd: benchDir,
});

// [guard, description, file, find, replace, test]
const MUTANTS = [
  [
    "no-glyph",
    "glyph in FSwitch.vue",
    src("src/components/common/FSwitch.vue"),
    "cursor-pointer",
    "cursor-pointer ⚡",
    vitest("test/guards/no_glyphs.test.js"),
  ],
  [
    "no-raw-control",
    "raw <button> in FSwitch.vue",
    src("src/components/common/FSwitch.vue"),
    "<template>",
    "<template>\n  <button>Raw</button>",
    vitest("test/guards/no_raw_controls.test.js"),
  ],
  [
    "thin-shell",
    "inline <style> in omniquery.html",
    src("omniquery/www/omniquery.html"),
    "</head>",
    "<style>body{}</style>\n</head>",
    vitest("test/guards/thin_shell.test.js"),
  ],
  [
    "thin-shell",
    "app markup in the #app mount",
    src("omniquery/www/omniquery.html"),
    '<div id="app">',
    '<div id="app">\n    <header>OmniQuery</header>',
    vitest("test/guards/thin_shell.test.js"),
  ],
  [
    "shared-useWAL",
    "useWAL no longer shared",
    src("src/composables/useWAL.js"),
    "createSharedComposable(createWAL)",
    "createWAL",
    vitest("src/composables/__tests__/useWAL.shared.spec.js"),
  ],
  [
    "escape-one-layer",
    "a window Escape listener closes the sync queue",
    src("src/App.vue"),
    "const s = provideSurveyApp();",
    'const s = provideSurveyApp();\nwindow.addEventListener("keydown", (e) => { if (e.key === "Escape") s.showWALDrawer = false; });',
    vitest("src/__tests__/App.spec.js"),
  ],
  [
    "contrast",
    "text-slate-300 on a light surface",
    src("src/components/common/FSwitch.vue"),
    "text-slate-800",
    "text-slate-300",
    vitest("test/guards/contrast.test.js"),
  ],
  [
    "contrast",
    "light-mode hover:text-slate-200",
    src("src/components/common/FSwitch.vue"),
    "text-slate-800",
    "text-slate-800 hover:text-slate-200",
    vitest("test/guards/contrast.test.js"),
  ],
  [
    "accessibility",
    'role="switch" removed from FSwitch.vue',
    src("src/components/common/FSwitch.vue"),
    'role="switch"',
    'role="generic-button"',
    vitest("src/components/__tests__/AccessibilityGates.spec.js"),
  ],
  [
    "accessibility",
    "label :for stripped in QuestionCard.vue",
    src("src/components/survey/QuestionCard.vue"),
    `:for="'q_input_' + question.question_code"`,
    "",
    vitest("src/components/__tests__/AccessibilityGates.spec.js"),
  ],
  [
    "offline-wal",
    "db.wal.add omitted in queueWAL",
    src("src/composables/useWAL.js"),
    "await db.wal.add(walEntry);",
    "/* omitted */",
    vitest("src/composables/__tests__/useWAL.spec.js"),
  ],
  [
    "idempotency",
    "batch_push re-saves a submitted response",
    src("omniquery/api/sync.py"),
    'if frappe.db.get_value("OmniQuery Response", doc_name, "docstatus") == 1:',
    "if False:",
    benchTest("omniquery.tests.test_idempotent_sync"),
  ],
  [
    "security",
    "Guest check bypassed in upload_response_audio",
    src("omniquery/api/sync.py"),
    'if current_user == "Guest":',
    "if False:",
    benchTest("omniquery.tests.test_security_gates"),
  ],
];

// Ctrl-C reaches the test child too; keep this process alive so the finally below restores the file.
// spawnSync blocks the event loop, so main() yields after each mutant to let a pending signal handler run.
let interrupted = false;
for (const sig of ["SIGINT", "SIGTERM", "SIGHUP"])
  process.on(sig, () => {
    interrupted = true;
  });

const scores = {};
let total = 0;
let killed = 0;

async function main() {
  for (const [guard, description, file, find, replace, test] of MUTANTS) {
    if (interrupted) break;
    total++;
    scores[guard] = scores[guard] || { total: 0, killed: 0 };
    scores[guard].total++;
    console.log(`[${guard}] #${total}: ${description}`);

    const original = fs.readFileSync(file, "utf8");
    const hits = original.split(find).length - 1;
    if (hits !== 1) {
      // a stale anchor would otherwise pass as "survived" or mutate the wrong line
      console.error(
        `  ANCHOR: expected 1 match in ${path.relative(appDir, file)}, found ${hits}`,
      );
      process.exitCode = 1;
      continue;
    }
    try {
      fs.writeFileSync(file, original.replace(find, replace), "utf8");
      const run = spawnSync(test.cmd, test.args, {
        cwd: test.cwd,
        stdio: "pipe",
      });
      if (run.signal || interrupted) {
        interrupted = true;
      } else if (run.status === 0) {
        console.error("  SURVIVED: the test passed with the rule broken");
      } else {
        console.log("  KILLED");
        killed++;
        scores[guard].killed++;
      }
    } finally {
      fs.writeFileSync(file, original, "utf8");
    }
    await new Promise((resolve) => setImmediate(resolve));
  }

  if (interrupted) {
    console.error("\nInterrupted; the mutated file was restored.");
    process.exit(130);
  }

  console.log("\nMutation score by guard:");
  for (const [guard, s] of Object.entries(scores))
    console.log(`  ${guard.padEnd(18)} ${s.killed}/${s.total}`);
  console.log(`Overall: ${killed}/${total} killed`);

  if (killed < total || process.exitCode) {
    console.error(
      `FAIL: ${total - killed} mutant(s) not killed. Harden the tests.`,
    );
    process.exit(1);
  }
  console.log("SUCCESS: every mutant was killed.");
}

main();
