# Implementation Plan: Persist Task Board Between Sessions

## Scope and Architecture Assumptions

- Source of truth: `requirements.md` (frozen), `architecture.md` (updated post-review), and `design-review.md`.
- **Design status: Conditionally approved for implementation** (`design-review.md`, "Review Outcome"). This plan treats the following three conditions as binding and traces each into a specific task/gate below rather than assuming they are already satisfied:
  1. `useLocalStorageState`'s `setState` must be React's raw `useState` setter (functional-updater compatible); persistence writes must live only inside a `useEffect`, never inside a `setState` updater (D-01). Carried into Tasks 1, 2, 4, 5, and the Task 9 sign-off gate.
  2. `try/catch` must wrap the full `window.localStorage` access expression (property access + method call as one statement), not just the method call (D-02). Carried into Tasks 1, 2, and the Task 9 sign-off gate.
  3. The 18-row Verification Matrix in `design-review.md` must be exercised — manually, since no test runner exists — before the feature is considered done (D-03 / Review Outcome condition 3). Carried into Task 8.
- Scope is limited to: one new hook file (`src/hooks/useLocalStorageState.ts`), colocated type guards in `src/App.tsx`, and wiring the existing `tasks`/`filter` `useState` calls in `src/App.tsx` to that hook. No new dependencies, no backend, no schema versioning, no multi-tab coordination, no bulk reset action — all explicitly excluded by `requirements.md` and confirmed by `architecture.md`.
- **No automated test runner is configured in this repository** (`package.json` has no Vitest/Jest/etc., confirmed by reading it directly). Every verification step in this plan that would normally be an automated test is instead a manual step, per `design-review.md`'s Review Outcome condition 3 and Residual Risks. This is recorded explicitly, not silently planned around.
- `starterTasks` may remain in the codebase (per `requirements.md` Assumptions and `architecture.md` Agreed Decision 9) but must never again be used as the initial value for the `tasks` state.
- Storage keys are fixed by the architecture: `taskboard.tasks` (JSON array of `Task`), `taskboard.filter` (JSON string, one of `'all' | 'open' | 'done'`). This plan does not reopen that decision.
- This plan does not write production code or tests; it only sequences the work described above.

## Task Breakdown (dependency order)

