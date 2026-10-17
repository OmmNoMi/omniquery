# Manager Review Queue & Role-Aware Field App

Fixes #60

---

## What was the problem?
When an Operations Manager logged in, they were shown field surveyor screens with daily collection targets (`0/10 Daily Target`) instead of tools to manage and review incoming surveys. In Frappe Desk, the manager workspace had no review queue, no counters for pending forms, and no shortcut to review submitted surveys.

## What this PR does
1. **Added Desk Review Dashboard**: Added 3 counters to the Desk workspace for **Awaiting Review**, **Flagged Responses**, and **Collected Today**, plus a **To Review** quick shortcut.
2. **Manager Access Permissions**: Gave the `OmniQuery Manager` role permissions to read, write, and verify surveys, projects, and surveyor records.
3. **Role-Aware Field App**: The field mobile app now detects if the logged-in user is a Manager. If so, it hides surveyor daily collection targets and shows a Manager banner with a direct button to the Desk Review Queue.

---

## Visual Comparison (Before vs After)

### 1. Desktop — Manager Desk Workspace
| 🔴 Before (Broken) | 🟢 After (Fixed) |
| :---: | :---: |
| <img src="https://raw.githubusercontent.com/OmmNoMi/omniquery/fix/issue-60-manager-workspace-and-role-aware-app/docs/reports/issue-60/pre_fix_desktop.png" alt="Before - Desktop" width="450" /> | <img src="https://raw.githubusercontent.com/OmmNoMi/omniquery/fix/issue-60-manager-workspace-and-role-aware-app/docs/reports/issue-60/post_fix_desktop.png" alt="After - Desktop" width="450" /> |
| *Empty workspace with no review queue or number cards.* | *Workspace has 3 live cards (Awaiting Review, Flagged, Collected Today) + direct 'To Review' shortcut.* |

### 2. Mobile — Field App (PWA)
| 🔴 Before (Broken) | 🟢 After (Fixed) |
| :---: | :---: |
| <img src="https://raw.githubusercontent.com/OmmNoMi/omniquery/fix/issue-60-manager-workspace-and-role-aware-app/docs/reports/issue-60/pre_fix_mobile_375px.png" alt="Before - Mobile" width="280" /> | <img src="https://raw.githubusercontent.com/OmmNoMi/omniquery/fix/issue-60-manager-workspace-and-role-aware-app/docs/reports/issue-60/post_fix_mobile_375px.png" alt="After - Mobile" width="280" /> |
| *Manager was shown surveyor daily target: `0 / 10 Surveys`.* | *Daily target is hidden; Manager Review Queue banner is shown with link to Desk.* |

---

## Why this happened & How we fixed it

### Why did this happen?
1. The default workspace only created static links to DocTypes and didn't configure number cards or review filters for submitted forms.
2. The field app frontend was not getting the user's roles from Frappe session, so it couldn't tell whether someone was a Manager or a Surveyor.
3. Default DocType permissions didn't grant the `OmniQuery Manager` role access to review and approve surveys.

### How we prevented future errors (Mistake-Proofing)
- Added automated backend tests to ensure the Manager role always has review permissions.
- Added tests to ensure workspace number cards and review shortcuts are never accidentally removed during migrations.
- Added frontend unit tests to verify that manager roles never see surveyor daily targets.

---

## Verification & Test Results
- **Frontend Tests:** 68/68 passed (Vitest)
- **Backend Tests:** 66/66 passed (Frappe Python test suite)
- **Mutation & Safety Tests:** 5/5 passed
- **All CI Gates:** 100% Passed with zero regressions
