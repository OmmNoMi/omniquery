# <span style="font-family:'Roboto',sans-serif;font-weight:900;"><span style="color:#4285f4;">Omm</span><span style="color:#34a853;">No</span><span style="color:#ea4335;">M</span><span style="color:#fbbc05;">i</span></span> OmniQuery — Product & Architecture Roadmap

> **Platform Mission**: End-to-End Enterprise Survey Design, Multilingual Field Collection, Zero-Loss Offline Sync, and Downstream Business Intelligence Engine. Built natively on Frappe v16 and Frappe UI standards, completely aligned with the OmmNoMi design philosophy (like OmniTrack).

---

## 🏛️ Executive Identity & Brand Alignment

### 1. Correct Nomenclature & Brand Wordmark
- **Name Correction**: Migration from legacy `OmniServey` to **`OmniQuery`** (URL: `/omniquery`).
- **Brand Standards**: Follows strict OmmNoMi brand guidelines (`OmmNoMi Automation LLP`, Vibrant Palette: `#4285F4`, `#34A853`, `#EA4335`, `#FBBC05`, `#673AB7`).
- **Frappe Native UI Invariants**: Follows the OmniTrack architectural paradigm—utilizing pure Frappe native design tokens, standard Frappe CardView layouts, zero conflicting CSS hacks, and clean accessible component contracts.

---

## ♿ Accessibility & Rapid Field Entry (WCAG 2.2 AAA Focused)

### [Implemented] Dynamic Table / Asset Row Focus Invariant
- **Problem**: In repeating grid structures (Equipment, Assets, Seasonal Turnovers), pressing `+ Add Item / Asset` created a DOM element but left keyboard/screen-reader focus on the button. The surveyor had to manually tab or reach across the screen to find the newly inserted row.
- **Solution**:
  - `focusNewGridRow(code)` programmatically shifts DOM focus to the first actionable control (`input`, `select`) of the newly appended row inside `Vue.nextTick()`.
  - WAI-ARIA live region immediately announces: *"New item row added. Focus shifted to first input."*

### [Implemented] Pre-Populated Grid Governance (Zero-Omission Design)
- **Problem**: Fixed survey matrices (e.g. Seasonal Turnovers with Peak, Average, and Lean seasons; Activity Involvements across 6 standard activities) rendered as blank item-adder grids, risking surveyor omission.
- **Solution**:
  - Strict configuration-driven tables (`GRID_CONFIGS`) automatically pre-populate mandatory rows:
    - **☀️ Peak Season** (Duration: 3 months, Monthly Sales ₹, Monthly Net Profit ₹)
    - **⛅ Average / Normal Season** (Duration: 6 months, Monthly Sales ₹, Monthly Net Profit ₹)
    - **🌧️ Lean Season** (Duration: 3 months, Monthly Sales ₹, Monthly Net Profit ₹)
    - **Activity Involvements**: 6 standard enterprise activities pre-populated.
    - **Capital Sources & Loan Usages**: 14 standard institutional & non-institutional sources pre-populated.
    - **Business Metric Changes**: 4 core financial metrics pre-populated.

### [Implemented] Numeric Hotkey Selection for Rapid Enumeration (1–99)
- Rapid single and dual-digit keyboard selection for single-choice and multi-select options.
- 450ms multi-digit accumulator with high-contrast hotkey badges and input focus shielding.

### [Implemented] Adaptive Long-List Search & Responsive Option Containment (>7 Options)
- Automatic search filter box whenever a question has >7 options or is displayed on compact mobile viewports.
- Real-time substring matching, scroll containment (`max-h-[380px]`), and dynamic hotkey re-indexing `[1]`, `[2]`, `[3]`.

### [Implemented] Semantic Option Grouping & Group-Level Multi-Select
- Horizontal swipeable group chips for heterogeneous lists (e.g., Farm vs Wages vs Enterprise income).
- Live selection counters per category chip and batch group selection/clear controls.

---

## 🛠️ Desk Survey Designer & Admin Governance (Frappe Native)

### 1. Visual Form & Survey Designer in Frappe Desk (`/app/omniquery-designer`)
- **Tri-Pane Layout Architecture**:
  1. **Left Component Palette**: Draggable / clickable question widgets organized by category (Choice, Financial, Matrix, Sensors, Multimedia).
  2. **Center Canvas**: Interactive survey flow with live preview, drag-and-drop question reordering, section cards, and page break markers.
  3. **Right Properties Inspector**: Deep configuration panel for the currently selected question or section.
