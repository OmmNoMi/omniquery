# <span style="font-family:'Roboto',sans-serif;font-weight:900;"><span style="color:#4285f4;">Omm</span><span style="color:#34a853;">No</span><span style="color:#ea4335;">M</span><span style="color:#fbbc05;">i</span></span> OmniQuery — System Architecture & Developer Guide

> **Scope**: High-level design, offline ACID transaction log, data ingestion contracts, configuration-driven rendering, and clean coding invariants for OmniQuery developers.

---

## 1. System Overview

OmniQuery is an enterprise offline-first survey and dynamic form platform designed for low-connectivity field environments, large-scale enumerations, and complex socioeconomic studies.

```
┌─────────────────────────────────────────────────────────────────┐
│               OmniQuery PWA (/omniquery)                       │
│  - Vue 3 (Reactive, Accessibility-First)                       │
│  - Dexie.js (IndexedDB Write-Ahead Log: OmniQueryDB)           │
│  - Configuration-Driven Field & Grid Engine                    │
└──────────────────────────────┬──────────────────────────────────┘
                               │
                HTTP / HTTPS JSON Sync
         (Idempotent Batch Push with UUIDv4)
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│             Frappe v16 Backend (OmniQuery Core)                │
│  - API Whitelist: `omniservey.api.sync.batch_push`              │
│  - Session & CSRF Token Validation                             │
│  - Atomic MariaDB Savepoints (`sp_sync_<uuid>`)                │
│  - OmniQuery Sync Audit Log (Deduplication Cache)              │
│  - OmniQuery Response (Normalized Question/Value Rows)         │
│  - Dynamic Mapping to Project DocTypes                         │
└─────────────────────────────────────────────────────────────────┘
```

---

## 2. Invariants & Code Standards

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

---

## 3. Data Dictionary: Pre-Populated Grid Matrices

### 1. `seasonal_turnovers`
- **DocType**: `SHG Survey Seasonal Turnover`
- **Fixed Rows**:
  1. `season`: `"Peak season"`, `duration_months`: 3, `monthly_sales`: 0, `monthly_profit`: 0
  2. `season`: `"Average"`, `duration_months`: 6, `monthly_sales`: 0, `monthly_profit`: 0
  3. `season`: `"Lean"`, `duration_months`: 3, `monthly_sales`: 0, `monthly_profit`: 0

### 2. `activity_involvements`
- **DocType**: `SHG Survey Activity Involvement`
- **6 Fixed Activities**: Purchase of material, Production, Servicing, Social media marketing, Sale, Record keeping.

### 3. `capital_sources`
- **DocType**: `SHG Survey Capital Source`
- **14 Sources**: Own Savings, Family member finance, Business profit, Mortgaged gold/silver, Sold gold/silver, Family loan, Moneylender loan, SHG loan, OSF/SVEP loan, OSF/SVEP subsidy, Private saving group/BC, NBFC loan, Mudra loan, Bank loan.

### 4. `loan_usages`
- **DocType**: `SHG Survey Loan Usage`
- **14 Sources**: Same 14 sources as capital.

### 5. `business_metric_changes`
- **DocType**: `SHG Survey Business Metric Change`
- **4 Metrics**: Average sales/month, Average monthly income, Value of stock/finished goods, Servicing enterprise related assets.
