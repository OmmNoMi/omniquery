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

## Tests

- After `frappe.set_user` inside a test, also call `frappe.local.request_cache.clear()`. Frappe
  request-caches values like the permitted workspaces, and a test switches users inside one
  request, so the second user would otherwise see the first user's results.
- In developer mode, `frappe.delete_doc` on a standard doc (Desktop Icon, Workspace) also
  deletes its shipped JSON file. To remove one in a test, use `frappe.db.delete` and delete the
  child rows too.
- When you change a shipped doctype or fixture JSON, bump its `modified` so migrate syncs it.

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
- Test sync against frappe-ui's `call()`, mocked with
  `vi.mock("frappe-ui", async (importOriginal) => ({ ...(await importOriginal()), call: vi.fn() }))`,
  and `createWAL()` called outside a component, which starts no listeners or interval.
