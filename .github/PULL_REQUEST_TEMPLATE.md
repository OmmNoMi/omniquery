## Description

<!-- Briefly describe the rationale, architectural impact, and summary of changes introduced in this PR. -->

## Related Issues

<!-- Link related issues here (e.g. Closes #123, Fixes #456). -->

## Type of Change

- [ ] 🐛 Bug fix (non-breaking change fixing an issue)
- [ ] ✨ New feature (non-breaking change adding functionality)
- [ ] ♿ Accessibility enhancement (WCAG 2.2 AA conformance)
- [ ] ⚡ Performance optimization
- [ ] 📝 Documentation update
- [ ] 🧪 Tests / CI improvement
- [ ] 🔄 Refactoring (no functional changes)

## Quality & Architectural Checklist

- [ ] **Zero Raw SQL**: Uses strictly Frappe native ORM (`frappe.get_doc`, `frappe.get_all`, `frappe.qb`); zero `frappe.db.sql`.
- [ ] **Function Length**: Functions are modular and adhere to $\le 10$ executable lines.
- [ ] **Accessibility (WCAG 2.2 AA)**: Interactive composite controls implement roving tabindex (`role="radiogroup"`, `role="radio"`) and theme-consistent focus indicators.
- [ ] **Offline Durability**: PWA state writes to IndexedDB WAL before attempting network operations.
- [ ] **Test Coverage**: Automated unit test cases added/updated under `omniquery/tests/`.
- [ ] **Teardown**: Any test records created are cleaned up in `tearDown()` or `finally:` block.
- [ ] **Formatting**: Ran `pre-commit run --all-files` (`ruff check`, `ruff format`, `prettier`).
- [ ] **Documentation**: Updated `README.md`, `ROADMAP.md`, or `ARCHITECTURE.md` if applicable.
