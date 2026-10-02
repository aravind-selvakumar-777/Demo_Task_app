Status: Changes Requested

Summary
- PR #10 (feat(KAN-42)) adds Playwright E2E coverage for task board behavior, unit testing infrastructure (Vitest + Testing Library), and documentation.
- Latest reviewed commit SHA: 3f361744efb3f7c283b4347ffb4bde2724c790fa.

---

Review plan
1. Fetch the current PR diff and review all changed files (product, tests, config, docs, dependencies).
2. Verify correctness of localStorage persistence and page reload resilience.
3. Review security/input validation, error handling, and logging for storage failures.
4. Review test suites (unit + E2E) for flakiness, determinism, and coupling to implementation details.
5. Inspect new/updated dependencies and lockfile changes safety (version pinning, Node engine mismatches, reproducibility).

---

Findings

Critical
- No findings in this category.

High
- [Dependencies] Use of "latest" version ranges and Node engine mismatch risk.
  - Files: package.json, package-lock.json
  - Detail: several dependencies are set to "latest" (@playwright/test, vitest, jsdom, Testing Library packages, Vite/React/TypeScript). This removes reproducible builds and can break CI or dev envs unexpectedly when breaking major releases drop.
  - The lockfile also indicates transitive packages with narrow Node engine requirements (some require node >=22, some >=20), which can be incompatible with the repo's CI/dev Node version if it's older.
  - Impact: non-deterministic installs, likely random breakage, difficult to troubleshoot.
  - Recommended: pin dependencies to semver ranges (e.g. ^1.63.0 for @playwright/test, ^5.x for vitest, and a specific jsdom version), add an "engines" field in package.json if appropriate, and keep package-lock.json authoritative.

- [E2E] E2E tests rely on implementation-specific CSS selectors for stats.
  - File: e2e/task-board.spec.ts (TC-02, TC-10, TC-12, TC-20b)
  - Detail: uses selector ".stats-grid > div > span" and assumes order maps to Total/Open/Done. Minor markup changes (e.g. reordering stats, adding a span) will fail tests without behavior change.
  - Recommended: locate each stat card by its label text (e.g. "Total") and assert the number inside that card, or add data-testid attributes.

Medium
- [Correctness] Filter and input are persisted to localStorage.
  - File: src/App.tsx
  - Detail: the app persists not only tasks but also form input (stored under "demo_task_board_title"), priority select ("demo_task_board_priority") and filter ("demo_task_board_filter"). On reload, the input can reappear pre-filled, and the filter can start as open/done, which may surprise users.
  - Recommended: confirm if this is intended. If not, keep these in non-persisted state or reset them on mount. At minimum, document as intended behavior in README.

- [Correctness] ID generation uses Date.now(), which can collide in high-speed automated flows.
  - File: src/App.tsx
  - Detail: two tasks added in the same millisecond can get the same id, causing key collisions.
  - Recommended: use crypto.randomUUID() (when available), or store a persisted incrementing counter in localStorage.

- [Security/Observability] Console warnings log raw error objects.
  - Files: src/storage.ts, src/useLocalStorage.ts
  - Detail: logging error objects is fine for a demo app, but in more sensitive environments it can expose storage details.
  - Recommended: gate verbose logs behind a dev-only check, or log only string messages.

Low
- [Docs] docs/impl_plan.md has typos and invalid code samples.
  - File: docs/impl_plan.md
  - Detail: misspellings ("Arcitecture", "Persistance", "heore", "persistance.ts"), inconsistent checkbox format, and a code sample typo (e.g. Task[]] and a trailing slash).
  - Recommended: fix typos and syntax to keep docs trustworthy (non-blocking).

- [E2E] The resetStorage helper performs an extra reload per test.
  - File: e2e/task-board.spec.ts
  - Recommended: consider using context.addInitScript() to clear storage before page load, or a Playwright storageState fixture for speed.

---

Suggested fixes & test recommendations
1. (Blocking) Pin dependencies and add a Node engine policy.
   - Replace "latest" with explicit semver ranges.
   - Add package.json "engines" to match Playwright/Vitest requirements.
   - Recreate lockfile with the intended Node version.
2. Harden E2E selectors.
   - Avoid ".stats-grid > div > span" ordering; use label-driven locators or data-testid.
3. Consider improving task id generation.
   - Switch to crypto.randomUUID() or persisted counter.
4. Decide on persistence scope.
   - If persisting filter/input is intended: document clearly. If not: revert to useState.
5. Docs cleanup.
   - Fix typos and code snippet syntax.

---

Follow-up checklist
- [ ] Pin dependencies (remove "latest") and set Node engine policy.
- [ ] Make E2E assertions less fragile (avoid CSS order dependence).
- [ ] Fix docs/impl_plan.md typos/code sample.
- [ ] Optional: improve id generation.
- [ ] Verify CI runs under intended Node/npm versions.
