# Implementation Plan: Persist Task Board Between Sessions

- Branch: `claude_persist-task-board`
- Source documents: `Docs_persist-task-board/requirements.md`,
  `Docs_persist-task-board/architecture.md` (updated by design review with the
  duplicate-id validation fix), `Docs_persist-task-board/design-review.md`
- Codebase grounding: `src/App.tsx` (current implementation, read in full),
  `package.json` (current tooling, read in full)
- Plan author date: 2026-09-29

## Approval status

`design-review.md`'s Review Outcome states: **"Conditionally approved for
implementation."** No blocking architectural flaw remains and the one
correctness gap found (Finding 1, duplicate-`id` validation) has already been
applied to `architecture.md`. The review lists three conditions to close out
*alongside* implementation, none requiring further redesign:

1. Implement `isValidTaskArray`'s duplicate-`id` rejection exactly as
   specified — **not a decision, a coding task.** See Task 6.
2. Explicitly decide and record whether automated tests are added or
   verification is manual-only (Finding 3) — **a decision, resolved in this
   plan below.**
3. Explicitly decide the empty-state copy behavior (Finding 4) — **a
   decision, resolved in this plan below.**

Because the architecture is approved and none of the three conditions
requires new design work, this plan proceeds directly to task breakdown. No
part of this feature is blocked on unresolved architecture. The two open
*decisions* (test tooling, empty-state copy) are resolved below as explicit,
recorded choices — per the instructions governing this plan, they are not
silently defaulted, and either document says either option was acceptable.

## Resolution of the 3 open conditions

### Condition 1 — Duplicate-id rejection in validation
**Resolution: implement as specified, no alternative considered.** This is
fully specified in `architecture.md`'s `isValidTaskArray` contract and
`design-review.md` Finding 1: `isValidTaskArray` must return `false` if any
two entries in the candidate array share the same `id`, in addition to the
existing per-item field/type/enum checks. Tracked as Task 6 below, verified
by Verification Matrix row 8.

### Condition 2 — Test-tooling approach (design-review Finding 3)
**Decision recorded in this plan: Option (a) — add a minimal test runner
(`vitest`) and write unit tests for the pure predicates and the storage
wrapper.**

Rationale for choosing (a) over manual-only verification (b):
- The architecture's own stated rationale for isolating logic into
  `taskBoardStorage.ts`/`browserStorage.ts` is "so save/load/validate can be
  unit tested." Choosing (b) would leave that architectural rationale
  permanently unfulfilled.
- The Verification Matrix in `design-review.md` is already table-shaped
  (input → expected result), which maps directly onto unit test cases with
  near-zero translation cost.
- `vitest` has no runtime footprint on the shipped app (it is a `devDependency`
  only, uses the existing Vite config, and does not touch `App.tsx`'s
  production behavior) — it does not violate the architecture's "no new
  dependency for the app itself" stance, since the architecture's dependency
  constraints are about the *runtime* (no schema library, no state library),
  not about test tooling, which requirements.md never restricts.
- Rows 1, 3–9 of the Verification Matrix (parsing/shape/enum/duplicate-id
  boundary cases) are pure-function tests with no DOM, no timers, and no
  `localStorage` mocking beyond a simple in-memory stub — cheap to write and
  durable as a regression net for future changes to the same predicates.

This decision is recorded here, not silently assumed; it is called out as an
**assumption requiring stakeholder confirmation** in "Residual risks" below,
since design-review.md explicitly says either option is acceptable. If the
decision owner overrides this choice in favor of option (b) before or during
implementation, Tasks 3, 7, and 8 below are dropped and Task 13 (manual
verification) becomes the sole verification gate for FR-008/FR-009/FR-010 —
no other task in this plan changes.

Rows 2, 10–17 of the Verification Matrix (storage-disabled simulation,
component-level create/toggle/delete/filter flows, refresh persistence) stay
**manual**, even under option (a): they exercise `App.tsx` end to end (real
DOM interaction, a real page reload) and are out of proportion to set up with
`@testing-library/react` for a two-effect, two-file feature. This is a
deliberate scope boundary, not an oversight — see Task 13.

### Condition 3 — Empty-state copy wording (design-review Finding 4)
**Decision recorded in this plan: branch the copy.** Replace the single
reused string with a conditional:
- `tasks.length === 0` → `"No tasks yet — add one above."`
- otherwise (filter produced zero visible tasks from a non-empty list) →
  `"No tasks match this filter."`

