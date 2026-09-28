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

### 1. Visual Form & Survey Designer in Frappe Desk
- **Dynamic Schema Builder**: System Managers and Survey Admins can design any survey form directly from Frappe Desk without touching JSON files or database migrations.
- **Field Type Palette**:
  - Single Choice (`Radio` / Circle indicators)
  - Multiple Choice (`Checkboxes` / Square indicators)
  - Number / Currency / Year range sliders
  - Repeating Grid / Matrix tables with pre-fill configuration
  - GPS Coordinate capture with accuracy threshold filters
  - Media / Photo attachment with inline WebP compression
- **Section & Pagination Manager**: Visual drag-and-drop reordering of survey sections, question grouping, and page breakpoints.

### 2. Centralized Multilingual Translation Studio
- **Admin Translation Console**: Admins can manage translations for questions, helper hints, option labels, and section titles directly from Frappe Desk across all 11 scheduled Indian languages (Hindi, Gujarati, Marathi, Punjabi, Bengali, Tamil, Telugu, Kannada, Malayalam, Urdu, and English).
- **Versioning & Fallback**: Automatic schema hash invalidation on translation updates; graceful fallback to English or Hindi when a specific dialect string is absent.

### 3. Project Manager & Supervisor Desk Interface
- **Role-Based Workstation Access**: Dedicated workspace for Project Managers (`OmniQuery Manager`) to inspect incoming responses, view real-time sync progress, and audit GPS locations on satellite maps.
- **Frappe Desk Form View**: Clean read-only and review mode for any submitted response directly inside Frappe Desk, matching the PWA field layout.

### 4. Interactive Analytics & Insights Dashboard
- **Cross-Tabulation Engine**: Live cross-tabs (e.g. Enterprise Type vs Average Monthly Profit; Seasonality vs Working Capital Shortage).
- **Outlier & Quality Flags**: Automated detection of anomalous numerical entries (e.g., monthly profit > monthly sales, impossible family member counts).
- **Export Formats**: One-click export to CSV, Excel, SPSS, and GeoJSON for GIS mapping.

---

## 💻 Code Quality & Engineering Standards

### 1. The <= 10 Line Function Rule
- Every function in the codebase must strictly adhere to single-responsibility and never exceed **10 lines of executable code**.
- Large workflows are decomposed into named pipelines of pure, composable helper functions.

### 2. Configuration-Driven Architecture
- Zero hardcoded question codes or business logic inside view templates.
- All field behavior, validation rules, grid schemas, and option groupings are driven by centralized, declarative configuration dictionaries.

### 3. Idempotent Offline Sync & Anti-Loss Invariants
- IndexedDB Write-Ahead Log (WAL) backed by Dexie.js.
- CSRF validation with automatic session binding (`X-Frappe-CSRF-Token`).
- Honest status reporting: toast messages must never claim "Sync complete" if any transaction in the batch failed or remains in `PENDING_SYNC`.