- **Comprehensive Control Palette**:
  - `Single Select`: Radio cards, pill chips, or dropdown with search threshold.
  - `Multi Select`: Checkbox lists with category groupings and batch toggles.
  - `Numeric / Currency`: Formatted inputs with Indian currency masking (₹), min/max constraints, and auto-computed step increments.
  - `Range Slider`: Visual sliders with dual endpoints and stepped tick marks.
  - `Matrix / Grid Table`: Repeating or fixed tabular rows with row-level calculations (e.g. Sales, Costs, Net Profit).
  - `Geolocation & Geo-fence`: High-precision GPS capture with accuracy circle indicators and geofence boundary warnings.
  - `Watermarked Camera`: Image upload control with client-side canvas GPS/timestamp stamping and private file upload.
  - `Digital Signature`: HTML5 canvas signature pad with clear, undo, and stroke smoothening.
  - `Barcode / QR Scanner`: Camera-based rapid barcode and QR code decoding.
  - `Computed Formula`: Read-only expression fields evaluated reactively (e.g., `profit = sales - expenses`).
- **Interactive Logic & Skip Builder**:
  - Visual conditional rule builder generating standard Frappe `depends_on` and `mandatory_depends_on` expressions without custom javascript injection.
  - Support for multi-clause conditions (`AND` / `OR`), numerical comparisons (`>`, `<`, `==`), and list memberships (`in`, `not in`).
- **Pre-Populated Grid Configurator**:
  - In-designer table row preset manager (e.g. defining default rows for Peak, Average, and Lean seasons; Activity Involvements; Loan Usages).
  - Column aggregation settings (Auto-Sum, Average, Weighted Total) rendering directly in table footers.

### 2. Centralized Multilingual Translation Studio
- **Frappe Translation Console**: Side-by-side translation grid embedded directly within the survey designer.
- **Dialect Coverage**: Native support for 11 scheduled Indian languages (Hindi, Gujarati, Marathi, Punjabi, Bengali, Tamil, Telugu, Kannada, Malayalam, Urdu, and English).
- **Auto-Sync to Frappe Catalogs**: Updates automatically compile into `omniquery/locale/*.csv` and sync to the `Translation` DocType, eliminating manual CSV editing.
- **Missing Translation Highlights**: Visual warning badges on questions lacking translations for active project languages.

---

## 🎨 OmmNoMi Standard Desk UI Controls & Design System

To ensure seamless brand cohesion and accessibility, all Desk views in OmniQuery strictly comply with **OmmNoMi Desk Design Standards**:

### 1. OmmNoMi Brand Tokens & Palette
- **Ethical Blue**: `#4285F4` (Primary actions, active tab borders, information badges).
- **Ecological Green**: `#34A853` (Success indicators, synced status pills, positive financial metrics).
- **Entrepreneurial Red**: `#EA4335` (Validation errors, flagged anomalies, delete actions).
- **Enthusiasm Yellow**: `#FBBC05` (Pending sync, draft items, warning notices).
- **Empowerment Purple**: `#673AB7` (Analytics cards, administrative tools, supervisor audit workflows).
- **Neutral Dark / Light**: Standard high-contrast slate surfaces (`#0f172a` dark, `#f8fafc` light) with zero uncontrolled purple bleed.

### 2. Zero Native Select Invariant (`f-combobox`)
- **Strict Prohibition**: Native HTML `<select>` elements are strictly forbidden across all OmniQuery Desk forms and dialogs.
- **Accessible Searchable Combobox (`f-combobox`)**:
  - Live substring filtering with ARIA `combobox`, `listbox`, and `option` roles.
  - Programmatic focus shifting and deterministic keyboard navigation:
    - <kbd>↓</kbd> / <kbd>↑</kbd>: Move highlight between options.
    - <kbd>Enter</kbd>: Select highlighted option and close listbox.
    - <kbd>Escape</kbd>: Dismiss dropdown and restore focus to combobox trigger.
  - Overlay keyboard shielding: Arrow keys inside combobox overlays must call `e.stopPropagation()` to prevent scrolling the parent page container.

### 3. WCAG 2.2 AAA Accessibility Standards
- **Focus Rings**: High-contrast outline (`box-shadow: 0 0 0 2px var(--text-color) !important;` or 3px left border on table rows) ensuring complete keyboard visibility.
- **Screen Reader Announcements**: Dynamic mutations (adding rows, validation failures, sync status changes) announce immediately via `#omniquery-live-region` (`aria-live="polite"`).
- **Accessible Text**: No visual icon buttons without accompanied `<span class="sr-only">` accessible labels.

