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

// [find, replace] that moves the block from marker `a` up to `b` down to just before `c`: a mutant
// that changes the order of sections without editing either one
function moveBlockBelow(file, a, b, c) {
  const text = fs.readFileSync(file, "utf8");
  const [start, middle, end] = [a, b, c].map((marker) => text.indexOf(marker));
  if (!(start >= 0 && start < middle && middle < end)) return [`${a} missing or out of order`, ""];
  return [text.slice(start, end), text.slice(middle, end) + text.slice(start, middle)];
}

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
    "copy-dialogs",
    "native window.confirm in FilledFormsModal.vue",
    src("src/components/dashboard/FilledFormsModal.vue"),
    "draftToDiscard.value = responseUid;",
    'if (!window.confirm("Discard?")) return;\n  draftToDiscard.value = responseUid;',
    vitest("test/guards/copy_and_dialogs.test.js"),
  ],
  [
    "copy-dialogs",
    "Title Case label in FilledFormsModal.vue",
    src("src/components/dashboard/FilledFormsModal.vue"),
    'title: __("Discard saved draft?"),',
    'title: __("Discard Saved Draft?"),',
    vitest("test/guards/copy_and_dialogs.test.js"),
  ],
  [
    "copy-dialogs",
    "WAL jargon back in CompactHeader.vue",
    src("src/components/header/CompactHeader.vue"),
    "{{ __('Waiting to upload') }}",
    "{{ __('WAL Queue') }}",
    vitest("test/guards/copy_and_dialogs.test.js"),
  ],
  [
    "copy-dialogs",
    "__() fallback in CompactHeader.vue",
    src("src/components/header/CompactHeader.vue"),
    "{{ __('Text size') }}",
    "{{ __('Text size') || 'Text size' }}",
    vitest("test/guards/copy_and_dialogs.test.js"),
  ],
  [
    "copy-dialogs",
    "not-downloaded toast dropped in useSurveyApp.js",
    src("src/composables/useSurveyApp.js"),
    'toast.warning(__("This survey is not yet downloaded',
    'void (__("This survey is not yet downloaded',
    vitest("src/__tests__/App.spec.js"),
  ],
  [
    "copy-dialogs",
    "FrappeUIProvider not registered in App.vue (no toast viewport)",
    src("src/App.vue"),
    'import { Button, Dialog, FrappeUIProvider } from "frappe-ui";',
    'import { Button, Dialog } from "frappe-ui";',
    vitest("src/__tests__/App.spec.js"),
  ],
  [
    "copy-dialogs",
    "draft discarded without asking",
    src("src/components/dashboard/FilledFormsModal.vue"),
    "draftToDiscard.value = responseUid;",
    "db.responses.delete(responseUid).then(loadResponses).then(() => emit(\"drafts-changed\"));",
    vitest("src/components/__tests__/FilledFormsDraftSync.spec.js"),
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
  [
    "focus-rings",
    "frappe-ui ring token left at a colour under 3:1",
    src("src/styles/main.css"),
    '--outline-gray-3: theme("colors.emerald.600");',
    '--outline-gray-3: theme("colors.slate.300");',
    vitest("test/guards/focus_rings.test.js"),
  ],
  [
    "focus-rings",
    "question card focus ring thinned to 1px",
    src("src/components/survey/QuestionCard.vue"),
    "focus-visible:ring-2 focus-visible:ring-outline-gray-3 cursor-default",
    "focus-visible:ring-1 focus-visible:ring-outline-gray-3 cursor-default",
    vitest("test/guards/focus_rings.test.js"),
  ],
  [
    "focus-rings",
    "question card ring in its own colour, not the shared token",
    src("src/components/survey/QuestionCard.vue"),
    "focus-visible:ring-2 focus-visible:ring-outline-gray-3 cursor-default",
    "focus-visible:ring-2 focus-visible:ring-emerald-500 cursor-default",
    vitest("test/guards/focus_rings.test.js"),
  ],
  [
    "focus-rings",
    "dead focus class on a frappe-ui TextInput",
    src("src/views/Catalog.vue"),
    'class="flex-1"',
    'class="flex-1 focus:border-emerald-500"',
    vitest("test/guards/focus_rings.test.js"),
  ],
  [
    "button-variants",
    "colour classes back on a frappe-ui Button (white on near-white)",
    src("src/components/survey/SectionCard.vue"),
    ':iconRight="ArrowRight"\n            class="shrink-0"',
    ':iconRight="ArrowRight"\n            class="shrink-0 bg-emerald-600 text-white"',
    vitest("test/guards/button_variants.test.js"),
  ],
  [
    "button-variants",
    "a Button themed green, which is 1.5:1 in dark mode",
    src("src/components/survey/SectionCard.vue"),
    ":variant=\"autoAdvance || isFullForm ? 'subtle' : 'outline'\"",
    ":variant=\"autoAdvance || isFullForm ? 'subtle' : 'outline'\"\n          :theme=\"autoAdvance || isFullForm ? 'green' : 'gray'\"",
    vitest("test/guards/button_variants.test.js"),
  ],
  [
    "button-variants",
    "a selected answer drawn in solid green (3.1:1)",
    src("src/utils/choiceButton.js"),
    '{ variant: "solid", theme: "gray" }',
    '{ variant: "solid", theme: "green" }',
    vitest("test/guards/button_variants.test.js"),
  ],
  [
    "button-variants",
    "the allowlist raised instead of fixing the Buttons",
    src("test/guards/button_variants.test.js"),
    '"src/App.vue": 4,',
    '"src/App.vue": 5,',
    vitest("test/guards/button_variants.test.js"),
  ],
  [
    "text-size",
    "new text under 12px",
    src("src/views/Catalog.vue"),
    '<p class="text-xs text-slate-600 dark:text-slate-400">',
    '<p class="text-[10px] text-slate-600 dark:text-slate-400">',
    vitest("test/guards/text_size.test.js"),
  ],
  [
    "contrast",
    "Survey options header back to slate-400",
    src("src/components/survey/SurveyModeMenu.vue"),
    "text-sm font-medium text-ink-gray-5",
    "text-sm font-medium text-slate-400",
    vitest("test/guards/contrast.test.js"),
  ],
  [
    "catalog-search",
    "search field loses its accessible name",
    src("src/views/Catalog.vue"),
    ":aria-label=\"__('Search surveys')\"",
    "",
    vitest("src/components/__tests__/SearchContrastDark.spec.js"),
  ],
  [
    "catalog-search",
    "Clear search leaves focus on the page",
    src("src/views/Catalog.vue"),
    "searchInput.value?.el?.focus();",
    "",
    vitest("src/components/__tests__/SearchContrastDark.spec.js"),
  ],
  [
    "catalog-search",
    "empty state loses its dark-mode surface",
    src("src/views/Catalog.vue"),
    " data-empty-templates class=\"p-8 text-center bg-white dark:bg-slate-900",
    " data-empty-templates class=\"p-8 text-center bg-white",
    vitest("src/components/__tests__/SearchContrastDark.spec.js"),
  ],
  [
    "card-escape",
    "a field's Escape bubbles past its card and closes focus mode",
    src("src/composables/useCardEscape.js"),
    "    event.stopPropagation();\n",
    "",
    vitest("src/components/__tests__/FocusModeEscape.spec.js"),
  ],
  [
    "card-escape",
    "Escape on the card itself is swallowed, so focus mode never closes",
    src("src/composables/useCardEscape.js"),
    "if (!cardRef.value || event.target === cardRef.value) return;",
    "if (!cardRef.value) return;",
    vitest("src/components/__tests__/FocusModeEscape.spec.js"),
  ],
  [
    "card-escape",
    "QuestionCard stops every Escape at its root",
    src("src/components/survey/QuestionCard.vue"),
    '@keydown.esc="onCardEscape"',
    '@keydown.esc.stop="onCardEscape"',
    vitest("src/components/__tests__/FocusModeEscape.spec.js"),
  ],
  [
    "card-escape",
    "MatrixQuestionCard no longer hands a cell's Escape to its card",
    src("src/components/survey/MatrixQuestionCard.vue"),
    '@keydown.esc="onCardEscape"',
    "",
    vitest("src/components/__tests__/FocusModeEscape.spec.js"),
  ],
  [
    "mode-menu",
    "a settings toggle closes the Survey Mode menu",
    src("src/components/survey/SurveyModeMenu.vue"),
    "  event.preventDefault();\n  emit(`toggle-${toggle.key}`);",
    "  emit(`toggle-${toggle.key}`);",
    vitest("src/components/__tests__/FocusModeEscape.spec.js"),
  ],
  [
    "mode-menu",
    "a toggle no longer tells screen readers whether it is on",
    src("src/components/survey/SurveyModeMenu.vue"),
    ':modelValue="toggle.checked"',
    ':modelValue="false"',
    vitest("src/components/__tests__/FocusModeEscape.spec.js"),
  ],
  [
    "mode-menu",
    "Focus form emits before the menu returns focus, so focus mode closes to <body>",
    src("src/components/survey/SurveyModeMenu.vue"),
    "    pendingToggle = toggle.key;\n    return;",
    "    emit(`toggle-${toggle.key}`);\n    return;",
    vitest("src/components/__tests__/FocusModeEscape.spec.js"),
  ],
  [
    "mode-menu",
    "the Focus form item no longer exits focus mode",
    src("src/components/survey/FocusModeModal.vue"),
    "@toggle-focus-mode=\"emit('close')\"",
    "",
    vitest("src/components/__tests__/FocusModeEscape.spec.js"),
  ],
  [
    "mobile-375",
    "the logo link swallows cmd/ctrl-click, so it cannot open a new tab",
    src("src/components/header/CompactHeader.vue"),
    '@click.left.exact.prevent="$emit(\'home\')"',
    '@click.prevent="$emit(\'home\')"',
    vitest("src/components/__tests__/CompactHeader.spec.js"),
  ],
  [
    "mobile-375",
    "the logo icon is announced as well as the wordmark",
    src("src/components/header/CompactHeader.vue"),
    'alt=""\n            class="w-7 h-7 rounded-lg shadow-xs"',
    'alt="OmniQuery"\n            class="w-7 h-7 rounded-lg shadow-xs"',
    vitest("src/components/__tests__/CompactHeader.spec.js"),
  ],
  [
    "mobile-375",
    "the My Account link is shorter than 24px",
    src("src/components/header/CompactHeader.vue"),
    "flex items-center gap-1 min-h-6",
    "flex items-center gap-1",
    vitest("src/components/__tests__/CompactHeader.spec.js"),
  ],
  [
    "mobile-375",
    "a settings sheet button shrinks to 16px",
    src("src/components/header/CompactHeader.vue"),
    "w-11 h-11 min-w-[44px] min-h-[44px]",
    "w-11 h-11 !h-4 min-w-[44px]",
    vitest("src/components/__tests__/CompactHeader.spec.js"),
  ],
  [
    "mobile-375",
    "the draft card goes back below the Daily Target strip and KPI tiles",
    src("src/components/dashboard/SurveyorDashboard.vue"),
    ...moveBlockBelow(
      src("src/components/dashboard/SurveyorDashboard.vue"),
      "    <!-- Active draft quick-resume card",
      "    <!-- Not in any project yet",
      "    <!-- Quick Access to Filled Forms",
    ),
    vitest("src/components/__tests__/SurveyorDashboard.spec.js"),
  ],
  [
    "mobile-375",
    "Resume drops to a small 28px button",
    src("src/components/dashboard/SurveyorDashboard.vue"),
    'size="md"\n            :iconLeft="Play"',
    'size="sm"\n            :iconLeft="Play"',
    vitest("src/components/__tests__/SurveyorDashboard.spec.js"),
  ],
  [
    "mobile-375",
    "the short details label is split into two translated pieces again",
    src("src/components/dashboard/ProjectHeaderCard.vue"),
    "<span class=\"sm:hidden\">{{ __('Project details') }}</span>",
    "<span class=\"sm:hidden\">{{ __('Project') }} {{ __('details') }}</span>",
    vitest("src/components/__tests__/ProjectHeaderCard.spec.js"),
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
