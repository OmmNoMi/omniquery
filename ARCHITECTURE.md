# <span style="font-family:'Roboto',sans-serif;font-weight:900;"><span style="color:#4285f4;">Omm</span><span style="color:#34a853;">No</span><span style="color:#ea4335;">M</span><span style="color:#fbbc05;">i</span></span> OmniQuery — System Architecture & Developer Guide

> **Scope**: System architecture, submittable template wave lifecycle, 4-tier question master scoping, pure-configuration field taxonomy, continuous audio recording, in-flight live synchronization, Raven-style in-app SaaS role governance, disaster recovery, and engineering invariants for OmniQuery developers.

---

## 1. System Overview & High-Level Architecture

OmniQuery is an enterprise-grade, offline-first survey engine, dynamic inspection framework, and operational intelligence platform designed for bandwidth-constrained, rural, and large-scale enumeration environments.

```
┌─────────────────────────────────────────────────────────────────────────────────┐
│                      OmniQuery PWA Client (/omniquery)                          │
│  - Vue 3 + Tailwind CSS (Reactive, Accessible, Zero Uncontrolled Purple Bleed)  │
│  - Dexie.js Write-Ahead Log (IndexedDB: OmniQueryDB)                           │
│  - Universal Form Renderer & Control Dispatcher (Pure Schema Configuration)     │
│  - Continuous Ambient Audio Recording (MediaStream Opus Blobs)                 │
│  - Universal Disaster Recovery Drawer (JSON, XLSX, Forensic ZIP Bundle)         │
│  - Real-Time Error Reporting Beacon (sendBeacon / window.onerror)               │
└───────────────────────────────┬─────────────────────────────────────────────────┘
                                │
        ┌───────────────────────┴───────────────────────┐
        │                                               │
   In-Flight Live Draft Stream                   Final Batch Push
   (Debounced 750ms, Partial)              (UUIDv4 Idempotent Token)
        │                                               │
        ▼                                               ▼
┌─────────────────────────────────────────────────────────────────────────────────┐
│                     Frappe v16 Backend (OmniQuery Core)                         │
│  - Endpoints: `sync_draft` (Live Drafts) & `batch_push` (Atomic Finalization)  │
│  - Telemetry Endpoint: `log_field_error` (Instant Field Error Logging)          │
│  - Submittable Template Wave Engine (is_submittable: 1, Immutability Lock)      │
│  - 4-Tier Scope Hierarchy (Platform, Workspace, Project, Survey)                │
│  - 100% Frappe Native Translation (locale/*.csv & Translation DocType)          │
│  - Raven-Style In-App Contextual Membership (3 Global Frappe Roles)             │
│  - Native ORM / PyPika Queries (Zero Raw SQL Invariant)                         │
│  - Atomic MariaDB Savepoints (`sp_sync_<uuid>`) & Sync Audit Logs               │
└─────────────────────────────────────────────────────────────────────────────────┘
```

---

## 2. Submittable Template Waves & Version Lifecycle (`is_submittable: 1`)

To prevent offline data corruption and schema divergence during multi-month field campaigns, survey templates adopt Frappe's native **Submittable Document Lifecycle**:

```mermaid
flowchart LR
    Draft["Draft Template\n(docstatus = 0)\nSchema being authored"] -->|Submit / Publish| Wave1["Published Wave 1\n(docstatus = 1)\nPERMANENTLY LOCKED"]
    Wave1 -->|Amend on Requirements Change| Wave2Draft["Amended Draft\n(docstatus = 0)\namended_from = Wave 1"]
    Wave2Draft -->|Submit / Publish| Wave2["Published Wave 2\n(docstatus = 1)\nPERMANENTLY LOCKED"]

    Wave1 -.-> FieldResp1["Surveyor Offline in Village A\nSubmits against Wave 1\n(INGESTION 100% SUCCEEDS)"]
    Wave2 -.-> FieldResp2["Surveyor Online in Village B\nSubmits against Wave 2\n(INGESTION 100% SUCCEEDS)"]
```

1. **Permanent Template Immutability**:
   - Setting `"is_submittable": 1` ensures that once a survey template is published (`docstatus = 1`), its schema, sections, and linked questions are permanently locked in MariaDB.
   - Any attempt to directly alter a published template raises `frappe.ValidationError`.
