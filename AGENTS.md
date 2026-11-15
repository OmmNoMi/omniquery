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
