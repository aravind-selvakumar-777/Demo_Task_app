Status: Changes Requested
# PR 8 Code Review — KAN-36: Add Playwright e2e coverage for localStorage persistence

Repo: https://github.com/aravind-selvakumar-777/Demo_Task_app
PR: https://github.com/aravind-selvakumar-777/Demo_Task_app/pull/8

Source branch: feature/KAN-36 -> target: main

---

## Summary
This PR adds Playwright E2E tests, a Vitest unit-test setup, a `useLocalStorageState` hook, and persists state to localStorage. The direction is good, but there are two blocking issues that should be fixed before merging.

---

## Review plan

1. Correctness and behavior consistency (default seeds vs empty-on-first-run).
2. E2E reliability and selector stability.
2. Hook error handling and cross-tab sync semantics.
3. Dependency hygiene (version pinning/lockfile).

---

## Findings (blocking)

### Critical
None.

### High

1) SC-05 "no re-seeding" conflicts with app initialization and E2E assertions
- Files: src/App.tsx, e2e/taskBoard.spec.ts, docs/test_cases.md

- App initializes tasks with `starterTasks` when localStorage is empty, and the E2E stats assumes starter tasks count towards total (Total=5).
- In contrast, docs/test_cases.md SC-05 expects that once the board is empty, it remains empty and does not re-seed starter tasks.

 Blocking fix: choose one behavior and align app + docs + tests. Either:
 - No seeding by default (initial []), update E2E stats expectations and narrative, or
 - Always seed on first run and update SC-05 to match.

 2) E2E selectors brittle (coupled to CSS/dom internals)
- File: e2e/taskBoard.spec.ts
- Tests use `.task-card` and "button.delete-button". This can break on non-behavioral refactors (style/markup changes).
- Blocking fix: prefer accessible-stable selectors (aria-labels or testids) and/or keep all actions in role/name queries.

---

## Findings (non-blocking)

### Medium
- Persisting draft title/priority to localStorage may be unintended/privacy-sensitive (src/App.tsx). Confirm requirement; otherwise keep drafts in-memory only.
- Cross-tab clear semantics: on storage event clear, `onStorage` sets initialValue, then the persistent effect will write initialValue back to localStorage. Decide expected behavior and consider an option to skip persist on clear.

### Low
- E2E helpers use `any`; prefer typed Playwright Page for maintainability.