2. **Native Version Waves (`amended_from`)**:
   - When survey questions, options, or scripts need updates during an active enumeration campaign, the Project Admin clicks **Amend**.
   - Frappe generates a sequential wave (`TMPL-SHG-001-1` &rarr; `TMPL-SHG-001-2`) linked via `amended_from`.
3. **Zero Offline Rejection Guarantee**:
   - Field surveyors offline in remote villages without network access continue collecting responses against Wave 1.
   - When returning to connectivity, their responses are ingested cleanly without rejection or version mismatch errors. Both Wave 1 and Wave 2 responses coexist harmoniously in MariaDB.

---

## 3. 4-Tier Scope Hierarchy & Question Masters

Question Masters and Option Sets are decoupled from individual surveys and governed by a unified **4-Tier Scope**:

```mermaid
flowchart TD
    Tier1["Tier 1: Platform\nUniversal standards (Yes/No, Likert 5-point, Full Name, Phone, Age, District, GPS)\nPre-translated in Frappe native Translation; available to all tenants"]
    Tier2["Tier 2: Workspace\nOrganization-level (shared across all projects in that client's workspace)"]
    Tier3["Tier 3: Project\nRestricted to a specific project within the workspace"]
    Tier4["Tier 4: Survey\nBespoke questions/options private to a single survey template wave"]

    Tier1 --> Tier2 --> Tier3 --> Tier4
```

* **Platform Promotion**: System Administrators can promote widely used questions or option sets to `Platform` scope so no future tenant or project has to reinvent or re-translate them.
* **Active Status Filtering**: Every Question and Option Set carries a `status` (`Active`, `Inactive`, `Draft`). Inactive records are automatically filtered out from survey designer pickers.
* **100% Frappe Native Translation**: Questions, option labels, and instructions use Frappe's standard `locale/*.csv` and the native `Translation` DocType (`frappe._()`), completely eliminating hardcoded 4,000-line translation dictionaries.
* **Per-Survey Mandatory Flexibility**: `is_mandatory` is defined per survey wave in the linking child table (`OmniQuery Template Question Reference`), allowing question `phone` to be optional in Wave 1 and mandatory in Wave 2.

---

## 4. Pure Configuration Field Type Taxonomy (Zero CSS Hacks)

All UI controls are driven deterministically by schema metadata without custom CSS overrides:

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

## 5. SaaS Role Governance & Raven-Style In-App Contextual Membership

OmniQuery adopts a clean **Raven-style in-app membership architecture**: instead of polluting Frappe's global role namespace with dozens of granular roles, OmniQuery defines **only 3 global Frappe Roles**, while granular project permissions are governed by built-in Workspace & Project membership tables:

```mermaid
flowchart TD
    subgraph GlobalRoles ["Frappe Global System Roles (Only 3)"]
        GA["1. OmniQuery Admin\n(Platform & Site Super-Admin;\nserver settings, platform fixtures, tenant billing)"]
        GM["2. OmniQuery Manager\n(Desk Access Role: encompasses all Desk-based stakeholders\nWorkspace Admin, Workspace Manager, Project Admin, Project Manager, Project Analyst, Project Viewer)"]
        GU["3. OmniQuery User\n(Mobile / PWA Role: users who fill in the survey forms)"]
    end

    subgraph DeskMemberships ["Desk In-App Contextual Governance (for OmniQuery Manager)"]
        WM["Workspace Member:\n- Workspace Admin (Owner / Transferable)\n- Workspace Manager"]

        subgraph ProjectDeskRoles ["Project In-App Roles (Per Project in Desk)"]
            PA["Project Admin (Technical Lead):\nFull edit: questions, scripts, validation rules, wave publication"]
            PM["Project Manager (Operations Lead):\nRead-only survey structure with commenting feedback; quotas & field pacing"]
            PY["Project Analyst (Data & Insights):\nDedicated access to response datasets, pacing telemetry & analytics (zero schema edits)"]
            PV["Project Viewer (Client / Stakeholder):\nClean executive observer UI: overall project health, KPIs, and status reports"]
        end
    end

    subgraph FieldRole ["Field Collection (for OmniQuery User)"]
        PU["Project User / Field Surveyor:\nFills in the survey forms offline in PWA (/omniquery)"]
    end

    GA -.->|Superuser override| DeskMemberships
    GM -->|Accesses Desk governed by| DeskMemberships
    GU -->|Accesses PWA to fill forms as| FieldRole
```