Rationale: `design-review.md` Finding 4 flags the reused string as
ambiguous specifically on first run (`filter === 'all'`, zero tasks) —
"no tasks match this filter" reads oddly when there is no filter mismatch at
all. The conditional costs one ternary and zero new state, matches the
architecture's "no new UI states are required" framing (no new component,
no new state variable — only a display-time branch on already-existing
`tasks.length`), and gives AC-004's "genuinely empty task list" a
correctly-worded confirmation instead of filter-mismatch language. Tracked as
Task 12 below, verified by Verification Matrix row 1 (reworded to check the
new first-run copy) and a new manual check for the filtered-to-empty case.

## Scope and architecture assumptions

- This plan only sequences implementation and verification tasks; it does not
  write production code, test code, or restate the architecture's design
  rationale beyond what is needed to justify task order.
- Files to create: `src/types.ts`, `src/storage/browserStorage.ts`,
  `src/storage/taskBoardStorage.ts`, plus (per Condition 2's decision)
  `src/storage/browserStorage.test.ts` and
  `src/storage/taskBoardStorage.test.ts`.
- File to modify: `src/App.tsx` (remove `starterTasks` and inline `Task`
  type; import shared types; switch `tasks`/`filter` `useState` to lazy
  initializers backed by the storage module; add two `useEffect` persistence
  hooks; branch the empty-state copy). No other file changes are in scope.
  `src/App.css`/`src/index.css` are explicitly unchanged per the architecture.
- `package.json` changes (per Condition 2): add `vitest` as a `devDependency`
  and a `"test": "vitest run"` script. No other dependency changes — the
  architecture explicitly rejects a schema-validation library (e.g., zod),
  a state-management library, and a generic `usePersistedState` hook for this
  story; none of those is reintroduced here.
- No backend, network call, routing change, or new UI component is introduced
  anywhere in this plan, consistent with `requirements.md`'s "Out of scope"
  section and `architecture.md`'s recommendation.
- State ownership does not change: `App.tsx` remains the sole owner of live
  `tasks`/`filter` React state; the two new storage modules are stateless and
  called imperatively, exactly as specified in architecture.md's "State
  ownership summary."

## Task table (dependency order)

Priority: **P0** = must complete for the feature to be functionally correct
and safe; **P1** = required to close a named design-review condition but does
not change runtime behavior if skipped now (still must close before "done");
**P2** = quality/regression hardening, can slip only with explicit sign-off.

| # | Task | Priority | Depends on | Deliverable | Verification |
| --- | --- | --- | --- | --- | --- |
| 1 | Record test-tooling decision (Condition 2) in the PR description before writing code | P1 | none | A short note in the PR/commit describing the chosen option (a) and rationale, per "Resolution of the 3 open conditions" above | Reviewer confirms the PR description states the decision explicitly (design-review Finding 3's verification requirement) |
| 2 | Record empty-state copy decision (Condition 3) in the PR description before writing code | P1 | none | Same PR description names the two-string branch and the exact wording chosen | Reviewer confirms the PR description states the decision (design-review Finding 4's verification requirement) |
| 3 | Add `vitest` devDependency and `test` script to `package.json` | P1 | Task 1 | `package.json` gains `"vitest"` under `devDependencies` and `"test": "vitest run"` under `scripts`; no changes to `dependencies` | `npm install` succeeds; `npm run test` runs (with zero test files initially) without a configuration error |
| 4 | Create `src/types.ts` with `TaskStatus`, `TaskPriority`, `FilterOption`, `Task` exactly as specified in `architecture.md`'s "Data Model and State Ownership" section | P0 | none (parallel with Tasks 1–3) | `src/types.ts` | `tsc -b` compiles the new file with no errors; types match the shape currently inlined in `App.tsx` line 4-9 field-for-field (no drift) |
| 5 | Create `src/storage/browserStorage.ts`: `readRaw(key)` / `writeRaw(key, value)` wrapping `window.localStorage` access in `try/catch`, returning `null`/`false` on any failure, never throwing, and emitting no `console.*` output on failure (per design-review Decision 2, "storage-failure logging stays fully silent") | P0 | none (parallel with Task 4) | `src/storage/browserStorage.ts` exporting the `SafeStorage`-shaped functions | `tsc -b` compiles; manually or via unit test (Task 7) confirm a thrown `getItem`/`setItem` is caught and swallowed with no console output |
| 6 | Create `src/storage/taskBoardStorage.ts`: `loadTasks`, `saveTasks`, `loadFilter`, `saveFilter`, and the internal predicates `isValidTask`, `isValidTaskArray` (including the **duplicate-`id` rejection**, Condition 1), `isValidFilter`, using the two keys `task-board:tasks` / `task-board:filter` | P0 | Task 4, Task 5 | `src/storage/taskBoardStorage.ts` | `tsc -b` compiles; behavior matches Verification Matrix rows 1, 3–9 (checked here via unit tests if Task 8 is in scope, otherwise deferred to Task 13's manual pass) |
| 7 | Unit tests for `browserStorage.ts` (storage-disabled/throwing `getItem`/`setItem`, normal read/write round-trip) | P2 | Task 3, Task 5 | `src/storage/browserStorage.test.ts` | `npm run test` passes; covers Verification Matrix row 10 and the write-throws half of row 11 |
| 8 | Unit tests for `taskBoardStorage.ts` predicates (missing field, wrong type, out-of-enum `status`/`priority`, duplicate `id`, invalid JSON, non-array JSON, invalid filter value, valid round-trip) | P2 | Task 3, Task 6 | `src/storage/taskBoardStorage.test.ts` | `npm run test` passes; covers Verification Matrix rows 1, 3–9 as automated tests |
| 9 | Modify `App.tsx`: remove the inline `Task` type (lines 4-9) and `starterTasks` constant (lines 11-15); import `Task`, `TaskStatus`, `TaskPriority`, `FilterOption` from `../types` (or `./types`) | P0 | Task 4 | Updated `App.tsx` imports; no `starterTasks` symbol remains anywhere in the file | `tsc -b` compiles with no unused-import or missing-type errors; `Grep` for `starterTasks` in `src/` returns no matches |
| 10 | Modify `App.tsx`: change `useState<Task[]>(starterTasks)` to `useState<Task[]>(() => loadTasks())` and `useState<FilterOption>('all')` to `useState<FilterOption>(() => loadFilter())`, importing `loadTasks`/`loadFilter` from `./storage/taskBoardStorage` | P0 | Task 6, Task 9 | Updated `useState` initializers in `App.tsx` | Manual: with no `localStorage` keys present, app renders with 0 tasks and filter `all` (Verification Matrix row 1); with a hand-seeded valid `task-board:tasks`/`task-board:filter` pair, app restores them on load (row 2) |
| 11 | Modify `App.tsx`: add `useEffect(() => saveTasks(tasks), [tasks])` and `useEffect(() => saveFilter(filter), [filter])`, importing `saveTasks`/`saveFilter` from `./storage/taskBoardStorage` and `useEffect` from `react` | P0 | Task 10 | Two new `useEffect` hooks in `App.tsx`; no `saveTasks`/`saveFilter` calls added inside `addTask`/`toggleTask`/`deleteTask`/`setFilter` call sites themselves | Manual, using browser devtools Application tab: create, toggle, delete a task and change the filter; confirm `localStorage['task-board:tasks']` / `['task-board:filter']` update after each action (Verification Matrix rows 12-15); refresh the page and confirm state survives (row 16) |
| 12 | Modify `App.tsx`: branch the empty-state message per Condition 3's decision — `tasks.length === 0 ? "No tasks yet — add one above." : "No tasks match this filter."` replacing the single string at line 140 | P1 | Task 2 | Updated JSX in the `task-list` render branch | Manual: (a) zero tasks, filter `all` → shows "No tasks yet — add one above."; (b) at least one task exists but the current filter hides all of them → shows "No tasks match this filter." |
| 13 | Manual verification pass against the full `design-review.md` Verification Matrix (all 17 rows), including the rows not covered by unit tests (2, 10-17) and confirming NFR-002 (no visible lag with ~tens of tasks) and NFR-003/FR-011/AC-007 (no network tab activity, no login UI) | P0 | Tasks 6, 9, 10, 11, 12 (and 7, 8 if in scope) | A completed checklist (can be pasted into the PR description) mapping each of the 17 matrix rows to pass/fail | All 17 rows pass; any failing row blocks merge until fixed and re-verified |
| 14 | Type-check and build the whole app: `npm run build` (`tsc -b && vite build`) | P0 | Tasks 9-12 (all `App.tsx` edits complete) | Clean build output | `npm run build` exits 0 with no TypeScript errors and no Vite build warnings introduced by this feature |
| 15 | Final PR write-up: confirm both open-condition decisions (Tasks 1-2) are stated in the PR description, list which Verification Matrix rows were automated vs. manual, and note residual risks (see below) | P1 | Task 13, Task 14 | PR description | Reviewer can confirm design-review Finding 3 and Finding 4's "Verification" requirements are satisfied by reading the PR description alone |

### Parallelization notes
- Tasks 1 and 2 (decision recording) can happen in either order or together,
  and do not block Tasks 4-6 (they only gate Tasks 3, 7, 8, and 12).
- Tasks 4 and 5 have no dependency on each other and can be done in parallel
  (by the same or different engineers).
- Tasks 7 and 8 (unit tests) can be written in parallel with each other once
  their respective source files (5, 6) exist, and in parallel with Tasks 9-12
  (App.tsx edits), since they exercise the storage modules in isolation, not
  `App.tsx`.
- Tasks 9, 10, 11, 12 are **sequential on the same file** (`App.tsx`) and
  should not be parallelized across engineers to avoid merge conflicts on a
  ~150-line file; they are listed in the order that keeps the file compiling
  after each step (imports → state source → persistence effects → copy).

## Blocked-work section

No task in this plan is blocked by an unresolved architectural decision — the
design review already resolved the one correctness gap (duplicate-`id`
validation) directly in `architecture.md`, and this plan resolves the two
remaining open decisions (test tooling, empty-state copy) explicitly above
rather than deferring them into implementation.

The following are **soft, revocable** dependencies, not architecture
blockers — recorded here so they are not lost if the decision owner disagrees
with a choice made in this plan:

| Task blocked | Unblocked by | Nature of block |
| --- | --- | --- |
| Task 3 (add `vitest`), Task 7, Task 8 (unit tests) | Stakeholder confirmation of Condition 2's decision (Task 1) | If the decision owner instead chooses design-review Option (b) (manual-only verification), Tasks 3, 7, and 8 are dropped entirely; Task 13 (manual verification) absorbs their coverage with no other plan change. This is a scope choice, not a missing design. |
| Task 12 (empty-state copy branch) | Stakeholder confirmation of Condition 3's decision (Task 2) | If the decision owner instead chooses to keep the single reused string (design-review Finding 4's "accept as-is" option), Task 12 is dropped; Verification Matrix row 1 is checked against the original string instead. No other task changes. |
| Task 15 (final PR write-up) | Task 13 and Task 14 completing | Hard dependency — cannot summarize verification results before verification and build both run. |

No task is blocked on missing requirements, missing architecture detail, or
an unresolved technical unknown. The only "if X then the plan changes"
branches are the two decisions above, both already resolved with a stated
default in this plan.

## Requirement and acceptance-criteria coverage

| Requirement | Task(s) | Notes |
| --- | --- | --- |
| FR-001 (save on create/delete) | 11 | Single `useEffect` on `[tasks]` covers both triggers |
| FR-002 (save on status toggle) | 11 | Same effect; toggle produces a new `tasks` array |
| FR-003 (save filter on change) | 11 | Second `useEffect` on `[filter]` |
| FR-004 (attempt read on startup) | 10 | Lazy `useState` initializers call `loadTasks`/`loadFilter` |
| FR-005 (restore tasks incl. order) | 6, 10 | `isValidTaskArray` gate; array order preserved as-is |
| FR-006 (restore filter) | 6, 10 | `isValidFilter` gate |
| FR-007 (empty list when no saved data) | 6, 9, 10 | `loadTasks()` fallback is `[]` |
| FR-008 (validate: shape/type/enum/duplicate-id) | 6, 8 | Includes Condition 1's duplicate-`id` check |
| FR-009 (discard invalid, no crash) | 6, 8 | `try/catch` around `JSON.parse`; predicates return `false` instead of throwing |
| FR-010 (silent in-memory fallback on storage failure) | 5, 7 | `browserStorage.ts` never throws or logs |
| FR-011 (no backend/network/account) | — (structural) | No task introduces network code; confirmed in Task 13 row 17 |
| FR-012 (remove hardcoded starter tasks) | 9 | `starterTasks` deleted |
| AC-001 (restore on refresh) | 6, 10, 11, 13 | End-to-end via Task 13 row 16 |
| AC-002 (filter persists across reopen) | 6, 10, 11, 13 | Task 13 rows 15-16 |
| AC-003 (save updates immediately on create/toggle/complete/delete) | 11, 13 | Task 13 rows 12-15 |
| AC-004 (genuinely empty list on first run) | 9, 10, 12, 13 | Task 13 row 1; Task 12 also fixes the copy per Condition 3 |
| AC-005 (malformed data discarded, no crash) | 6, 8, 13 | Task 13 rows 3-9 |
| AC-006 (silent continuation when storage fails) | 5, 7, 13 | Task 13 rows 10-11 |
| AC-007 (no backend call/login during any operation) | — (structural) | Task 13 row 17 |
| NFR-001 (save within one action) | 11 | Effects fire on the commit immediately after the state change |
| NFR-002 (no noticeable lag at "tens of tasks") | 13, 14 | Manual observation during Task 13; no perf test harness added (not required by requirements) |
| NFR-003 (single-browser scope, no cross-tab sync) | 5, 6 | No `storage` event listener/`BroadcastChannel` written anywhere in this plan |
| BR-001 (no new editing feature) | 9 | Only existing `toggleTask` logic persisted; no new mutation added |
| BR-002 (no schema/version field) | 4, 6 | `types.ts`/stored JSON carry no version field |
| BR-003 (fully silent failures, incl. console) | 5 | No `console.*` call added to `browserStorage.ts` |
| BR-004 (no multi-tab sync) | 5, 6 | No cross-tab code introduced |
| BR-005 (`localStorage`, not `sessionStorage`) | 5 | `browserStorage.ts` targets `window.localStorage` exclusively |

Every FR, AC, NFR, and BR in `requirements.md` maps to at least one concrete
task above; none is covered only by narrative intent.

## Definition of done

- [ ] `src/types.ts`, `src/storage/browserStorage.ts`,
      `src/storage/taskBoardStorage.ts` exist and compile (`tsc -b` clean).
- [ ] `src/App.tsx` no longer contains `starterTasks` or an inline `Task`
      type; it imports both types and storage functions.
- [ ] `isValidTaskArray` rejects arrays with duplicate `id` values (Condition
      1 / design-review Finding 1) — verified by Task 8 (if in scope) or
      manually by Task 13 row 8.
- [ ] Both the test-tooling decision and the empty-state-copy decision
      (Conditions 2 and 3) are explicitly recorded in the PR description,
      not defaulted by omission (per Tasks 1, 2, 15 and design-review
      Findings 3-4's stated verification requirement).
- [ ] All 17 rows of the `design-review.md` Verification Matrix pass, whether
      via automated test (rows covered by Tasks 7-8) or manual check (Task
      13) — with the specific split stated in the PR description.
- [ ] `npm run build` succeeds with no new TypeScript or Vite warnings.
- [ ] If Task 3 was executed, `npm run test` passes with zero failing tests.
- [ ] No change to `src/App.css`, `src/index.css`, routing, backend, or any
      file outside the list in "Scope and architecture assumptions."
- [ ] Every FR/AC/NFR/BR row in the coverage table above is either checked
      off via a passing verification-matrix row or structurally true by
      inspection (for the "no such code exists" rows: FR-011, AC-007).

## Residual risks

Carried over from `architecture.md` and `design-review.md` (unchanged by this
plan — these are accepted, requirement-driven tradeoffs, not implementation
gaps):
- Silent persistence failure (BR-003/FR-010) is indistinguishable to the end
  user from normal first-run behavior; this is an accepted tradeoff, not a
  defect to fix during implementation.
- Hand-crafted `localStorage` content that happens to satisfy
  `isValidTaskArray`/`isValidFilter` will load as if legitimate; no
  authentication/trust boundary exists or is required.
- Write cost scales linearly with task-list size on every mutation (no
  diffing); accepted at the "tens of tasks" scale (NFR-002).
- `Date.now()`-based `id` generation can still collide within a single live
  session; the duplicate-`id` load-time check (Task 6) prevents a corrupted
  state from being *reloaded*, not from *occurring* mid-session. Out of this
  story's scope per the requirements' own assumptions.

New, plan-specific risks introduced by the decisions made in this document:
- **Test-tooling decision (Condition 2) is this plan's recommendation, not a
  requirements mandate.** If the decision owner (tech lead/PO) disagrees
  after reading Task 1's PR note and prefers manual-only verification,
  Tasks 3, 7, 8 must be dropped and Task 13 alone must cover their
  Verification Matrix rows — see "Blocked-work section" above for the exact
  scope change. This should be confirmed before Task 3 starts, not after.
- **Empty-state copy wording (Condition 3) is a UX judgment call recorded in
  this plan, not validated with a designer or product owner.** The exact
  string chosen ("No tasks yet — add one above.") is a reasonable default per
  design-review Finding 4's suggested example text, but should be treated as
  provisional copy subject to product sign-off, not final UX copy.
- Adding `vitest` (if Task 3 proceeds) is the first automated-test dependency
  in this repository; `package.json` currently has zero test infrastructure,
  so this introduces new CI/local-workflow surface (a `test` script that did
  not exist before) that engineers other than the implementer should be made
  aware of.
- NFR-002 ("no noticeable lag") is verified only by manual observation (Task
  13/14), consistent with `design-review.md`'s own note that this has never
  been empirically measured in this repository; no performance benchmark is
  introduced by this plan, as none is required by `requirements.md`.
