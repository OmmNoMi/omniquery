# Contributing to OmniQuery

Thank you for your interest in contributing to **OmniQuery**! As an open-source project by [OmmNoMi Automation LLP](https://omniquery.ommnomi.com), we value clean architecture, accessibility, testability, and developer craftsmanship.

Please take a few moments to review these guidelines before submitting code or opening issues.

---

## 📜 Code of Conduct

All contributors and maintainers are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report unacceptable behavior to **[omniquery@ommnomi.com](mailto:omniquery@ommnomi.com)**.

---

## 🌿 Branching Strategy & Workflow

1. **`develop` Branch**: The active development branch. All feature branches and bugfixes must be branched from and merged into `develop`.
2. **`main` Branch**: Reserved exclusively for stable production releases with verified release tags (e.g. `v1.0.0`).
3. **Feature Branches**: Use descriptive branch names:
   * `feat/user-facing-feature`
   * `fix/range-slider-tabindex`
   * `docs/update-architecture`
   * `refactor/sync-savepoint-pipeline`

---

## 🏛️ Architectural & Coding Invariants

Every contribution must satisfy the following core engineering standards:

### 1. 100% Frappe Native ORM (Zero Raw SQL)
* **Never use raw SQL queries** (`frappe.db.sql`).
* Always use standard Frappe ORM APIs (`frappe.get_doc`, `frappe.get_all`, `frappe.get_value`, `frappe.db.set_value`) or the Query Builder (`frappe.qb`).
* This ensures complete database engine portability, automatic RBAC permission query condition enforcement, and parameter injection protection.

### 2. Modular Functions ($\le 10$ Lines)
* Every function or method must be strictly $\le 10$ executable lines of code.
* Decompose procedural blocks into single-purpose, pure helper functions.

### 3. WCAG 2.2 AA Accessibility Standards
* **Accessible Non-Interactive Elements**: Never place raw `aria-label` on un-roled generic `<div>` or `<span>` elements; use visually hidden text (`<span class="sr-only">`).
* **Composite Controls & Roving Tabindex**: Any button row or group representing a single question choice (such as rating pills or range slider numbers) must act as a **single tab group** (`role="radiogroup"`, `role="radio"`, with `tabindex="0"` on the active value and `-1` on others) navigable via <kbd>ArrowLeft</kbd> and <kbd>ArrowRight</kbd>.
* **Focus Visibility**: Explicit high-contrast focus indicators matching the active theme (`ring-2 ring-indigo-400 ring-offset-2`).

### 4. Zero-Data-Loss Offline Durability
* Any user interaction, form input, or section completion in the PWA MUST update the persistent IndexedDB Write-Ahead Log (`OmniQueryDB`) via Dexie.js before attempting any asynchronous background sync.

---

## 🛠️ Local Development Setup

### 1. Clone into your Frappe Bench
```bash
cd ~/frappe-bench
bench get-app https://github.com/OmmNoMi/omniquery.git --branch develop
bench --site your-site.local install-app omniquery
bench build --app omniquery
```

### 2. Setup Pre-commit Hooks
We enforce automated linting and formatting via `pre-commit`:
```bash
cd apps/omniquery
pip install pre-commit
pre-commit install
```

To run lint checks manually:
```bash
pre-commit run --all-files
```

### 3. Python Linting & Formatting
OmniQuery uses [Ruff](https://github.com/astral-sh/ruff) for Python:
```bash
# Check for lint issues
ruff check .

# Auto-format Python code
ruff format .
```

---

## 🧪 Testing Guidelines

1. **Automated Unit Tests**:
   * All backend business logic, validation rules, and sync pipelines must be covered by automated test cases under `omniquery/tests/`.
   * Run the test suite:
     ```bash
     bench --site your-site.local run-tests --app omniquery
     ```
2. **Database Cleanliness (Mandatory Teardown)**:
   * Any test creating records in the active database must clean up created test records in a `tearDown()` method or a `finally:` block. Never leave orphan records in the developer database.

---

## 📝 Commit Message Conventions

We follow [Conventional Commits](https://www.conventionalcommits.org/):

* `feat: add configurable range button format and arrow key navigation`
* `fix: prevent duplicate sync submissions on network reconnect`
* `docs: update PWA installation guide`
* `test: add unit test for survey savepoint rollback`
* `refactor: split survey section validator into single-purpose helpers`

---

## 🚀 Submitting a Pull Request

1. Push your branch to your fork on GitHub.
2. Open a Pull Request targeting the `develop` branch of `OmmNoMi/omniquery`.
3. Fill out the provided [Pull Request Template](.github/PULL_REQUEST_TEMPLATE.md).
4. Ensure all GitHub Actions CI checks pass.
5. A maintainer will review your code promptly.

Thank you for helping build next-generation offline data collection tooling!

---

<small>© 2026 OmmNoMi Automation LLP</small>