### 1. The 3 Global Frappe Roles
- **`OmniQuery Admin`**: Platform super-administrator with unrestricted access to settings, platform questions, fixtures, and tenant billing.
- **`OmniQuery Manager`**: Standard Frappe Desk role assigned to all Desk stakeholders (Workspace Admin, Workspace Manager, Project Admin, Project Manager, Project Analyst, Project Viewer).
- **`OmniQuery User`**: Dedicated mobile role for field enumerators filling forms in the PWA (`/omniquery`).

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

### 3. Native Frappe Permission Hook Integration
- **`has_permission(doc, ptype, user)`**:
  - Automatically grants full access if user is `OmniQuery Admin` or `System Manager`.
  - For `OmniQuery Template` edits: verifies user has `project_role == "Project Admin"` in `doc.project`.
  - For `OmniQuery Response` reads/exports: verifies user has `project_role in ["Project Admin", "Project Manager", "Project Analyst", "Project Viewer"]`.
  - For `OmniQuery Response` draft submissions: verifies user is in `OmniQuery Project Member` with `project_role in ["Project User", "Project Admin"]`.
- **`permission_query_conditions(user)`**:
  - Generates SQL conditions for `frappe.get_list` so users only see records belonging to Projects where they hold an active membership.

---

## 6. Continuous In-Flight Live Sync & Offline Village Mode

```mermaid
flowchart LR
    Inputs["Surveyor Keystrokes & Inputs"] --> WAL[("1. Local WAL (OmniQueryDB: IndexedDB)\nInstant Persistence (0ms)")]
    WAL -->|Offline in Village| Cont["2. Non-blocking typing continues"]
    WAL -->|Online (Debounced 750ms)| AutoSync["3. sync_draft API"]
    AutoSync --> DraftDoc[("OmniQuery Response: Draft\n(No mandatory validation)")]
    DraftDoc --> LiveHUD["Live Supervisor Monitor (/desk/omniquery-workstation)"]

    Submit["User clicks 'Submit Survey'"] --> BatchPush["4. batch_push API\n(Full Script & Rule Validation)"]
    BatchPush --> FinalDoc[("OmniQuery Response: Submitted")]
```

1. **Immediate Local WAL**: Every keystroke/selection is saved to Dexie IndexedDB with `sync_status = "Draft"`.
2. **Non-Blocking In-Flight Stream**: When online, debounced background worker posts partial state to `sync_draft`. Server updates `OmniQuery Response` and `OmniQuery Response Item` without failing on mandatory fields.
3. **Background Interview Audio Recording**:
   - Top-bar persistent audio recorder captures interview ambient audio in low-bitrate Opus chunks (`.webm` / `.opus`).
   - Recorded audio streams directly into IndexedDB blobs without interrupting data synchronization.

---

## 7. Instantaneous Client Error Reporting Beacon

To guarantee that field surveyors never remain stuck in the field unnoticed:

```mermaid
flowchart LR
    Stuck["Field Surveyor Experiences Error / Freeze\n(Script failure, validation deadlock, network stall)"] --> Beacon["PWA Error Beacon\n(navigator.sendBeacon / window.onerror)"]
    Beacon --> ServerLog[("OmniQuery Field Error Log\n(Live in MariaDB)")]
    ServerLog --> Alert["Real-Time Desk Notification to Project Admin\n('Surveyor stuck at Q14 in Wave 1')"]
    Alert --> Fix["Admin fixes question/script & Publishes Wave 2\n(PWA pulls updated wave seamlessly)"]
```

1. **Zero-Latency Error Capture**:
   - PWA catches unhandled promise rejections, script evaluation errors, or input parsing issues instantaneously.
   - Dispatches an asynchronous non-blocking error beacon (`navigator.sendBeacon('/api/method/omniquery.api.telemetry.log_field_error')`).
2. **`OmniQuery Field Error Log` DocType**:
   - Stored on the server: `survey_template`, `template_version`, `question_code` (exact question where error happened), `surveyor`, `error_message`, `stack_trace`, and `device_info`.
