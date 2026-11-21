# <span style="font-family:'Roboto',sans-serif;font-weight:900;"><span style="color:#4285f4;">Omm</span><span style="color:#34a853;">No</span><span style="color:#ea4335;">M</span><span style="color:#fbbc05;">i</span></span> OmniQuery — Product & Architecture Roadmap

> **Platform Mission**: End-to-End Enterprise Survey Design, Multilingual Field Collection, Zero-Loss Offline Sync, Survey Versions (v1, v2), and Downstream Business Intelligence Engine. Built natively on Frappe v16 and Frappe UI standards, completely aligned with the OmmNoMi design philosophy.

---

## 🏛️ Executive Identity & Brand Alignment

### 1. Correct Nomenclature & Brand Wordmark
- **Name**: **`OmniQuery`** (URL: `/omniquery` for PWA, `/desk/` for administrative views).
- **Brand Standards**: Follows strict OmmNoMi brand guidelines (`OmmNoMi Automation LLP`, Vibrant Palette: `#4285F4`, `#34A853`, `#EA4335`, `#FBBC05`, `#673AB7`).
- **Frappe Native UI Invariants**: Pure Frappe native design tokens, standard Frappe CardView layouts, zero conflicting CSS hacks, clean accessible component contracts, and `/desk/` navigation on Frappe v16.

---

## 🌊 Survey Versions & Native Frappe Amendment Lifecycle (`is_submittable: 1`)

### 1. The Immutability Guarantee
- Published survey templates have `"is_submittable": 1` and lock permanently upon submission (`docstatus = 1`).
- Eliminates mid-campaign schema drift where surveyors in the field submit responses against modified question definitions.

### 2. Frappe Default Submittable Amendment Lifecycle (`amended_from`)
- Follows 100% Frappe native submittable DocType amendment lifecycle: amending a published survey automatically creates an incremented version (`SURV-TMPL-001-1` &rarr; `SURV-TMPL-001-2`) linked via `amended_from`.
- **Zero Offline Rejection**: Field surveyors working offline in remote villages without connectivity continue collecting responses against Version 1. When returning online, both Version 1 and Version 2 responses are ingested cleanly without rejection.

---

## 🌍 4-Tier Scope Hierarchy & Question Masters

Questions and Option Sets are decoupled from monolithic surveys and governed by a 4-tier hierarchy:

1. **`Platform`**: Universal global questions (Full Name, Phone, Age, Gender, District, GPS, Yes/No, Likert 5-point). Pre-translated and available to all tenants.
2. **`Workspace`**: Organization-level standards shared across all projects within a tenant workspace.
3. **`Project`**: Scoped strictly to one project within the workspace.
4. **`Survey`**: Private, bespoke questions created for a specific survey.

* **Platform Promotion**: When system administrators notice common questions across workspaces, they can promote them to `Platform` scope.
* **Active Status Filtering**: Every Question and Option Set carries a `status` (`Active`, `Inactive`, `Draft`). Inactive records are suppressed from survey builders.
* **100% Frappe Native Translation**: Questions, option sets, and instructions use Frappe's native `locale/*.csv` and `Translation` DocType (`frappe._()`).
* **Per-Survey Mandatory Flexibility**: `is_mandatory` is defined per survey version in the linking table (`OmniQuery Template Question Reference`), not hardcoded on Master question.

---

## 🎛️ Pure Configuration Field Type Taxonomy (Zero CSS Hacks)

All UI elements are driven deterministically by schema metadata:

| Category | UI Variants & Capabilities | Schema Controls |
| :--- | :--- | :--- |
| **Choice (Single)** | Radio, Buttons, Switch (ON/OFF), Chips, Rating (Stars, Faces, Hearts, Thumbs with configurable 5/10 max and 1.0 or 0.5 step precision), Searchable Combobox (`f-combobox`) | `control_variant`, `options_set`, `rating_icon`, `rating_max`, `rating_step`, `default_value` |
| **Choice (Multi)** | Checkbox list, Multi-select chips, Grouped / Hierarchical category tags | `min_selections`, `max_selections`, `options_set` |
| **Numerical** | Integer, Decimal, Currency (with prefix ₹/$/€), Signed (+/-), Percentage, Range Slider with custom steps | `decimal_precision` (default `0`), `min_value`, `max_value`, `step`, `currency_symbol`, `allow_negative` |
| **Temporal** | Date, Time, DateTime, **Month-Year** (e.g. "Jan 2024"), **Year Only** (e.g. "2021"), **Day Only** | `temporal_granularity` (Date, Month-Year, Year, Day), `anchor_date_rule` (`First Day` e.g. `2024-01-01` or `Last Day` e.g. `2024-01-31` for seamless time-series chart plotting) |
| **Duration** | Hours:Minutes, Elapsed stopwatch timer, Days | `format`, `auto_stop` |
| **Geographic** | Latitude, Longitude, Pinpoint Map (Lat/Long + Accuracy), Polygon boundary capture | `precision`, `require_gps_accuracy_meters` |
| **Text Input** | Single-line Text, Small Text, Multi-line Textarea, Markdown / Rich text | `max_length`, `regex_pattern`, `placeholder` |
| **SubTable / Grid** | Tabular dynamic grid with child rows & columns, with support for nested sub-columns (e.g. Peak/Lean seasonal turnover breakdown) | `columns_schema_json`, `min_rows`, `max_rows` |
| **Media & Audio Interview** | Camera/Gallery Photo (`.webp`), Compressed Video (`.mp4`/`.webm`), and **Continuous Background Survey Audio Recording** (Floating header bar: `[🎙️ Record | ⏸ Pause / ▶ Resume | ⏹ Stop]` with automatic finalization & stop on survey submission) | `media_type` (Audio, Video, Photo), `media_source` (Live Camera/Mic or Gallery), `compression_quality`, `enable_interview_audio` |

---

## 🎙️ Ambient Audio Interview Recording & Stream Finalization

- **Floating Audio Header Control**:
  - `[🎙️ Record Interview | ⏸ Pause / ▶ Resume | ⏹ Stop]`.
  - Surveyors can conduct interviews while the device records ambient audio in low-bitrate Opus chunks (`.opus`/`.webm`).
  - Recorded chunks stream directly into IndexedDB (`OmniQueryDB.audio_blobs`) without interrupting response synchronization.
  - Automatically finalizes and locks the audio recording upon survey submission.

---

## 💾 Universal Disaster Recovery (Per-Survey & Bulk All-At-Once)

To guarantee **zero data loss under any technical failure** (server downtime, corrupted cache, device hardware issues):

1. **PWA Local Recovery Drawer**: Accessible via the top status pill at any time, even when completely offline, featuring **Per-Survey** and **Bulk All-At-Once** export modes.
2. **Dual-Scope Export Capabilities**:
   - **Per-Survey Export**: Extracts responses, answered fields, and media for a single active survey.
   - **Bulk Action Export (All At Once)**: Master one-click extraction of every survey, offline response, audio recording, and photo stored on the device.
3. **Multi-Format Export Options**:
   - **`JSON Export`**: Complete, cryptographic raw dump of IndexedDB (WAL, draft state, schema hashes).
   - **`XLSX Export`**: Formatted tabular workbook containing all responses, sections, and answered columns ready for Excel.
   - **`Comprehensive Forensic ZIP Bundle`**:
     - `survey_database_dump.json`: Raw IndexedDB WAL state.
     - `responses_spreadsheet.xlsx`: Tabular survey data (multi-tab in bulk mode).
     - `media/`: All captured photos (`.webp`), compressed videos (`.webm`/`.mp4`), and interview audio blobs (`.opus`).
     - `diagnostics/console_logs.txt`: Complete in-memory circular ring buffer of client console logs & errors.
     - `diagnostics/device_telemetry.json`: OS, browser engine, screen DPI, battery level, online/offline transition history, and storage quota utilization.
4. **Out-of-Band Sharing**: Web Share API / File Saver enabling surveyors to send the ZIP directly to supervisors via WhatsApp, Telegram, Google Drive, or Bluetooth.

---

## 📡 Continuous In-Flight Live Sync & Instant Error Beacon

1. **In-Flight Live Sync (`sync_draft`)**:
   - Keystrokes save instantly to local WAL (0ms).
   - When online, debounced background worker posts partial state to `sync_draft`.
   - Server updates `OmniQuery Response` as `Draft` in MariaDB without failing on mandatory fields, giving central supervisors real-time visibility at `/desk/omniquery-workstation`.
