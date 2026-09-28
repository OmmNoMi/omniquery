# Changelog

All notable changes to **OmniQuery** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [0.1.0] - 2026-09-29

### Added
* **🛡️ Zero-Data-Loss Offline PWA**:
  * Persistent IndexedDB Write-Ahead Logging (WAL) powered by Dexie.js (`OmniQueryDB`).
  * Dedicated service worker (`sw.js`) pre-caching static assets for complete offline capability at `/omniquery`.
  * Offline submission queue with automatic background sync upon network reconnection.
  * Encrypted local JSON and CSV export/backup utilities.
* **🔁 Client-Side Idempotency & Atomic Ingestion**:
  * Cryptographic UUIDv4 idempotency tokens per submission preventing duplicate responses on flaky networks.
  * Atomic MariaDB savepoints (`sp_sync_<uuid>`) per submission in `omniquery.api.sync.batch_push`.
  * Deduplication audit log (`OmniServey Sync Audit Log`) for caching and instant idempotent responses.
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