3. **Rapid Triage & Patching**:
   - Project Admins see real-time field error logs directly in `/desk/omniquery-workstation`.
   - Admin can amend the template, fix the question script/options, and publish Wave 2. The surveyor's PWA automatically picks up the fix on its next heartbeat.

---

## 8. Disaster Recovery & Universal Local Export

To guarantee **zero data loss under any technical failure** (server downtime, corrupted cache, device hardware issues):

1. **PWA Local Storage Recovery Drawer**:
   - Accessible via the top status pill at any time, even when completely offline.
2. **Multi-Format Export Options**:
   - **`JSON Export`**: Complete, cryptographic raw dump of IndexedDB (WAL, draft state, schema hashes).
   - **`XLSX Export`**: Formatted tabular workbook containing all responses, sections, and answered columns ready for Excel.
   - **`Comprehensive Forensic ZIP Bundle`**:
     - `survey_database_dump.json`: Raw IndexedDB WAL state.
     - `responses_spreadsheet.xlsx`: Tabular survey data.
     - `media/`: All captured photos (`.webp`), compressed videos (`.webm`/`.mp4`), and interview audio blobs (`.opus`).
     - `diagnostics/console_logs.txt`: Complete in-memory circular ring buffer of client console logs & errors.
     - `diagnostics/device_telemetry.json`: OS, browser engine, screen DPI, battery level, online/offline transition history, and storage quota utilization.
3. **Out-of-Band Sharing**:
   - Web Share API / File Saver: Surveyors can send the ZIP directly to supervisors via WhatsApp, Telegram, Google Drive, or Bluetooth.

---

## 9. Engineering Invariants & Code Standards

### The 10-Line Function Invariant
- **Rule**: No function may exceed **10 lines** in length.
- **Why**: Keeps functions easily readable, mathematically verifiable, unit-testable, and prevents regression sprawl.
- **Decomposition Pattern**: Complex logic must be split into:
  1. Extraction / Normalization helper (2–5 lines)
  2. Pure transformation / Business rule helper (3–7 lines)
  3. Action / Execution helper (3–8 lines)

### Configuration-Driven Architecture
- Survey grids, question groupings, and field-type characteristics are defined in structured declarative objects (e.g. `GRID_CONFIGS`, `MULTI_SELECT_CODES`).
- Templates reference configuration via lookup helpers rather than inline hardcoded conditionals.

### Honest Status Invariant
- Toast and UI indicators must reflect true transactional state. If a server sync yields HTTP 400 (e.g. CSRFTokenError) or database rejection, the WAL item remains `PENDING_SYNC` and the notification must explicitly state `Sync failed for X survey(s)`. Never report false success.

### 🔒 Security & Zero Raw SQL Invariant
- **Absolute Rule**: **NEVER write raw SQL (`frappe.db.sql`)**.
- **Rationale**: Raw SQL bypasses Frappe's field-level permissions, role-based access control (RBAC), tenant isolation, parameter sanitization, and DocType event hooks.
- **Mandatory Frappe Native APIs**:
  - `frappe.get_doc(doctype, name)` / `frappe.new_doc(doctype)`
  - `frappe.get_all(doctype, filters=..., fields=..., order_by=..., limit=...)`
  - `frappe.get_list(doctype, filters=...)` (strict permission-enforced listing)
  - `frappe.db.get_value(doctype, filters, fieldname)`
  - `frappe.db.exists(doctype, name_or_filters)`
  - `frappe.db.set_value(doctype, name, fieldname, value)`
  - `frappe.qb` (Frappe Query Builder via PyPika) with parameterized builders if complex set-level queries are required.
- **CSRF & Session Invariant**: All state-mutating requests must pass through Frappe's native session validation using `frappe.sessions.get_csrf_token()` and `X-Frappe-CSRF-Token` headers. Unsafe bypasses (`ignore_csrf`) are strictly prohibited.

### Zero DB-Pollution Test Suite Invariant
- **FrappeTestCase Integration**: All backend unit tests inherit from `frappe.tests.utils.FrappeTestCase`.
- **Automatic Rollback / Teardown**: Tests that instantiate dummy templates, surveyors, or responses must either execute in non-committing transactions or clean up all records inside `tearDown()`, ensuring development databases and team workstations remain spotless.

---

<small>© 2026 OmmNoMi Automation LLP · Mahunag · Karsog · Mandi, HP, India</small>