### 4. Universal Desk Keyboard Shortcuts
- <kbd>`</kbd> (Bare Backtick): Focus active sidebar item on any Desk route.
- <kbd>/</kbd>: Instant in-page screen filter (jump to first search or field control).
- <kbd>Ctrl + K</kbd> / <kbd>⌘ + K</kbd>: Native Frappe Awesomebar global search.
- <kbd>Shift + `</kbd>: Toggle Workspace Panel and User dropdown.

---

## 🕵️ Desk Response Auditor & Review Workstation (`/app/omniquery-workstation`)

A dedicated high-density review interface for Project Managers, Field Supervisors, and Data Auditors:

### 1. CardView Queue & Triage Lane
- **Status Columns**: `📥 Unaudited Syncs` $\rightarrow$ `⚠️ Flagged Outliers` $\rightarrow$ `✅ Approved Submissions` $\rightarrow$ `🔄 Re-Survey Requested`.
- **Card Telemetry**: Each card displays Surveyor Name, Village/City, Timestamp, GPS Accuracy ($\pm$ meters), and Outlier Score.

### 2. Dual-Pane Inspection Console
- **Left Pane (Geospatial & Device Telemetry)**:
  - Satellite map pin (OpenStreetMap / Leaflet) showing coordinates of interview capture.
  - Geofence verification badge (Inside vs Outside target cluster polygon).
  - Time-drift audit (comparing device local clock against server UTC timestamp).
  - High-resolution watermarked photo evidence with zoom modal.
- **Right Pane (Dynamic Survey View)**:
  - Full read-only rendered survey form matching the exact structure completed in the field.
  - Automated anomaly callouts (e.g. Monthly Net Profit > Monthly Sales, Zero Family Members).
  - Auditor inline notes and supervisor stamp.

### 3. One-Click Batch Actions
- Batch `Approve & Lock` (transitions responses to immutable submitted state).
- Batch `Export GeoJSON` for GIS / QGIS spatial analysis.
- Batch `Export SPSS / CSV` for academic and statistical reporting.

---

## 📊 Frappe Insights & Downstream BI Integration

OmniQuery responses plug directly into Frappe v16's reporting and analytics stack without bespoke middleware:

### 1. Native Data Source Mapping
- `OmniQuery Response` and normalized item tables automatically registered as verified Data Sources in Frappe Insights (`frappe_insights`).
- Dynamic flattening: Nested question/value pairs are exposed as relational tabular views for instant drag-and-drop charting.

### 2. Pre-Built Operational Dashboards
- **Field Enumeration Progress**: Daily submission counts per surveyor, active hours, and sync lag.
- **Socioeconomic KPI Cross-Tabs**: Average enterprise revenue by sector, capital source dependency distributions, and working capital deficit heatmaps.
- **Geographic Coverage Heatmap**: GIS point clusters indicating enumeration density across districts, blocks, and gram panchayats.

---

## 📐 Technical DocType Blueprint & Data Contracts

All data entities are modeled strictly as native Frappe DocTypes adhering to zero raw SQL standards:

```
┌───────────────────────────┐         1:N         ┌───────────────────────────┐
│     OmniQuery Project     │────────────────────▶│    OmniQuery Template     │
└───────────────────────────┘                     └─────────────┬─────────────┘
                                                                │ 1:N
                                                  ┌─────────────┴─────────────┐
                                                  │                           │
                                                  ▼                           ▼
                                      ┌───────────────────────┐   ┌───────────────────────┐
                                      │   OmniQuery Section   │   │  OmniQuery Question   │
                                      │     (Child Table)     │   │     (Child Table)     │
                                      └───────────────────────┘   └───────────┬───────────┘
                                                                              │ 1:N
                                                                              ▼
                                                                  ┌───────────────────────┐
                                                                  │   OmniQuery Option    │
                                                                  │     (Child Table)     │
                                                                  └───────────────────────┘
```

### 1. Core DocTypes
1. **`OmniQuery Project`**: Parent grouping for survey campaigns, target beneficiary counts, start/end dates, and assigned managers.
2. **`OmniQuery Template`**: Versioned questionnaire master, status (`Draft`, `Published`, `Archived`), schema hash, default language.
3. **`OmniQuery Section`** (Child Table): `section_code`, `title`, `description`, `sort_order`, `page_break`.
4. **`OmniQuery Question`** (Child Table): `question_code`, `label`, `field_type`, `reqd`, `depends_on`, `mandatory_depends_on`, `min_value`, `max_value`, `is_grid`, `grid_config_json`.
5. **`OmniQuery Option`** (Child Table): `option_code`, `label`, `group_category`, `sort_order`.
6. **`OmniQuery Surveyor`**: Field agent record, linked `User`, mobile phone hash, assigned projects, status (`Active`, `Suspended`).
7. **`OmniQuery Response`**: Primary submission header, `survey_template`, `surveyor`, `idempotency_key`, `gps_latitude`, `gps_longitude`, `gps_accuracy`, `captured_at_local`, `status` (`Draft`, `Submitted`, `Audited`, `Rejected`).
8. **`OmniQuery Response Item`** (Child Table): `question_code`, `value_data`, `value_numeric`, `value_json`, `attachment_file`.
9. **`OmniQuery Sync Audit Log`**: Dedicated deduplication record preventing replay attacks and tracking synchronization latency.

