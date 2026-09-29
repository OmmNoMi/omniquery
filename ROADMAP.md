# <span style="font-family:'Roboto',sans-serif;font-weight:900;"><span style="color:#4285f4;">Omm</span><span style="color:#34a853;">No</span><span style="color:#ea4335;">M</span><span style="color:#fbbc05;">i</span></span> OmniQuery — Product & Architecture Roadmap

> **Platform Mission**: End-to-End Enterprise Survey Design, Multilingual Field Collection, Zero-Loss Offline Sync, Submittable Versioned Waves, and Downstream Business Intelligence Engine. Built natively on Frappe v16 and Frappe UI standards, completely aligned with the OmmNoMi design philosophy.

---

## 🏛️ Executive Identity & Brand Alignment

### 1. Correct Nomenclature & Brand Wordmark
- **Name**: **`OmniQuery`** (URL: `/omniquery` for PWA, `/desk/` for administrative views).
- **Brand Standards**: Follows strict OmmNoMi brand guidelines (`OmmNoMi Automation LLP`, Vibrant Palette: `#4285F4`, `#34A853`, `#EA4335`, `#FBBC05`, `#673AB7`).
- **Frappe Native UI Invariants**: Pure Frappe native design tokens, standard Frappe CardView layouts, zero conflicting CSS hacks, clean accessible component contracts, and `/desk/` navigation on Frappe v16.

---

## 🌊 Submittable Template Waves & Version Immutability (`is_submittable: 1`)

### 1. The Immutability Guarantee
- Published survey templates have `"is_submittable": 1` and lock permanently upon submission (`docstatus = 1`).
- Eliminates mid-campaign schema drift where surveyors in the field submit responses against modified question definitions.

### 2. Native Wave Versioning (`amended_from`)
- Any update to a published survey creates an amended version wave (`TMPL-SHG-001-1` &rarr; `TMPL-SHG-001-2`) linked via `amended_from`.
- **Zero Offline Rejection**: Field surveyors working offline in remote villages without connectivity continue collecting responses against Wave 1. When returning online, both Wave 1 and Wave 2 responses are ingested cleanly without rejection.

---

## 🌍 4-Tier Scope Hierarchy & Question Masters

Questions and Option Sets are decoupled from monolithic surveys and governed by a 4-tier hierarchy:

1. **`Platform`**: Universal global questions (Full Name, Phone, Age, Gender, District, GPS, Yes/No, Likert 5-point). Pre-translated and available to all tenants.
2. **`Workspace`**: Organization-level standards shared across all projects within a tenant workspace.
3. **`Project`**: Scoped strictly to one project within the workspace.
4. **`Survey`**: Private, bespoke questions created for a specific survey wave.

* **Platform Promotion**: When system administrators notice common questions across workspaces, they can promote them to `Platform` scope.
* **Active Status Filtering**: Every Question and Option Set carries a `status` (`Active`, `Inactive`, `Draft`). Inactive records are suppressed from survey builders.
* **100% Frappe Native Translation**: Questions, option sets, and instructions use Frappe's native `locale/*.csv` and `Translation` DocType (`frappe._()`).
* **Per-Survey Mandatory Flexibility**: `is_mandatory` is defined per survey wave in the linking table (`OmniQuery Template Question Reference`), not hardcoded on Master question.

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

## 💾 Universal Disaster Recovery & Out-of-Band Sharing

To guarantee **zero data loss under any technical failure** (server downtime, corrupted cache, device hardware issues):

1. **PWA Local Recovery Drawer**: Accessible via the top status pill at any time, even when completely offline.
2. **Multi-Format Export Options**:
   - **`JSON Export`**: Complete, cryptographic raw dump of IndexedDB (WAL, draft state, schema hashes).
   - **`XLSX Export`**: Formatted tabular workbook containing all responses, sections, and answered columns ready for Excel.
   - **`Comprehensive Forensic ZIP Bundle`**:
     - `survey_database_dump.json`: Raw IndexedDB WAL state.
     - `responses_spreadsheet.xlsx`: Tabular survey data.
     - `media/`: All captured photos (`.webp`), compressed videos (`.webm`/`.mp4`), and interview audio blobs (`.opus`).
     - `diagnostics/console_logs.txt`: Complete in-memory circular ring buffer of client console logs & errors.
     - `diagnostics/device_telemetry.json`: OS, browser engine, screen DPI, battery level, online/offline transition history, and storage quota utilization.
3. **Out-of-Band Sharing**: Web Share API / File Saver enabling surveyors to send the ZIP directly to supervisors via WhatsApp, Telegram, Google Drive, or Bluetooth.

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
    - **`Project Admin`**: Full technical control; authors questions, configures scripts, tunes validation formulas, and publishes submittable waves.
    - **`Project Manager`**: Operations lead; inspects survey structures in **read-only mode** with **continuous commenting & feedback privileges** on questions and sections; manages quotas, surveyor allocations, and collection pacing.
    - **`Project Analyst`**: Data researcher; read-only access to response data and telemetry for charts, Frappe Insights dashboards, and dataset exports (zero schema modification rights).
    - **`Project Viewer`**: Client executive observer; clean UI watching overall project KPIs, completion stats, and formal milestone reports.
    - **`Project User`**: Field enumerator collecting survey data in PWA.

---

## 🚀 Phase-Wise Implementation Roadmap

### Phase 1: Submittable Waves, Master Scoping & 3 Global Roles
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
- [ ] Server test suite (`test_template_waves.py`, `test_question_scope.py`, `test_mandatory_rules.py`, `test_in_flight_sync.py`, `test_permissions.py`).
- [ ] Client test suite via Vitest (`npm test`) covering UI controls, accessibility, audio recorder state transitions, and ZIP generation.
- [ ] Automated teardown assertions ensuring zero dev database pollution.

---

<small>© 2026 OmmNoMi Automation LLP · Mahunag · Karsog · Mandi, HP, India</small>
