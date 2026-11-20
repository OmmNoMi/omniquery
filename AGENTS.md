# OmniQuery agent notes

Read CONTRIBUTING.md and ARCHITECTURE.md first. This file holds Frappe framework behavior that
cost real time to learn. Add to it when you learn something new.

## Frappe 16 Desk sidebar and desktop icon

- The app sidebar is a module-level `Sidebar` doc at `omniquery/omniquery/sidebar/omniquery/omniquery.json`.
  Frappe ignores flat `workspace_sidebar/*.json` files. The `Workspace Sidebar` doctype is an
  inert archive. It refuses writes outside migrate, so never write to it from install code.
  `test/guards/one_module_sidebar.test.js` makes sure only one sidebar file exists.
- `resolve_sidebar(shell, user)` shows each user only the items they can read, so the sidebar
  needs no role list of its own. One upstream gap: a Section Break whose links were all filtered
  out still shows as an empty header (upstream candidate).
- Desktop icon visibility follows the icon's `roles` (Has Role) first. The Apps screen entry
  needs `has_permission` in `add_to_apps_screen`. Both use `DESK_APP_ROLES` from `permissions.py`.
- The Desktop Icon `link_to` is a Dynamic Link to the Workspace Sidebar archive. A fresh site has
  no archive row, so save it with `flags.ignore_links`, as Frappe does for its own icons.

## frappe-ui components and the browser

- A ref on a frappe-ui component holds the component, not its element. `TextInput` exposes its
  input element as `el` and `Button` its button as `rootRef`; neither has a `focus()` of its own.
  `src/components/__tests__/FocusThroughFrappeUI.spec.js` covers every place we focus one.
- `Button` renders a fragment, so its `$el` is the text node Vue anchors it with, not the button,
  and `rootRef` is still unset when the parent's `:ref` callback runs. Store the component
  (`refs[i] = el`) and read `refs[i]?.rootRef` where you focus, compare or scroll.
  `test/guards/component_element_refs.test.js` bans `$el` and a `rootRef` read in a ref callback.
- `TextInput` decides its prefix/suffix padding once from `useSlots()`, which is not reactive. A
  `<template v-if #suffix>` that appears later gets no padding and the text runs under it. Always
  pass the slot and put the `v-if` on its content (upstream frappe-ui candidate);
  `test/guards/text_inputs.test.js` enforces it.