### 2. Role-Based Access Control (RBAC) Matrix
- **`OmniQuery Administrator`**: Full schema creation, project setup, user assignments, template publishing.
- **`OmniQuery Manager`**: Project-level response review, auditor assignment, analytics dashboard access.
- **`OmniQuery Auditor`**: Response inspection, validation override, audit approval / re-survey request.
- **`OmniQuery Surveyor`**: Field collection only via PWA, restricted strictly to active assigned projects via Frappe User Permissions.

---

### 3. Idempotent Offline Sync & Anti-Loss Invariants
- IndexedDB Write-Ahead Log (WAL) backed by Dexie.js.
- CSRF validation with automatic session binding (`X-Frappe-CSRF-Token`).
- Honest status reporting: toast messages must never claim "Sync complete" if any transaction in the batch failed or remains in `PENDING_SYNC`.

---

## 🚀 Phase-Wise Stability & Frappe Native Execution Plan

To eliminate single-point failures, streamline developer onboarding, and guarantee enterprise stability, the roadmap is executed across 5 focused phases:

### Phase 1: Native Schema Normalization & Zero Raw SQL Enforcement
- **Goal**: Align all backend models with standard Frappe DocType design.
- **Deliverables**:
  1. Audit every query in `api/` and `seed_shg_survey.py` to ensure 100% compliance with `frappe.get_doc`, `frappe.get_all`, `frappe.db.get_value`, and `frappe.qb`.
  2. Implement native DocType child tables for question options and grid matrices (`OmniQuery Option`, `OmniQuery Grid Spec`).
  3. Validate schema compilation strictly via `frappe.get_meta()`.

### Phase 2: Native Multilingual Migration (`frappe.translate`)
- **Goal**: De-bloat JavaScript bundle by migrating 4,000+ lines of inlined dictionaries to native Frappe translation catalogs.
- **Deliverables**:
  1. Export survey terminology into standard CSV files in `omniquery/locale/` (`hi.csv`, `gu.csv`, `mr.csv`, etc.).
  2. Expose a light cached translation endpoint (`api.survey.get_translations?lang=...`) using Frappe's native `frappe.translate.get_full_dict()`.
  3. PWA caches translations in IndexedDB (`dexie.translations`), fetching language packs on demand with instantaneous offline fallback.

### Phase 3: Modular Client Architecture & PWA Stability
- **Goal**: Refactor the 8,300-line monolithic `app.js` into decoupled, reusable ES composables.
- **Deliverables**:
  1. Break `app.js` into focused composables adhering to the $\le 10$ line function rule:
     - `composables/useWAL.js`: IndexedDB queue management, idempotent sync, exponential backoff.
     - `composables/useFormState.js`: Reactive answers, question skipping, validation rules.
     - `composables/useGridRenderer.js`: Pre-populated grid matrices, auto-sum calculations.
     - `composables/useSensors.js`: Geolocation bounding, canvas photo compression, EXIF watermarking.
  2. Integrate standard asset compilation via Frappe's native `esbuild` / Vite pipeline, ensuring clean asset versioning and zero browser caching glitches.

### Phase 4: Native Document Lifecycle, File Security & Idempotency
- **Goal**: Persist all survey responses through Frappe's native Document API with atomic transaction guarantees.
- **Deliverables**:
  1. Replace raw dictionary inserts with `frappe.new_doc("OmniQuery Response")` and standard controller hooks (`validate`, `on_submit`).
  2. Store all captured photos through native `File` documents with private permissions (`/private/files/`).
  3. Implement atomic MariaDB savepoints during batch synchronization to prevent partial sync corruptions.

### Phase 5: Automated Testing & Continuous Verification Pipeline
- **Goal**: Protect against regressions with automated characterization tests.
- **Deliverables**:
  1. Backend unit tests using `frappe.tests.utils.FrappeTestCase` with automated database rollback in `tearDown()`, strictly avoiding database pollution.
  2. End-to-end headless PWA sync verification simulating offline network disconnections, localStorage recovery, and duplicate batch submissions.
  3. Automated linter rules in `.pre-commit-config.yaml` preventing functions $> 10$ lines and banning `frappe.db.sql`.