2. **Instant Error Beacon (`log_field_error`)**:
   - PWA catches unhandled promise rejections, script evaluation errors, or input parsing issues instantaneously.
   - Dispatches an asynchronous non-blocking error beacon (`navigator.sendBeacon('/api/method/omniquery.api.telemetry.log_field_error')`).
   - Stored in `OmniQuery Field Error Log` for real-time Project Admin triage.

---

## 🔐 SaaS Role Governance & Raven-Style In-App Contextual Membership

OmniQuery adopts a clean **Raven-style in-app membership architecture**: instead of polluting Frappe's global role namespace with dozens of granular roles, OmniQuery defines **only 3 global Frappe Roles**, while granular project permissions are governed by built-in Workspace & Project membership tables:

### 1. Global Frappe Permissions (`DocPerm` &mdash; 3 Roles Only)
- **`OmniQuery Admin`**: Platform super-admin; manages global settings, platform questions, fixtures, and tenant billing.
- **`OmniQuery Manager`**: Standard Frappe Desk role encompassing all Desk-based stakeholders.
- **`OmniQuery User`**: Mobile / Field role assigned to users who fill in survey forms in the PWA (`/omniquery`).

### 2. In-App Contextual Membership Model
- **`OmniQuery Workspace Member`**:
  - `user` (Link: `User`), `workspace_role` (`Workspace Admin`, `Workspace Manager`, `Workspace Member`).
- **`OmniQuery Project Member`**:
  - `user` (Link: `User`), `project_role`:
    - **`Project Admin`**: Full technical control; authors questions, configures scripts, tunes validation formulas, and publishes survey versions.
    - **`Project Manager`**: Operations lead; inspects survey structures in **read-only mode** with **continuous commenting & feedback privileges** on questions and sections; manages quotas, surveyor allocations, and collection pacing.
    - **`Project Analyst`**: Data researcher; read-only access to response data and telemetry for charts, Frappe Insights dashboards, and dataset exports (zero schema modification rights).
    - **`Project Viewer`**: Client executive observer; clean UI watching overall project KPIs, completion stats, and formal milestone reports.
    - **`Project User`**: Field enumerator collecting survey data in PWA.

---

## 🚀 Phase-Wise Implementation Roadmap

### Phase 1: Survey Versions, Master Scoping & 3 Global Roles
- [ ] Upgrade `OmniQuery Template` to `is_submittable: 1` with `amended_from` and `is_public_citizen_link`.
- [ ] Refactor `OmniQuery Question` to master DocType with 4-tier `scope`, `status`, `field_category`, `control_variant`, and `behaviour_script`.
- [ ] Create `OmniQuery Template Question Reference` child table with per-survey `is_mandatory`.
- [ ] Create `OmniQuery Option Set` master DocType with 4-tier scope.
- [ ] Implement `OmniQuery Workspace Member` and `OmniQuery Project Member` contextual tables.
- [ ] Define 3 Global Frappe Roles (`OmniQuery Admin`, `OmniQuery Manager`, `OmniQuery User`) in `DocPerm` with native `has_permission` hooks.

### Phase 2: In-Flight Live Sync, Audio Recording & Error Telemetry
- [ ] Implement `sync_draft` endpoint in `omniquery.api.sync` (partial upserts, bypassing mandatory constraints).
- [ ] Implement `log_field_error` telemetry beacon in `omniquery.api.telemetry` saving to `OmniQuery Field Error Log`.
- [ ] Integrate continuous Opus audio interview recorder in PWA header with `[🎙️ Record | ⏸ Pause / ▶ Resume | ⏹ Stop]`.
- [ ] Add session telemetry (`started_at`, `completed_at`, `active_filling_time_seconds`) and question pacing metrics.

### Phase 3: Universal Disaster Recovery Drawer & Multi-Format Exports
- [ ] Implement PWA local recovery drawer with instant JSON export of Dexie WAL.
- [ ] Implement XLSX export using SheetJS.
- [ ] Implement Comprehensive Forensic ZIP bundle using JSZip (raw WAL JSON + Excel + media blobs + console logs + device telemetry).
- [ ] Support out-of-band sharing via Web Share API.

