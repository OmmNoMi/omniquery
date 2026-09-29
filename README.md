<div align="center">

# <span style="font-family:'Roboto',sans-serif;font-weight:900;"><span style="color:#4285f4;">Omm</span><span style="color:#34a853;">No</span><span style="color:#ea4335;">M</span><span style="color:#fbbc05;">i</span></span> OmniQuery

**Next-Gen Dynamic Survey Engine, Zero-Data-Loss Offline PWA & Frappe Insights Platform**

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](https://opensource.org/licenses/MIT)
[![Frappe Framework](https://img.shields.io/badge/Frappe-v16+-171717.svg?logo=frappe)](https://frappeframework.com)
[![Python Version](https://img.shields.io/badge/python-3.10%20%7C%203.11%20%7C%203.12%20%7C%203.14-blue.svg)](https://www.python.org/)
[![Code Style: Ruff](https://img.shields.io/badge/code%20style-ruff-000000.svg)](https://github.com/astral-sh/ruff)
[![Pre-commit](https://img.shields.io/badge/pre--commit-enabled-brightgreen?logo=pre-commit&logoColor=white)](https://github.com/pre-commit/pre-commit)
[![Website](https://img.shields.io/badge/website-omniquery.ommnomi.com-4285f4.svg)](https://omniquery.ommnomi.com)

[Explore Features](#key-features) · [Quick Start](#quick-start) · [Architecture](#architecture) · [Accessibility](#keyboard-navigation--accessibility) · [Contributing](#contributing)

</div>

---

## 🌟 Overview

**OmniQuery** is an enterprise-grade, offline-first survey and inspection platform built for [Frappe Framework v16](https://frappeframework.com). Engineered specifically for rigorous field research, social audits, agricultural censuses, and operational checklists, OmniQuery guarantees **zero data loss** in bandwidth-constrained, rural, or fully offline field environments.

With an embedded Progressive Web App (PWA) running on Dexie.js (IndexedDB Write-Ahead Logging), client-side UUIDv4 idempotency keys, and an atomic MariaDB backend ingestion pipeline, field surveyors can capture hundreds of complex multi-section responses without ever fearing browser reloads, network drops, or duplicate submissions.

---

## 🚀 Key Features

* **🌊 Submittable Template Waves (`is_submittable: 1`)**: Published templates become permanently immutable documents (`docstatus = 1`). Modifying a survey creates an amended version wave (`TMPL-SHG-1` &rarr; `TMPL-SHG-2`) guaranteeing **zero offline rejection** for field surveyors working in remote villages.
* **🛡️ Zero-Data-Loss Offline PWA**: Dual-tier storage with in-memory reactive state and persistent IndexedDB Write-Ahead Log (WAL) powered by Dexie.js. Forms survive battery depletion, browser crashes, background app eviction, and accidental navigation.
* **📡 Continuous In-Flight Live Sync (`sync_draft`)**: While working online, partial responses stream asynchronously to MariaDB as `Draft` records without mandatory field blocking, providing central supervisors live monitoring at `/desk/omniquery-workstation`.
* **🚨 Instantaneous Client Error Reporting Beacon**: Any client-side evaluation error or stuck question fires an asynchronous beacon (`navigator.sendBeacon`) logging directly to `OmniQuery Field Error Log` for immediate Project Admin triage.
* **🎙️ Ambient Audio Interview Recording**: Persistent floating header control (`[🎙️ Record | ⏸ Pause / ▶ Resume | ⏹ Stop]`) recording ambient interview audio into low-bitrate Opus chunks (`.opus`/`.webm`) with automatic finalization on survey submission.
* **💾 Universal Disaster Recovery**: Built-in recovery drawer for offline field data rescue with one-click downloads of **JSON** (raw WAL dump), **XLSX** (tabular spreadsheet), and a **Comprehensive Forensic ZIP** (WAL JSON, XLSX, media blobs, client console logs, and device telemetry) for sharing via WhatsApp or Drive.
* **🌍 4-Tier Scope Hierarchy & 100% Frappe Native Translations**:
  * Unified governance across **`Platform`**, **`Workspace`**, **`Project`**, and **`Survey`** scopes.
  * Common questions (Yes/No, Likert 5-point, Full Name, Phone, Age, District, GPS) can be promoted to `Platform` scope.
  * 100% native Frappe Translation catalogs (`locale/*.csv`) and `Translation` DocType without inlined JavaScript dictionaries.
  * Flexible per-survey mandatory configuration (`is_mandatory` is defined per survey wave).
* **🎛️ Rich UI-Configurable Field Types (Pure Configuration, Zero CSS Hacks)**:
  * **Choice (Single & Multi)**: Radio, Buttons, Switch (ON/OFF), Chips, Rating (Stars, Sentiment Faces, Hearts, Thumbs with configurable 5/10 max and 1.0/0.5 step precision), Searchable Combobox (`f-combobox`).
  * **Numerical**: Integer, Decimal (default precision `0`), Currency (₹/$/€), Signed (+/-), Range Sliders.
  * **Temporal**: Date, Time, DateTime, Month-Year (e.g. "Jan 2024"), Year Only, Day Only with anchor date rules (`First Day` vs `Last Day` for seamless time-series chart plotting).
  * **Duration, Geographic (GPS/Polygon), Text Input, SubTables / Grids, and Watermarked Media**.
* **🌐 Public Citizen Mode (`is_public_citizen_link`)**: Standalone direct survey route (`/survey/{slug}`) allowing one-time unauthenticated public submission without PWA surveyor dashboard clutter.
* **⏱️ Session & Friction Telemetry**: Tracks active filling time vs idle pauses, and time-spent-per-question to help administrators identify friction and optimize survey pacing.
* **🔐 Raven-Style In-App SaaS Governance (Only 3 Global Frappe Roles)**:
  * **3 Global Frappe Roles**: `OmniQuery Admin` (platform super-admin), `OmniQuery Manager` (all Desk stakeholders), `OmniQuery User` (field surveyors filling forms in PWA).
  * **Contextual In-App Memberships**: Dedicated Workspace and Project membership tables governing **`Project Admin`** (technical architect), **`Project Manager`** (operations lead with read-only survey structure and continuous commenting feedback), **`Project Analyst`** (data & insights), **`Project Viewer`** (client executive observer), and **`Project User`** (field surveyor).

---

## 📐 Architecture

```mermaid
flowchart TD
    subgraph Client ["Client Device (Browser / Offline PWA: /omniquery)"]
        UI["Vue 3 + Tailwind PWA UI"]
        Form["Reactive Form & Control Dispatcher"]
        WAL[("Dexie.js IndexedDB: OmniQueryDB\n(Write-Ahead Log)")]
        AudioRec["Opus Audio Recorder (MediaStream)"]
        Beacon["Error Reporting Beacon (sendBeacon)"]
        Recovery["Universal Recovery Drawer\n(JSON, XLSX, Forensic ZIP)"]

        UI <--> Form
        Form -->|Every Input / Keystroke (0ms)| WAL
        AudioRec -->|Opus Blobs| WAL
        UI -.->|Disaster Export| Recovery
    end

    subgraph Network ["Transport Layer"]
        DraftSync["In-Flight sync_draft\n(Debounced 750ms, Partial)"]
        FinalPush["Batch Push Request\n(UUIDv4 Idempotency Key)"]
        ErrStream["Error Beacon Stream"]
    end

    subgraph Backend ["Frappe v16 Backend"]
        DraftEndpoint["omniquery.api.sync.sync_draft\n(No mandatory validation)"]
        PushEndpoint["omniquery.api.sync.batch_push\n(Full Script & Rule Validation)"]
        ErrEndpoint["omniquery.api.telemetry.log_field_error"]

        DraftDoc[("OmniQuery Response: Draft\n(Live Supervisor Monitoring)")]
        SubmittedDoc[("OmniQuery Response: Submitted\n(Locked & Aggregated)")]
        ErrDoc[("OmniQuery Field Error Log\n(Instant Admin Triage)")]
    end

    WAL -->|Online Event| DraftSync --> DraftEndpoint --> DraftDoc
    WAL -->|Submit Survey| FinalPush --> PushEndpoint --> SubmittedDoc
    Beacon --> ErrStream --> ErrEndpoint --> ErrDoc
```

For complete technical specifications, see [ARCHITECTURE.md](ARCHITECTURE.md) and [ROADMAP.md](ROADMAP.md).

---

## ⚡ Quick Start

### Prerequisites

* Frappe Bench installed with Python 3.10+ and Node.js 18+
* MariaDB 10.6+ or 11.4+
* Redis (Cache & Queue)

### Bench Installation

```bash
# Navigate to your bench root directory
cd ~/frappe-bench

# Fetch the OmniQuery app into bench
bench get-app https://github.com/OmmNoMi/omniquery.git --branch develop

# Install OmniQuery onto your target site
bench --site your-site.local install-app omniquery

# Build frontend production assets
bench build --app omniquery

# Clear cache and run database migrations
bench --site your-site.local migrate
bench --site your-site.local clear-cache
```

### Launching the PWA

Once installed, navigate directly to the standalone Progressive Web App in your browser:

```
http://your-site.local:8000/omniquery
```

Or click the **OmniQuery** app tile on the Frappe Desk apps launcher.

---

## ♿ Keyboard Navigation & Accessibility

OmniQuery strictly adheres to **WCAG 2.2 AA** non-text contrast and roving tabindex standards:

| Control | Key | Action |
| :--- | :--- | :--- |
| **Numeric Range / Rating Pills** | <kbd>Tab</kbd> | Focuses into the active value in the button row (treated as a single tab stop). |
| | <kbd>→</kbd> / <kbd>↓</kbd> | Increments value and shifts active radio focus. |
| | <kbd>←</kbd> / <kbd>↑</kbd> | Decrements value and shifts active radio focus. |
| | <kbd>Home</kbd> | Jumps immediately to minimum step. |
| | <kbd>End</kbd> | Jumps immediately to maximum step. |
| **Form Fields** | <kbd>/</kbd> | Jumps focus to the primary input filter. |
| **Global Desk** | <kbd>⌘K</kbd> / <kbd>Ctrl+K</kbd> | Native Frappe Awesomebar search. |

---

## 🧪 Testing & Code Quality

OmniQuery enforces high code quality through automated test suites and pre-commit hooks.

### Running Test Suites

```bash
# Run server-side unit & idempotency tests
bench --site your-site.local run-tests --app omniquery

# Run specific idempotent sync test
bench --site your-site.local run-tests --app omniquery --module omniquery.tests.test_idempotent_sync
```

### Code Formatting & Linters

OmniQuery uses [Ruff](https://github.com/astral-sh/ruff) for Python linting and import sorting, and Prettier/ESLint for web assets:

```bash
# Install pre-commit hooks locally
cd apps/omniquery
pre-commit install

# Run linters manually across all files
pre-commit run --all-files
```

---

## 🤝 Contributing

We welcome community contributions, bug reports, and enhancements! Please read our [CONTRIBUTING.md](CONTRIBUTING.md) guide and [CODE_OF_CONDUCT.md](CODE_OF_CONDUCT.md) before submitting pull requests.

1. Fork the repository on GitHub.
2. Create a feature branch (`git checkout -b feat/dynamic-lookup-filters`).
3. Commit your changes following [Conventional Commits](https://www.conventionalcommits.org/) (`git commit -m "feat: add dynamic cascading lookup filters"`).
4. Verify all tests pass locally (`bench run-tests --app omniquery`).
5. Open a Pull Request against the `develop` branch.

---

## 🔒 Security

For security advisories or vulnerability reports, please review our [SECURITY.md](SECURITY.md) policy or contact our security team directly at **[omniquery@ommnomi.com](mailto:omniquery@ommnomi.com)**.

---

## 📄 License

This project is licensed under the **MIT License** — see the [LICENSE](LICENSE) file for details.

---

<div align="center">
  <small>Mahunag · Karsog · Mandi, HP, India · <strong>OmmNoMi Automation LLP</strong></small>
</div>