- `TextInput` sets `inheritAttrs: false`: `class` and `style` land on its wrapper div, every other
  attribute on the input. Style it through `size`, `variant` and the `#prefix`/`#suffix` slots
  (as Catalog.vue's search does), not a class string.
- Chrome blurs a focused element when it is removed from the DOM (a `focusout` with no
  `relatedTarget`); jsdom does not. Move focus somewhere that stays before filtering out the
  element that holds it, and assert that order in the test, since jsdom will not catch it.
- frappe-ui `Tabs` (reka-ui) brings the tablist, roving tabindex and arrow/Home/End keys, so
  never hand-roll a tablist. A left click selects on `mousedown`, not `click`. The tablist itself is
  the one tab stop and hands focus to the selected tab, so every tab starts at `tabindex="-1"`.
  Inactive panels stay in the DOM with `hidden`, so query `[role=tabpanel]:not([hidden])`. Its
  root is `overflow-hidden`, which clips a sticky strip; override it with `!overflow-visible`. It
  takes no `aria-label` for the tablist and draws no focus ring on its tabs or panel (both are
  upstream frappe-ui candidates); `src/styles/main.css` rings `[role=tab]` and `[role=tabpanel]`,
  and `test/guards/focus_rings.test.js` checks it.
- `overflow-x: hidden` on `#app` and the App.vue shell makes them scroll containers (computed
  `overflow-y: auto`), so `position: sticky` never sticks anywhere in the PWA (#141). Use
  `overflow-x: clip`; never put overflow on html (`test/guards/scroll_lock.test.js`).
- frappe-ui's Tailwind preset replaces whole scales rather than extending them. `borderRadius`
  stops at `2xl`, `boxShadow` has no `xs`, `2xs` or `inner`, and a class from a missing step
  builds nothing, with no warning from Vite or ESLint. A utility of our own (`no-scrollbar`) goes in
  `@layer utilities` in `src/styles/main.css`, so variants such as `[&>[role=tablist]]:` reach it.
  `test/guards/template_classes.test.js` builds the CSS and fails on a template class nothing
  defines; its allowlist lists each file's dead classes by name and only shrinks (#145).
  `content.relative` in `tailwind.config.cjs` keeps the build from depending on the cwd.

## Tests

- After `frappe.set_user` inside a test, also call `frappe.local.request_cache.clear()`. Frappe
  request-caches values like the permitted workspaces, and a test switches users inside one
  request, so the second user would otherwise see the first user's results.
- In developer mode, `frappe.delete_doc` on a standard doc (Desktop Icon, Workspace) also
  deletes its shipped JSON file. To remove one in a test, use `frappe.db.delete` and delete the
  child rows too.
- When you change a shipped doctype or fixture JSON, bump its `modified` so migrate syncs it.
- `batch_push` and `sync_draft` call `frappe.db.commit()`, so the test class's rollback cannot
  undo what they wrote. A test that calls them deletes its rows in `tearDown`/`tearDownClass` and
  commits that delete; an uncommitted delete is rolled back with the test and the rows stay.
- Response names are UUIDv4 keys (#25), so no name prefix finds a test's rows. Give each test
  class its own template and clean up with `tests/utils.sync_records_of(template)`. Make keys with
  `services/idempotency.new_key()`; the Response refuses any other key outside `OQS-`/`WAL-`.
- `yarn test` runs ESLint over `src/` (`test/guards/eslint.test.js`, rules in `eslint.config.js`;
  `yarn lint` runs it alone). `no-undef` finds a name used without an import, and `no-empty` an
  empty block. A catch that means to ignore an error says why in a comment, which `no-empty`
  accepts; one that hides a real failure logs it or shows a toast. The repo's `.eslintrc` is the
  Frappe boilerplate for Desk JS and does not cover the PWA.
- `src/test/setup.js` swaps in Node's `Blob` so fake-indexeddb can clone recordings, and a blob
  read back from it is a Node Blob, which happy-dom's `FileReader` refuses. The setup converts it
  for `readAsDataURL`. Without that, an audio test only passes when upload code ignores the error.
- `frappe.delete_doc(..., force=True)` skips the link check, so a test that deletes a template
  under a Response leaves an orphan Response behind, and cancelling a submitted template then
  fails on it. Clean up a test project's Responses by `project`, before its templates.
- vitest 3.2.7: `mockReset()` or `mockClear()` followed by `mockRejectedValue` (or an async
  throw) fails the test even when the code catches the rejection. Don't reset such a mock in
  `beforeEach`; give each test a fresh mock (`vi.stubGlobal("fetch", vi.fn().mockRejectedValue(...))`).
- Copy to the clipboard with VueUse `useClipboard({ legacy: true })`. Its `copy` rejects when the
  browser refuses, so catch it and show `toast.error`. The PWA has no `frappe.show_alert`; use
  frappe-ui `toast`.
- Browser tests are Playwright, run by `bench --site <site> run-ui-tests omniquery --headless`.
  Frappe 16 picks Playwright for an app that has a `playwright.config.*` (Cypress is deprecated
  there) and runs `frappe/node_modules/.bin/playwright test` in the app with `BASE_URL`,
  `ADMIN_PASSWORD` and `NODE_PATH=frappe/node_modules`. ESM imports ignore `NODE_PATH` and this
  app's package.json is `"type": "module"`, so the config is `playwright.config.cjs` and
  `playwright/package.json` sets `"type": "commonjs"`. Specs import `test`/`expect` from
  `../../../frappe/playwright/support/index.js`, which logs in `TEST_USER` (default
  `frappe@example.com`) with `ADMIN_PASSWORD`, so that user must exist on the site.

## frappe-ui answer choices and TextInput

- A frappe-ui `Button`'s colour comes from `variant` and `theme`, not `bg-*`/`text-*` classes,
  and only theme gray is built from light/dark tokens. For an answer choice use
  `choiceButtonProps(selected)` from `src/utils/choiceButton.js`: an outline gray Button, plus
  the `choice-selected` class when selected, a pale green card with dark green text and a thick
  green edge set in `src/styles/main.css` for light and dark mode (solid gray was too heavy on a
  phone, a light gray fill too faint outdoors). Draw anything inside a choice in `currentColor`.
  `test/guards/button_variants.test.js` enforces it and checks the contrast.
- `TextInput` has `inheritAttrs: false`. `class` and `style` go on its wrapper `<div>`, and
  every other attribute (`aria-label`, `placeholder`) goes on the `<input>`. So focus classes on a
  `TextInput` do nothing, and border, background, padding, height and text classes draw a second
  box around frappe-ui's own input. Use its `size`/`variant` props (a survey answer is
  `size="lg" variant="outline"`), and keep `class` to layout (width, margin, flex).
  `test/guards/text_inputs.test.js` enforces it, with a shrinking per-file count.
- A group of answer choices names itself with `aria-labelledby` pointing at the question's label,
  not a second `aria-label` (`aria-labelledby` wins, so the other is dead text that drifts), and
  marks the label's `*` `aria-hidden`. ARIA 1.2 allows `aria-required`, `aria-invalid` and
  `aria-errormessage` on a `radiogroup` but not on a `group` (a multi-select), so a group says
  "Required" and its error through `aria-describedby`. `choiceGroupState()` in
  `src/utils/choiceGroup.js` returns the right set for either; `test/guards/choice_group_names.test.js`
  checks every group is named once. In Vue 3 an aria attribute bound to `false` renders as
  `"false"`, not removed, which is what `aria-required` and `aria-invalid` want.

## Offline queue and IndexedDB

- A response's `synced` is stored as `SYNCED` (1) or `NOT_SYNCED` (0) from `src/services/db.js`,
  never `true`/`false`: IndexedDB cannot index a boolean, so a boolean row drops out of
  `where("synced")`. `test/guards/synced_encoding.test.js` enforces it on every `db.responses` write.
- A failed frappe-ui `call()` throws an Error carrying `status`, `exc_type` and `messages`.
  `failureKind(err)` in `useWAL.js` sorts it: 401/403 and Frappe's auth exc_types are a lost
  session (`needsLogin`), 417 (`ValidationError`) and other 4xx a refused submission, 5xx a 30s
  backoff, no status the network. Reuse it rather than reading `err.status` again.
- An acknowledged WAL entry is deleted, not kept as "synced"; its audio stays for
  `syncPendingAudio`. An entry the server did not answer stays pending as it was.
- A project's helpline and SOPs ride on each cached template (`src/utils/projectHelp.js`, from
  `survey.project_help`). `get_schema` sends no project fields, so `cacheTemplateLocally` merges
  the cached row under the payload rather than replacing it.
- Frappe sanitizes a Text Editor field on save only; `db_set`, data import and SQL skip it. Any
  stored HTML the PWA renders is sanitized on read with `sanitize_html(..., always_sanitize=True)`.
- A Text Editor field the PWA shows as text goes through `frappe.core.utils.html_to_plain_text`
  on the server (`survey.project_description`). It puts a space either side of an inline tag
  (`<strong>micro</strong>-enterprises` gives "micro -enterprises"), so compare its output with
  whitespace collapsed, and keep the field free of mid-word formatting.
- Fixture sync force-imports, so a record listed in `hooks.fixtures` comes back on every migrate,
  even after a site deletes it. Never ship a client's own records as fixtures (#139).
- Test sync against frappe-ui's `call()`, mocked with
  `vi.mock("frappe-ui", async (importOriginal) => ({ ...(await importOriginal()), call: vi.fn() }))`,
  and `createWAL()` called outside a component, which starts no listeners or interval.