### Phase 4: Desk Survey Designer (`/desk/omniquery-designer`) & Workstation
- [ ] Visual tri-pane survey designer on `/desk/omniquery-designer` with drag-and-drop questions and logic builder.
- [ ] High-density review console at `/desk/omniquery-workstation` with live draft monitoring and geospatial map inspection.
- [ ] Native Frappe Insights tabular mapping for downstream business intelligence.

### Phase 5: Automated Dual-Layer Testing & Verification
- [ ] Server test suite (`test_survey_versions.py`, `test_question_scope.py`, `test_mandatory_rules.py`, `test_in_flight_sync.py`, `test_permissions.py`).
- [ ] Client test suite via Vitest (`npm test`) covering UI controls, accessibility, audio recorder state transitions, and ZIP generation.
- [ ] Automated teardown assertions ensuring zero dev database pollution.

### Backlog
- [ ] **Phone number input: configurable digit count (follow-up to PR #75, which replaces closed PR #11).** #75 adds the `Phone` input type and rejects invalid values in `batch_push`. Once it lands, move the hard-coded 10-digit rule into `validation_rules_json` (`digits`/`pattern`, defaulting to Frappe's `PHONE_NUMBER_PATTERN`) so non-Indian numbers work. Then add paste normalisation (`+91`, leading `0`) and a digit counter. Conditional visibility is already handled by `conditional_logic_json`, so don't add `eval:` expressions or infer dependencies from label text ("If Yes…").
- [ ] **Manager rights from #60, project-scoped (moved out of PR #63, belongs with PR #112).** #60 asks for the Manager to create/write Surveyors, create Projects and Option Sets, and export Responses. PR #63 granted these as plain DocPerms, which made them site-wide across every client project, so they were dropped. Grant them only alongside `has_permission` + `permission_query_conditions` hooks on Response, Surveyor and Project that limit a manager to their own projects. `test_project_data_has_no_unscoped_bulk_rights` fails until those hooks exist.
- [ ] **Pre-existing: the `All` role has create/read/write on every OmniQuery Response.** Any logged-in user, website users included, can read and edit all responses through `/api/resource`. Scope it with the same Response `has_permission` hook as the item above.
- [ ] **Workspace fixture vs `install.py` drift.** `workspace/omniquery/omniquery.json` and `_get_workspace_shortcuts()` / `_build_workspace_content()` hold the same content twice. Generate one from the other, or add a test that they match.
- [ ] **"Collected Today" card relies on `captured_at_local`.** Responses entered in Desk without a capture time don't count. Default `captured_at_local` to `creation` on insert if it is empty.
- [ ] **Confirm a Frappe Cloud deploy builds the untracked bundle.** `omniquery/public/dist/` is no longer committed: `bench build` runs `yarn build` (vite) through `--run-build-command`, the same way Frappe CRM and Helpdesk ship. Deploy to the FC test site once and check that `/assets/omniquery/dist/omniquery.bundle.js` returns 200 before the next production deploy.
- [ ] **Coloured `<Button>`s render white on gray (#124).** 42 frappe-ui `Button`s carry `bg-<colour>` classes, which lose to the default variant's `bg-surface-gray-2`, so Exit and Resume Draft fail contrast. Use `variant="solid"` + `theme` instead and add a guard test that rejects `bg-<colour>-<n>` on `<Button>`.
- [ ] **TextInputs styled through `class` draw a box around the input (#125).** frappe-ui puts `class` on TextInput's wrapper, so border/bg/padding there wrap its own gray input in a second box. Survey text answers are fixed (`size="lg" variant="outline"`); 12 TextInputs in 6 files remain, counted in `test/guards/text_inputs.test.js`. The outline field edge is also 1.3:1 on white, too faint outdoors (WCAG 1.4.11 wants 3:1).
- [ ] **Finish aligning the frontend build with Frappe CRM / Helpdesk.** Move `src/` into `frontend/` with its own `package.json`, and make the root `package.json` `build`/`postinstall` delegate to it. Use `frappeui({ buildConfig: { indexHtmlPath: "../omniquery/www/omniquery.html" } })` so Vite writes hashed asset names into the page. That replaces the mtime `bundle_version` in `www/omniquery.py` and the copy in `api/survey.py` `get_service_worker` (with its hard-coded `20261005_v33` fallback), and lets `sw.js` precache the hashed files. The output stays gitignored.
- [ ] **An expired session quarantines good interviews (#127, found fixing PR #87).** On an `allow_guest` endpoint a lost session reaches `batch_push` as Guest, which answers 200 with every entry `REJECTED: "Batch push not permitted for Guest users"`. `markSynced` quarantines any `REJECTED`, so the sign-in alert from #87 never shows. Raise `frappe.AuthenticationError` there instead, so `failureKind` sees a lost session.
- [ ] **A draft cleared to no answers keeps its old answers on the server (#128, PR #87).** #87 saves the cleared draft locally as `{}`, but `syncAllDrafts` skips a draft with no items, so the server copy and other devices still show the removed answers.
- [ ] **The recovery ZIP omits audio that compaction pruned (#129, PR #87).** `FilledFormsModal.vue` packs only blobs still in IndexedDB. List each server-side recording (file URL) in the archive's manifest instead.
- [ ] **`forceSyncAll` summary messages are English only (#130, PR #87).** "Synced {n} queue item(s)…", "Sync error: …" and "Sync already in progress" in `useWAL.js` need `__()`, `hi.po` and `CORE_HINDI`.
- [x] **The project page header changed after load and showed the workspace's raw id (#16).** Templates carried no project status, so the badge showed an invented "Active Field Project" and then the real status; and `enrich_template_meta` fell back to the workspace id (e.g. OQW-001) when a workspace had no title. Templates now carry `project_status`, `workspace_title()` in `api/survey.py` is the one rule (title, else name, never the id) for templates and `get_project_details`, and the badge goes through `__()`. Fixed in PR #69.
- [x] **Two projects that share a title showed as one card, hiding the second project's surveys (found fixing PR #68).** The catalog's project cards were keyed by title, so OQP-001-126 and OQP-001-127 on ommnomi.local could not be picked. Cards are now one per project, and cards whose titles collide show the project's id. Fixed in PR #68.
- [x] **The dashboard counted every project's submissions for a project with no templates (found fixing PR #68).** `refreshLocalMetrics` skipped the project filter when the project had no templates, the same bug as #15. The catalog, cards, project page, dashboard and offline download now share `utils/projectTemplates.js`, so their counts agree. Fixed in PR #68.
- [x] **A recording that could not be read was uploaded empty and marked synced (found fixing PR #84).** `syncPendingAudio` swallowed the `fileToBase64` error and sent `""`, so the device dropped the real audio. It now stays pending and the failure is logged. Fixed in PR #84.
- [ ] **Move the PWA lint to Node 20+ and ESLint 10 (PR #84).** The shell's Node is 18, so `eslint.config.js` runs on ESLint 9, which npm marks as no longer supported. ESLint 10 needs Node ^20.19, as Frappe Builder's frontend uses. Bump the dev Node, then ESLint, `eslint-plugin-vue` and `vue-eslint-parser` together.
- [ ] **224 PWA strings render in English in Hindi mode (#131, found checking PR #84).** 239 `__()` strings under `src/` have no `msgid` in `hi.po`, and 224 of those are not in `CORE_HINDI` either; the Success screen and catalog buttons are among them. Run `bench generate-pot-file` + `bench update-po-files --locale hi`, translate, and add a guard that every `__()` string has a `hi.po` msgid.
- [ ] **A Geolocation question never records its answer, and only that question asks for a location (#132, found fixing PR #80).** `captureGPS` keeps the fix in `useGPS` and never calls `setResponse`, so "Location captured" never shows and a mandatory Geolocation question stays unanswered. A survey with no Geolocation question never asks for a location at all. Answer the question with `{latitude, longitude, accuracy}`, then decide whether an interview asks for its location when it starts.
- [ ] **An interview's location is lost on reload and missing from the background draft sync (#133, PR #80).** The location is held only in memory. Save `gpsReport` with the draft in `db.responses`, restore it on resume, and send it from `sendUnsyncedDrafts`. PR #80 already makes the server keep a stored fix when a sync carries none.
- [ ] **Stop accepting pre-#25 idempotency keys once no old build is in the field (PR #78, #134).** `services/idempotency.py` still takes `OQS-…` and `WAL-…` keys as sent, because devices on older builds hold them in their WAL queue and saved drafts, and a FAILED audit log replays under its own key. When the oldest supported build makes UUIDv4 keys, drop `LEGACY_KEY_PREFIXES`, its test in `test_idempotency_key.py`, and the `OQS-` prefix in `test_legacy_payload_adapter.py`.
- [x] **Every `TestSyncConcurrency` run left a template, a Response and an audit log behind (found fixing PR #78).** `tearDown` deleted without committing, so the last test's delete was rolled back; 170 leftover "Sync Concurrency Test" templates had built up on ommnomi.local. It now commits, and `tests/utils.sync_records_of(template)` finds a test's Responses and logs by its own template, since UUID keys share no prefix.
- [x] **Answers in a grouped card or Focus Mode were saved under "[object Object]" (#135, found fixing PR #77).** `Survey.vue` passed the emitted `{ code, value }` object to `setResponse(code, value)`, so the real question stayed unanswered. PR #77 unpacks it on both, and a Survey.vue test plus two mutants guard the wiring.
- [ ] **`test_idempotent_sync` leaves its Responses behind when an assertion fails (#136, found fixing PR #77).** It cleans up at the end of the test body, and `batch_push` commits, so a failed run leaks Responses. 17 of them broke `test_schema_compiler`'s cleanup with LinkExistsError. Move the cleanup into `tearDown`/`addCleanup` and commit.
- [ ] **`bench migrate` rewrites `desktop_icon/omniquery.json` (found fixing PR #77).** Each migrate changes only its `creation`/`modified` stamps, which then shows as a change in the app. Find which sync writes it back and stop it, or keep reverting the stamps before a commit.
- [ ] **Matrix questions ignore `rows_schema_json` / `columns_schema_json` (#119).** ARCHITECTURE.md and this roadmap promise schema-driven matrices, but `MatrixQuestionCard.vue` builds rows and columns from `question_code` keywords or from `rows`/`columns` props that nothing passes. A designer-defined matrix renders the wrong grid. Read the two JSON fields first and keep the keyword table only as a fallback for old questions.
- [x] **Matrix renders its table and its card layout at once (#118).** Both were in the DOM and CSS hid one, so every cell existed twice, and the jump to the first unanswered question (`scrollAndHighlightQuestion`) took the first input in DOM order: on a phone that was the hidden table's. `MatrixQuestionCard` now renders only the layout on screen (`v-if` on `useScreenIsWide()`, a shared `useBreakpoints(breakpointsTailwind).greaterOrEqual("sm")` as frappe-ui's Sidebar reads it), and when a phone turned on its side or a resized window swaps the layout, focus (on a cell or its stepper button) moves to that cell in the new layout and the page scrolls to it. The breakpoint is one listener for every matrix: with one each, the focused matrix swapped and scrolled before the ones above it grew, which left the cell below the screen. The specs answer each media query against a screen width through the shared `fakeScreen` (`src/test/matchMedia.js`, which the theme and reduced-motion specs use too), so a wrong breakpoint fails.
- [x] **Focus mode steals focus 60 ms after opening (#120).** `FocusModeModal.focusCurrentQuestion` focused the question again on a timer, so a surveyor who tabbed or clicked within that window was pulled back. It now focuses once, from a watcher on the question card's ref: the card is keyed per question, so the ref changes on opening and on each move, and Vue sets it only after the card has mounted. frappe-ui 0.1.278's `Dialog` does not pass on reka's `open-auto-focus`, so reka still focuses Exit Focus Mode for a moment before the question takes it. An answer's 220 ms auto-advance is dropped when the user moves focus out of the question (to the mode menu, Previous or Exit), since the next card would take focus from there.
- [x] **Focus mode's auto-advance fires after focus mode closes (#152).** `FocusModeModal` stays mounted in Survey.vue, and nothing cancelled `advanceTimer` when `isOpen` turned false, so closing focus mode within 220 ms of an answer still emitted `next-question` and moved the section's focus index behind the user's back. Both of focus mode's timers (the 220 ms auto-advance and the 350 ms double-press lock on Next) are now VueUse `useTimeoutFn`s, which stop when focus mode unmounts, and both stop when the dialog closes. That is a `dialogOpen` computed, `isOpen && Boolean(currentQuestion)`, which the dialog's `modelValue` uses too, so focus mode closing because its question went away drops them as well. The question card renders only while there is a question, since the dialog's leave transition still rendered it with `currentQuestion` null and threw.
- [x] **Focus mode disappears without closing when its question goes away (#154).** The dialog shows on `isOpen && Boolean(currentQuestion)`, so switching Full Form off past the hidden questions, or finishing into a section whose questions are all hidden, closed it while `s.isFocusMode` stayed true, and the mode menu still showed Focus form on. `useSurveyApp` now watches `activeQuestions` while focus mode is on: within a section it keeps `focusQuestionIndex` on the same question, or the next one still shown (by template order), or the last; an empty list turns `isFocusMode` off. Finishing a section in focus mode goes on past sections whose questions are all hidden, as Next on each would.
- [ ] **App.spec's "focuses the heading of a new survey opened by a link" times out under load (#156).** It failed once in a full run at 1255 ms, past `vi.waitFor`'s 1 s default, and passes on its own. Give that wait a longer timeout, or wait for the survey to load before checking focus.
- [ ] **Finishing a section that fails validation sends focus mode back to question 1 (#155).** `onFocusModeFinishSection` sets `focusQuestionIndex` to 0 even when `nextSection()` refuses to leave the section. Reset it only when the section changed, and otherwise go to the first question with an error.
- [ ] **Let frappe-ui's Dialog own focus mode's first focus.** frappe-ui 1.0 (`Dialog.vue` `handleOpenAutoFocus` + `useAutofocusOnOpen`) focuses a descendant `[autofocus]` on open and stops reka focusing the first tabbable. When OmniQuery moves to it, mark the question `autofocus` and drop the ref watcher's first focus, which also removes the moment on Exit Focus Mode.
- [ ] **PRs 73–76 still call `searchInputRef.value.focus(...)` (#117).** frappe-ui `TextInput` has no `focus()`; it exposes its input element as `el`. Those branches throw on the quick search's Arrow/Backspace/typeahead paths until they take `focusSearch()` from `fix/questioncard-search-focus`.
- [x] **Every `el.$el || el` ref on a frappe-ui Button was a text node (#117).** Button renders a fragment, so its `$el` is the anchor text node, and its `rootRef` is set only after the parent's ref callback runs. Arrow keys and focus moves did nothing in question card options, combobox scrolling, currency chips, rating, button scale and grouped cards. Fixed on `fix/questioncard-search-focus`: refs keep the component and read `rootRef` at use; `test/guards/component_element_refs.test.js` bans both forms.
- [x] **Clear-search button covered the typed text (QuestionCard, Catalog).** frappe-ui `TextInput` computes its prefix/suffix padding once from its slots, so a `#suffix` behind `v-if` that appears on the first keystroke never gets `pe-10`. Fixed by always passing the slot with the `v-if` on the Button inside; `test/guards/text_inputs.test.js` bans a conditional slot. Upstream frappe-ui candidate.
- [ ] **One client's workspace, project and survey ship as fixtures and come back on every migrate (#139, found fixing PR #67).** `hooks.py` lists them as fixtures and `seed_shg_survey.py` builds them from code, and fixture sync force-imports, so every site gets them and a deleted one returns on the next migrate. Move them to a one-off seed or a demo-data command, then take both files off the allowlist in `test/guards/no_customer_content.test.js`.
- [ ] **A Dynamic Grid followed by lettered questions never renders (#140, found fixing PR #67).** `layoutQuestions` turns the grid into a group heading over the following labels that match `/^[a-z][.\s]/i`, so the grid itself is dropped (the SHG survey's `activity_involvements`), and a label like "I am…" is swallowed too. Render the grid as its own matrix card and group only questions that set `group_code`.
- [x] **The project page lost its helpline and SOPs offline (found fixing PR #67).** `useSurvey` dropped the help fields from the cached templates, and a `get_schema` download overwrote the cached row with a payload that has no project fields. Both now keep `projectHelp()`; a `useSurvey.spec` test and two mutants guard it.
- [x] **The project page's tabs were buttons with no tab semantics, overflowed on desktop and showed the helpline twice (#17).** PR #70 uses frappe-ui `Tabs` (one tab stop, arrow keys, labelled panels), shows the helpline and support email once in the header, drops the tab strip when there is only the survey list, and rings tabs and panels in the shared focus token. `playwright/tests/project_tabs.spec.js` checks keyboard order and overflow at 1280 and 375 px.
- [x] **Sticky headers and tab strips never stuck (#141, found fixing PR #70).** `overflow-x: hidden` on `#app` and the App.vue shell made both scroll containers, so `CompactHeader`, the grouped and matrix question headers and the project tab strip scrolled away. `#app` now uses `overflow-x: clip` (hidden only where clip is unsupported) and the shell has no overflow; `test/guards/sticky_ancestors.test.js` (with mutants) walks up from every sticky element so nothing above one scrolls, and `playwright/tests/project_tabs.spec.js` scrolls the Guide tab and checks the header stays at 0 with the strip under it.
- [x] **Sticky strips were a few pixels off the header (#146, found fixing #141).** The 53px header and the `top-[52px] sm:top-[56px]` strips left a 1px overlap on a phone and a 3px gap on desktop. `--app-header-height` in main.css now sets the header's height and every sticky top, html's scroll padding keeps revealed rows clear of the header and the section footer, and a card's sticky header sets its rows' scroll margin. `useRevealInPage` replaces the hand-measured footer scroll in QuestionCard and GroupedQuestionCard. Fixed in PR #148, with `playwright/tests/survey_card_headers.spec.js`.
- [x] **Arrow keys in a matrix never scrolled the focused cell into view (found fixing #146).** `MatrixQuestionCard` focused the next cell with `preventScroll` and nothing else, so arrowing down a long matrix moved focus off screen. It now reveals the cell with `useRevealInPage`. Fixed in PR #148.
- [x] **`no-scrollbar` was used but defined nowhere (#142, found fixing PR #70).** The project carousel and the filled-forms chip strip drew a scrollbar. `no-scrollbar` is now one utility in `src/styles/main.css`, the project tab strip uses it through a variant, the filter chips wrap instead of scrolling, and `test/guards/template_classes.test.js` builds the CSS and fails on any template class that nothing defines.
- [ ] **About 100 template classes build nothing (#145, found fixing #142).** frappe-ui's preset has no `shadow-xs`, `shadow-2xs`, `shadow-inner` or `rounded-3xl`, and nothing defines `animate-fade-in`, `pb-safe` or `dropdown-content`, so cards lose their shadow and rounding, `SectionCard`'s fixed footer gets no safe-area padding, and the blue-950 dark shades stay unset. `DEAD_CLASS_ALLOWLIST` in `test/guards/template_classes.test.js` lists them per file by name and count (FilledFormsModal 18, SurveyorDashboard 13, MatrixQuestionCard 10 the most). The old palette-shades guard is folded into it. Map each to a step the preset has or define it once in main.css, then shrink the list.
- [x] **The dashboard, catalog and project page said the same thing several times (#18).** The project description fell back into every survey card, the title and grantor came back as the description and workspace, the draft card named its survey twice, and Resume and Start New showed on both the draft card and the catalog card. `addsFact` in `src/utils/text.js` hides a label the screen already shows, `latestDraft` in `src/utils/drafts.js` is the one pick of the draft the dashboard resumes (the catalog offers Start New for it, not a second Resume), the project page says Start Survey like the catalog, and `survey.project_description()` sends the Text Editor description as plain text. Fixed in PR #71.
- [ ] **The project page shows an invented "Standard Field Investigator Protocol" pill (#143, found fixing PR #71).** No project field backs it, like the made-up supervisor #14 removed. Show the project's own SOP state (linking to the Guide tab) or drop it, with its CORE_HINDI and hi.po strings.
- [ ] **Catalog cards repeat the selected project under every survey (#144, found fixing PR #71).** With the catalog filtered to one project, each card's workspace · project line repeats the dashboard header. Show it only for all projects, or pass it through `addsFact`.
- [ ] **Upstream frappe-ui: `Tabs` has no tablist `aria-label` and no focus ring (found fixing PR #70).** The app rings them in main.css. Open a frappe-ui issue/PR with a reproduction, then drop the local rule once a release has it.
- [ ] **Run the Playwright spec in a bench with a test user (PR #70).** `frappe/playwright/support` logs in `TEST_USER` (`frappe@example.com`), which ommnomi.local does not have, so `project_tabs.spec.js` and `survey_card_headers.spec.js` have only been listed, not run, here. Run it on a site that has the Frappe UI-test user (as `bench run-ui-tests` sets up) before relying on it.

---

<small>© 2026 OmmNoMi Automation LLP · Mahunag · Karsog · Mandi, HP, India</small>
