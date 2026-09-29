# Changelog

All notable changes to **OmniQuery** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [Unreleased]

### Planned & Architecture Specifications
* **🌊 Survey Versions (Frappe Native Submittable Amendment Lifecycle)**:
  * Published survey templates lock permanently (`docstatus = 1`) to eliminate mid-campaign schema drift.
  * Native submittable amendment lifecycle (`amended_from`) creates sequential versions (`SURV-TMPL-001-1`, `SURV-TMPL-001-2`) ensuring zero offline rejection.
* **🌍 4-Tier Scope Hierarchy & Reusable Option Sets**:
  * Question and Option Set scoping: `Platform`, `Workspace`, `Project`, `Survey`.
  * 100% Frappe Native Translations via `locale/*.csv` and `Translation` DocType (`frappe._()`).
  * Flexible per-survey mandatory configuration (`is_mandatory` on reference table).
* **🎛️ Pure-Configuration Field Type Taxonomy**:
  * Choice (Radio, Buttons, Switch, Chips, Rating with stars/faces/hearts and 0.5/1.0 steps, Combobox), Numerical (precision default 0), Temporal with calendar anchors, Duration, Geographic, Text Input, SubTables/Grids, and Media.
* **🎙️ Continuous Ambient Audio Interview Recording**:
  * Floating header controls (`[🎙️ Record | ⏸ Pause / ▶ Resume | ⏹ Stop]`) streaming low-bitrate Opus chunks (`.opus`/`.webm`) to IndexedDB with auto-stop on submit.
* **💾 Universal Multi-Format Disaster Recovery (Per-Survey & Bulk All-At-Once)**:
  * PWA recovery drawer with dual-scope extraction: **Per-Survey** or **Bulk Action All-At-Once** generating instant raw WAL JSON, XLSX, and Comprehensive Forensic ZIP bundles (WAL + XLSX + media + console logs + device telemetry).
* **📡 Continuous In-Flight Live Sync & Instant Error Beacon**:
  * Debounced partial sync stream (`sync_draft`) saving drafts to MariaDB for live supervisor monitoring.
  * Zero-latency error beacon (`navigator.sendBeacon`) logging to `OmniQuery Field Error Log`.
* **🔐 Raven-Style In-App SaaS Governance**:
  * 3 Global Frappe Roles (`OmniQuery Admin`, `OmniQuery Manager`, `OmniQuery User`).
  * In-app contextual memberships for `Project Admin` (technical lead), `Project Manager` (operations & continuous commenting), `Project Analyst` (data & insights), `Project Viewer` (executive observer), and `Project User` (field surveyor).

---

## [0.1.0] - 2026-09-29

### Added
* **📦 Rajivika Survey Fixtures & Benchmark Suite**:
  * Exported native Frappe fixtures (`1_omniquery_project.json`, `2_omniquery_template.json`) for the Rajivika SHG Women Entrepreneurs Study (9 sections, 101 questions, compiled SHA-256 schema).
  * Automated fixture synchronization on app install and migration (`after_install`, `after_migrate`) for seamless Frappe Cloud deployment.
  * Dedicated benchmark test suite (`test_rajivika_benchmark.py`) covering fixture integrity, section hierarchies, sub-50ms schema compilation, API responsiveness, and idempotent sync.
* **🛡️ Zero-Data-Loss Offline PWA**:
  * Persistent IndexedDB Write-Ahead Logging (WAL) powered by Dexie.js (`OmniQueryDB`).
  * Dedicated service worker (`sw.js`) pre-caching static assets for complete offline capability at `/omniquery`.
  * Offline submission queue with automatic background sync upon network reconnection.
  * Encrypted local JSON and CSV export/backup utilities.
* **🔁 Client-Side Idempotency & Atomic Ingestion**:
  * Cryptographic UUIDv4 idempotency tokens per submission preventing duplicate responses on flaky networks.
  * Atomic MariaDB savepoints (`sp_sync_<uuid>`) per submission in `omniquery.api.sync.batch_push`.
  * Deduplication audit log (`OmniQuery Sync Audit Log`) for caching and instant idempotent responses.
* **♿ WCAG 2.2 AA Accessible UI Controls**:
  * **Zero Native Browser Selects**: Created custom `FCombobox` (`f-combobox`) component replacing all native HTML `<select>` tags with accessible custom dropdowns and full keyboard navigation (<kbd>ArrowDown</kbd>, <kbd>ArrowUp</kbd>, <kbd>Enter</kbd>, <kbd>Space</kbd>, <kbd>Escape</kbd>).
  * **Roving Tabindex Range Controls**: Numeric slider pills implemented as a single tab group (`role="radiogroup"`, `role="radio"`, `tabindex="0"` on selected item) with <kbd>ArrowLeft</kbd> and <kbd>ArrowRight</kbd> stepping.
  * Non-interactive screen reader live announcement container (`#cv-live-region`).
* **🌐 Dynamic Multilingual Engine**:
  * Real-time client-side switching between English and Hindi with fallback dictionary.
* **📍 GIS & Field Telemetry**:
  * Capture of GPS latitude, longitude, accuracy radius, and local timestamp signatures.
* **🏛️ Frappe v16 Backend Core**:
  * 10 Normalized DocTypes under `OmniQuery` module.
  * Automatic JSON schema compilation and SHA-256 integrity verification on template save.
  * 100% Frappe native ORM queries without raw SQL.
* **🤝 Open-Source Community & Governance**:
  * MIT License with OmmNoMi Automation LLP copyright.
  * Comprehensive developer guides (`README.md`, `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `SECURITY.md`).
  * GitHub Actions automated CI (`ci.yml`, `linter.yml`), Dependabot, and issue/PR templates.

### Changed
* Application, repository, module, and PWA route standardized to `omniquery` (`https://github.com/OmmNoMi/omniquery`).
* Official domain and contact email configured to `omniquery.ommnomi.com` and `omniquery@ommnomi.com`.
* Eliminated legacy `/pwa` web routes to prevent multi-tenant route collision.

---

<small>© 2026 OmmNoMi Automation LLP</small>