| # | Task | Priority | Dependencies | Deliverable | Verification Gate | Requirements Covered |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Scaffold `src/hooks/useLocalStorageState.ts` — read path only: lazy `useState<T>(initializer)` where the initializer wraps the **full** `window.localStorage.getItem(key)` access-and-call chain in one `try/catch` (condition 2), `JSON.parse`s the result, runs the caller-supplied validator, and falls back to `defaultValue` on missing key, thrown access/parse error, or validator rejection (never partial repair). Return `[state, setState]` with `setState` returned **unwrapped** from `useState` (condition 1). | P0 | None | New file `src/hooks/useLocalStorageState.ts` with the generic signature `useLocalStorageState<T>(key: string, defaultValue: T, isValid: (v: unknown) => v is T)`. | Code inspection: exactly one `useState` call; its initializer contains one `try` block wrapping the entire `window.localStorage.getItem(...)` statement (not a pre-obtained `localStorage` reference used unguarded); setter is returned as-is, no wrapper function. Manual trace against Verification Matrix rows 1, 8, 9, 10, 12, 13 (see `design-review.md`). | FR-003, FR-004, FR-005, FR-006, FR-007, FR-008, FR-010 |
| 2 | Add the write path to `useLocalStorageState.ts`: a single `useEffect` keyed on `[key, state]` that `JSON.stringify`s `state` and calls the full `window.localStorage.setItem(key, ...)` chain inside its own `try/catch` (condition 2). The write must not be moved inside the `setState` updater/reducer form used anywhere. | P0 | Task 1 | `useEffect` appended to the same file; hook now matches `architecture.md`'s "Components and Responsibilities" row for `useLocalStorageState`. | Code inspection: exactly one `useEffect` performs `setItem`; confirm no `localStorage` call exists inside any function passed as a `setState` argument anywhere in the file (this is the literal D-01 verification method from `design-review.md`). Manual trace against matrix rows 11, 13, 17 (write throws → swallowed, UI stays usable). | FR-001, FR-002, FR-009, NFR-001, NFR-002 |
| 3 | Add colocated type guards in `src/App.tsx` next to the existing `Task` type: `isTask(value: unknown): value is Task` (checks exactly `id: number`, `title: string`, `status: 'open'\|'done'`, `priority: 'Low'\|'Medium'\|'High'`, no `order` field per D-04), `isTaskArray` (`Array.isArray(value) && value.every(isTask)`), and `isFilterValue(value: unknown): value is 'all'\|'open'\|'done'`. | P0 | None (pure logic; can proceed in parallel with Tasks 1–2) | Three functions added to `src/App.tsx`, colocated with `Task` per `architecture.md`'s "Decisions Confirmed" (no separate module). | Manual trace against matrix row 9 (wrong shape — string id, missing field, bad enum value all rejected) and row 10 (unsupported filter value rejected); confirm no uniqueness/id-collision check is added (out of scope per D-06). | FR-007, FR-008 |
| 4 | Wire `tasks` state in `App.tsx`: replace `useState<Task[]>(starterTasks)` with `useLocalStorageState<Task[]>('taskboard.tasks', [], isTaskArray)`. Import the hook from `src/hooks/useLocalStorageState.ts`. | P0 | Tasks 1, 2, 3 | Updated `src/App.tsx` state declaration line; existing `addTask`/`toggleTask`/`deleteTask` bodies are otherwise untouched. | Existing functional-updater calls (`setTasks((currentTasks) => ...)`) must compile and behave unchanged, confirming drop-in `setState` compatibility (condition 1). Manual trace against matrix rows 1–6 (add/toggle/delete + refresh), row 14 (rapid double-submit), row 15 (StrictMode double-mount, dev only). | FR-001, FR-003, FR-005, FR-011, AC-001, AC-003, AC-004, BR-001 |
| 5 | Wire `filter` state in `App.tsx`: replace `useState<'all' \| Task['status']>('all')` with `useLocalStorageState<'all' \| Task['status']>('taskboard.filter', 'all', isFilterValue)`. | P0 | Tasks 1, 2, 3 | Updated `src/App.tsx` state declaration line; existing toolbar `setFilter(option)` calls untouched. | Manual trace against matrix row 7 (non-default filter survives refresh) and row 10 (malformed filter value falls back to `'all'` without crash). | FR-002, FR-004, FR-006, FR-008, AC-002, AC-005, AC-007 |
| 6 | Remove `starterTasks` as the default seed: confirm (and if needed, edit) that no call site passes `starterTasks` into any state initializer. Decide and record whether the constant is deleted or left declared-but-unused. | P1 | Task 4 | `src/App.tsx` diff showing `starterTasks` is no longer the `tasks` initial value. | `grep -n starterTasks src/App.tsx` shows either zero matches, or matches only in a dead/unused declaration — never in the `tasks` initializer position. Manual trace against matrix row 1 (first load, empty `localStorage` → empty board, no starter/demo tasks) and row 18 (delete last task, refresh → empty board, same code path as first load). | FR-005, BR-001, AC-004 |
| 7 | Build/type-check regression pass: run `npm run build` (`tsc -b && vite build`). | P0 | Tasks 1–6 | Clean, zero-error build output. | Build exits 0; `Task[]` and `'all'\|'open'\|'done'` generics resolve correctly at both `useLocalStorageState` call sites with no `any` leakage. | Tooling gate supporting all FRs by confirming shipped types match FR-007/FR-008's shape contracts |
| 8 | Manual verification pass: run `npm run dev`, and execute **all 18 rows** of `design-review.md`'s Verification Matrix against the running app, using DevTools/console to manipulate `localStorage` directly for the malformed-data, storage-unavailable, and quota rows (rows 8–13, 17). | P0 (release gate) | Tasks 1–7 | A recorded verification log (pass/fail per row 1–18) attached to the PR or commit, including the exact manipulation used per row (e.g., `localStorage.setItem('taskboard.tasks', '{not json')`; `Object.defineProperty(window, 'localStorage', { get() { throw new Error('blocked'); } })` for row 13). | All 18 rows pass. Any failing row is filed as a defect against the specific owning task (1–6) and blocks sign-off until re-verified. | All of FR-001–FR-012, AC-001–AC-009, BR-001–BR-005, NFR-001–NFR-002 (full matrix; see `design-review.md` rows 1–18) |
| 9 | Code-review sign-off against the three binding conditions from `design-review.md`'s "Review Outcome" before merge. | P0 (release gate) | Task 8 | Reviewer approval explicitly citing: (a) the file/line where `setState` is returned unwrapped and where the write lives only in a `useEffect` (D-01); (b) the file/line where the full `window.localStorage` access chain is wrapped in `try/catch` for both read and write (D-02); (c) the completed Task 8 verification log (D-03/condition 3). | PR is not merged until a reviewer checks off all three conditions by reference to actual code lines and the Task 8 log — not by assertion alone. | Process gate mapped to `design-review.md` Review Outcome conditions 1–3 |

Tasks 1 and 3 have no dependency on each other and may be implemented in parallel. Tasks 4 and 5 both depend on 1–3 but not on each other, and may be implemented in parallel (they touch different lines of `App.tsx`).

## Blocked Work

| Blocked task | Reason blocked | Unblocked by |
| --- | --- | --- |
| Automated unit/regression tests for `useLocalStorageState` and the type guards (e.g., mocking `Object.defineProperty(window, 'localStorage', ...)` as suggested in `design-review.md` D-02's verification note) | No test runner is configured in `package.json` (no Vitest/Jest/etc.) | A separate, explicitly out-of-scope decision to add a test framework to this repository. Until that happens, Task 8's manual verification pass is the substitute release gate — this is a documented residual gap, not a defect in this plan. |
| Any matrix row in Task 8 that fails | The task (1–6) that owns the failing behavior has a defect | A fix to the owning task, followed by re-running the specific failing row(s) in Task 8 (not necessarily the full matrix, unless the fix could have side effects on other rows — reviewer judgment) |
| Task 9 sign-off | Depends on Task 8's verification log existing and showing all-pass | Completion of Task 8 |

No other task in this plan is currently blocked — the architecture is conditionally approved with all conditions traced into the tasks above, and no open decision in `architecture.md` or `design-review.md` remains unresolved (see `design-review.md` "Decisions Confirmed in Design Review" and "Agreed Design Decisions" — all four originally-open items were resolved during review).

## Requirement and Acceptance-Criteria Coverage

| Requirement | Covered by task(s) |
| --- | --- |
| FR-001 (write full task list on every mutation) | Task 2, Task 4, Task 8 (rows 2–6) |
| FR-002 (write filter on every change) | Task 2, Task 5, Task 8 (row 7) |
| FR-003 (restore task list on startup if valid) | Task 1, Task 4, Task 8 (row 2) |
| FR-004 (restore filter on startup if valid) | Task 1, Task 5, Task 8 (row 7) |
| FR-005 (empty array default; no `starterTasks` seed) | Task 1, Task 4, Task 6, Task 8 (rows 1, 18) |
| FR-006 (`'all'` default filter) | Task 1, Task 5, Task 8 (row 1) |
| FR-007 (discard malformed/wrong-shape task data) | Task 1, Task 3, Task 8 (rows 8, 9) |
| FR-008 (discard malformed filter value) | Task 1, Task 3, Task 8 (row 10) |
| FR-009 (silent write-failure handling) | Task 2, Task 8 (rows 11, 13, 17) |
| FR-010 (silent read-failure handling) | Task 1, Task 8 (rows 12, 13) |
| FR-011 (preserve ordering, no re-sort) | Task 1, Task 2 (positional array order only, no `order` field per D-04), Task 8 (row 3) |
| FR-012 (no backend/auth/network) | Task 1, Task 2 (design contains no such calls — negative verification), Task 8 (implicitly, by absence) |
| NFR-001 (no noticeable latency; sync calls acceptable) | Task 1, Task 2, Task 7 |
| NFR-002 (graceful degradation; UI stays usable in-memory) | Task 2, Task 8 (rows 11–13, 17) |
| BR-001 (empty board by default, no starter tasks) | Task 4, Task 6, Task 8 (row 1) |
| BR-002 (no cross-browser/device sync) | Task 1, Task 2 (no such mechanism exists — negative verification) |
| BR-003 (no bulk reset; Delete remains sole removal path) | Task 4 (unchanged `deleteTask`), Task 8 (row 6) |
| BR-004 (write failures never surfaced to user) | Task 2, Task 8 (rows 11, 13, 17) |
| BR-005 (task data stays local, no backend/account) | Task 1, Task 2 (negative verification) |
| AC-001 (refresh restores tasks with same order/status/priority) | Task 4, Task 8 (rows 2–6) |
| AC-002 (non-default filter survives refresh/reopen) | Task 5, Task 8 (row 7) |
| AC-003 (persisted board reflects mutation immediately) | Task 2, Task 4, Task 8 (rows 2, 6) |
| AC-004 (no saved data → empty board, no starter tasks) | Task 4, Task 6, Task 8 (row 1) |
| AC-005 (no saved filter → defaults to `all`) | Task 5, Task 8 (row 1) |
| AC-006 (malformed task data → empty list, no crash) | Task 1, Task 3, Task 8 (rows 8, 9) |
| AC-007 (malformed filter → defaults to `all`, no crash) | Task 1, Task 3, Task 8 (row 10) |
| AC-008 (storage unavailable/write throws → session stays usable) | Task 2, Task 8 (rows 11–13) |
| AC-009 (no cross-device sync) | Task 1, Task 2 (negative verification — no mechanism exists to test) |

All 12 FRs, 9 ACs, 5 BRs, and 2 NFRs from `requirements.md` are covered by at least one implementation task and at least one Task 8 verification-matrix row, consistent with `design-review.md`'s Requirement Traceability Check (no coverage gaps found there either).

## Definition of Done

1. `src/hooks/useLocalStorageState.ts` exists and matches `architecture.md`'s Components and Responsibilities entry exactly: raw `useState` setter returned unwrapped (D-01); reads happen only in the lazy initializer; writes happen only in a `useEffect` keyed on `[key, state]`; both the read and write `try/catch` blocks wrap the full `window.localStorage` access chain, not just method calls (D-02).
2. `src/App.tsx` uses `useLocalStorageState('taskboard.tasks', [], isTaskArray)` for `tasks` and `useLocalStorageState('taskboard.filter', 'all', isFilterValue)` for `filter`; `starterTasks` is no longer used as a default seed anywhere.
3. `npm run build` (`tsc -b && vite build`) completes with zero errors (Task 7).
4. All 18 rows of `design-review.md`'s Verification Matrix have been manually executed and recorded as passing (Task 8) — since no automated test runner exists in this repository, this manual pass is the only executable verification and is treated as a mandatory gate, not an optional nice-to-have.
5. A reviewer has explicitly signed off against all three binding conditions in `design-review.md`'s "Review Outcome" section, citing specific code locations and the Task 8 verification log (Task 9).
6. No regression in pre-existing task-board behavior: add task, toggle done/open, delete task, and the three filter buttons all continue to work exactly as before this feature, now with persistence layered on top.
7. `starterTasks`'s disposition (deleted vs. retained-unused) is explicitly recorded in the PR description, not left ambiguous.

## Residual Risks (carried from `design-review.md`; not mitigated by this plan, tracked for awareness)

- **Write-timing edge case on instantaneous unload**: the write runs in a post-commit `useEffect`, not synchronously in the event handler. A tab close/crash in the instant between a state commit and the effect flushing could lose that single last write. Accepted per NFR-001; not testable without a real browser; no mitigation is required by the requirements or planned here.
- **No user-facing signal when persistence is entirely unavailable**: by design (BR-004), a user in a fully storage-disabled environment gets no indication their work won't survive a refresh. Required behavior, not a defect — noted for team awareness.
- **Multi-tab last-write-wins**: explicitly out of scope and untested per `requirements.md`'s own Assumptions; no cross-tab coordination is planned.
- **Pre-existing `Date.now()` id-collision risk** (D-06): unrelated to this feature but now made durable across sessions once persisted. Out of scope for this story; flagged for a possible future, separate story (e.g., `crypto.randomUUID()`).
- **No automated test runner in this repository**: the Verification Matrix (Task 8) is executed manually as the only available gate. If the matrix is re-run later (e.g., after an unrelated refactor), it will again have to be done manually until a test framework is introduced — a separate, out-of-scope decision.
