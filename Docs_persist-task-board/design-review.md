## Design Review: Persist Task Board Between Sessions

- Reviewer: Senior design reviewer (automated review pass)
- Date: 2026-09-29
- Reviewed documents: `Docs_persist-task-board/requirements.md`,
  `Docs_persist-task-board/architecture.md`
- Reviewed codebase context: `src/App.tsx` (current implementation),
  `package.json` (tooling), repo file layout under `src/`
- This review did not run, build, or test any code — no test runner is
  configured in this repository (see Finding 3) and this is a pre-implementation
  design gate. All statements about runtime behavior below are static
  reasoning about the design and the existing `App.tsx`, not observed
  execution results.

## Review Scope

- Confirm the proposed architecture (`storage/browserStorage.ts`,
  `storage/taskBoardStorage.ts`, `types.ts`, modified `App.tsx`) is
  internally consistent, minimal, and sufficient to satisfy every FR, AC,
  NFR, and BR in `requirements.md`.
- Trace state ownership for `tasks` and `filter` end to end: creation,
  mutation (add/toggle/delete/filter-change), identity (`task.id`), ordering,
  validation, and the empty/invalid/unavailable fallback paths.
- Check the design against the *actual* current `src/App.tsx` (not just the
  architecture's description of it) to catch drift between what the
  architecture assumes and what the code does today.
- Identify anything that would make the design not implementation-ready:
  ambiguous ownership, unhandled edge cases in the validation/fallback logic,
  unresolved "Open Decisions," or requirements not traceable to a concrete
  design element.
- Out of scope for this review (per the requirements' own "Out of scope"
  section and the reviewer's constraints): task editing, schema/version
  fields, multi-tab sync, backend/auth — none of these were reintroduced by
  the architecture, and none is proposed here either.

## Findings (Ordered by Severity)

### Finding 1 — Duplicate task `id` after restore breaks identity-based mutation (High)
- **Status:** Resolved (architecture.md updated during this review)
- **Finding:** `App.tsx`'s `toggleTask`/`deleteTask` locate "the" task purely
  by `task.id === taskId`, and the task list's React `key` is also `task.id`
  (confirmed by reading `src/App.tsx` lines 43-55, 121). The architecture's
  original `isValidTaskArray` only validated per-item shape (required fields
  present, correct types, enum membership) — it did not check that `id`
  values are unique across the array. A stored array with two entries sharing
  an `id` (from a same-millisecond `Date.now()` collision, or hand-edited
  `localStorage`) would pass the original validation and load successfully.
  Once loaded, a single toggle or delete on that `id` would then affect both
  entries simultaneously, and React would log a duplicate-key warning.
  Critically, **this risk is amplified specifically by adding persistence**:
  today, any such corruption self-heals on the next refresh because the app
  always restarts from `starterTasks`; after this feature ships, the same
  corruption would be written back and reloaded on every future startup,
  turning a rare transient glitch into a permanent one.
- **Decision:** Extend `isValidTaskArray` to reject the array (fall back to
  `[]`, same as any other FR-008 violation) if any two entries share an `id`.
  This stays entirely within FR-008/FR-009's existing mandate ("validate
  saved data on load ... fall back safely") and does not touch `addTask`'s
  `Date.now()` id-generation strategy, which the requirements' own
  assumptions explicitly leave unchanged. Applied to `architecture.md`
  (`isValidTaskArray` signature comment, the flow-1 "Key point" paragraph,
  the FR-008 row in Requirement Coverage, and the Assumptions/Risks section).
- **Verification:** Unit-test (or manually exercise) `isValidTaskArray` with
  an array containing two otherwise-valid entries sharing the same `id` and
  confirm it returns `false` / `loadTasks()` returns `[]`. Separately confirm
  a valid array with all-unique ids still passes.

### Finding 2 — No verification matrix existed before implementation (Medium)
- **Status:** Resolved (matrix added below in this document)
- **Finding:** The architecture document has a "Requirement Coverage" table
  (requirement → design element) but no boundary-case verification matrix
  (e.g., missing field, wrong type, out-of-enum value, empty string key,
  storage-disabled, quota-exceeded, first-run). The review heuristics for
  this process require a verification matrix before implementation starts.
- **Decision:** A verification matrix is added to this document (see
  "Verification Matrix" below) so the implementer has a concrete boundary
  checklist to code/test against, independent of whether automated tests
  exist (see Finding 3).
- **Verification:** N/A (process finding; satisfied by adding the matrix).

### Finding 3 — Testability rationale is not backed by repo tooling (Medium)
- **Status:** Open — non-blocking, needs an explicit decision during implementation
- **Finding:** The architecture's rationale for isolating persistence logic
  in `taskBoardStorage.ts`/`browserStorage.ts` explicitly cites "so
  save/load/validate can be unit tested." `package.json` (read during this
  review) has no test runner (`vitest`, `jest`, etc.) and no `test` script —
  confirmed via `Grep` for `vitest|jest|testing-library`, which found nothing.
  Nothing in `requirements.md` mandates automated tests, so this is not a
  requirements gap, but leaving it unstated risks the implementer either
  silently skipping verification or unexpectedly adding a test-framework
  dependency mid-implementation.
- **Decision (recommendation, not mandated by requirements):** Before or
  during implementation, explicitly choose one of: (a) add a minimal test
  runner (e.g., `vitest`) and write unit tests for the predicates and
  wrapper against the Verification Matrix below, or (b) explicitly scope
  automated tests out of this story and rely on manual verification against
  the matrix. Either is acceptable; only the silent-default of "claim
  testability but never test it" is not.
- **Verification:** Confirm `package.json` after implementation either gained
  a test runner + test files, or the PR description states tests were
  deliberately scoped out and manual verification was performed against the
  matrix below.

### Finding 4 — Reused empty-state copy is ambiguous between "no data" and "filtered to nothing" (Low)
- **Status:** Open — optional, deferred to implementer's discretion
- **Finding:** The architecture states the existing `<p className="empty-state">No
  tasks match this filter.</p>` (confirmed at `src/App.tsx` line 140) "doubles
  as the empty-state display for FR-007/AC-004." AC-004 only requires that a
  *genuinely empty task list* be shown when there is no saved data — it does
  not dictate specific copy — so this is not a requirement violation. But the
  same string will also render on a first run with `filter === 'all'` and
  zero tasks, which reads oddly ("no tasks match this filter" when there is no
  filter mismatch at all, just no data).
  This is a UX-quality observation, not a correctness or requirement gap.
- **Decision:** Left to the implementer/product owner: either accept the
  reused copy as-is (cheapest, zero new UI states, matches architecture's
  "no new UI states are required" rationale), or add a one-line conditional
  (`tasks.length === 0 ? "No tasks yet — add one above." : "No tasks match
  this filter."`). No architecture change is required either way; noted here
  so the choice is made deliberately rather than by omission.
- **Verification:** Manual check: with zero saved tasks and filter `all`,
  confirm the displayed message matches whichever option was chosen.

### Finding 5 — Redundant persistence write on initial mount (Low)
- **Status:** Accepted — informational only, no action required
- **Finding:** Because `App.tsx` will use `useEffect(() => saveTasks(tasks),
  [tasks])` / `useEffect(() => saveFilter(filter), [filter])`, both effects
  fire once on the very first render as well as on every subsequent change —
  including when the just-loaded data is written straight back to
  `localStorage` unchanged. This is functionally harmless (idempotent write)
  and well within NFR-002's "tens of tasks" tolerance, and in React 18
  Strict Mode (development only) effects additionally mount/unmount/remount
  once, causing one extra harmless duplicate write in dev only.
- **Decision:** Accept as documented behavior; no design change needed. Noted
  so it is not mistaken for a bug during implementation or code review.
- **Verification:** None required; informational.

### Finding 6 — Three previously-unresolved "Open Decisions" (Informational)
- **Status:** Resolved (architecture.md's "Open Decisions" section replaced
  with "Decisions Resolved by Design Review")
- **Finding:** `architecture.md` listed three open decisions (console
  logging on storage failure, whether to generalize a `usePersistedState`
  hook, and exact `localStorage` key names) that had no blocking impact but
  were left unresolved, which is inconsistent with an "implementation-ready"
  design.
- **Decision:** Resolved in this review (see "Agreed Design Decisions"
  below) and reflected directly in `architecture.md`.
- **Verification:** N/A (documentation finding).

## Agreed Design Decisions

1. **Duplicate-`id` rejection added to validation.** `isValidTaskArray` must
   treat a stored task array as invalid (fall back to `[]`) if any two
   entries share the same `id`, in addition to the existing per-item
   field/type/enum checks. Rationale: `id` is the identity key used by
   `toggleTask`/`deleteTask` and by the React list `key`; persistence turns a
   rare, self-healing corruption into a permanent one if this is not checked
   at load time. (Finding 1.)
2. **Storage-failure logging stays fully silent, including the console.**
   `writeRaw`/`readRaw` emit no `console.warn`/`debug` output. BR-003 only
   requires no *user-facing* message, but full silence keeps the wrapper
   uniform; revisit only if development-time debugging of persistence issues
   becomes difficult in practice.
3. **No generic `usePersistedState<T>` hook for this story.** Confirmed
   deferred — only two persisted fields exist; introduce the generic hook
   only if a third persisted UI field is ever added.
4. **`localStorage` key names are final:** `task-board:tasks` and
   `task-board:filter`. No conflicting existing usage was found in this
   repository.
5. **State ownership is unchanged from the architecture's proposal:**
   `App.tsx` remains the single owner of live `tasks`/`filter` state;
   `taskBoardStorage.ts` and `browserStorage.ts` remain stateless, imperative,
   call-on-demand modules. No second source of truth is introduced.
6. **Empty-state copy and automated-test tooling are explicitly left as
   implementer decisions** (Findings 3 and 4), not silent gaps — each must be
   deliberately decided (either option is acceptable) rather than defaulted
   into by omission.

## Verification Matrix

A boundary-case checklist to verify (manually, or via unit tests if Finding
3's option (a) is chosen) before this feature is considered done. Each row
maps to the requirement(s) it protects.

| # | Scenario | Expected result | Requirement(s) |
| --- | --- | --- | --- |
| 1 | No `task-board:tasks` / `task-board:filter` keys in `localStorage` (first run) | App starts with zero tasks and filter `all`; no console error | FR-007, FR-012, AC-004 |
| 2 | Valid tasks array + valid filter saved from a prior session | All tasks restored with original id/title/status/priority/order; filter restored | FR-004–006, AC-001, AC-002 |
| 3 | Stored tasks value is not valid JSON (e.g., truncated string) | Falls back to `[]`, no thrown/unhandled error | FR-008, FR-009, AC-005 |
| 4 | Stored tasks value parses but is not an array (e.g., an object) | Falls back to `[]` | FR-008, FR-009, AC-005 |
| 5 | One task entry missing `title` | Whole array rejected, falls back to `[]` (not a partially repaired list) | FR-008, FR-009, AC-005 |
| 6 | One task entry has `status: "archived"` (outside enum) | Whole array rejected, falls back to `[]` | FR-008, FR-009, AC-005 |
| 7 | One task entry has `id` as a string instead of a number | Whole array rejected, falls back to `[]` | FR-008, FR-009, AC-005 |
| 8 | Two task entries share the same `id`, both otherwise valid | Whole array rejected, falls back to `[]` | FR-008, FR-009 (review Finding 1) |
| 9 | Stored filter value is `"archived"` (outside `all`/`open`/`done`) | Filter falls back to `all`; task list restoration is unaffected | FR-008, FR-009, AC-005 |
| 10 | `localStorage` key access throws (storage disabled) on read | App starts with `[]`/`all`, no error shown, no crash | FR-010, AC-006 |
| 11 | `localStorage.setItem` throws (quota exceeded) on write after adding a task | Task still appears in the UI (in-memory state unaffected); no error shown | FR-010, AC-006 |
| 12 | Create a task | `localStorage['task-board:tasks']` updated to include it, in the same order shown on screen | FR-001, AC-001, AC-003, NFR-001 |
| 13 | Toggle a task's status (reopen/complete) | `localStorage['task-board:tasks']` reflects the new status for that task only | FR-002, AC-003, NFR-001 |
| 14 | Delete a task | `localStorage['task-board:tasks']` no longer contains it | FR-001, AC-003, NFR-001 |
| 15 | Change filter (`all` → `open` → `done`) | `localStorage['task-board:filter']` updates to match each selection | FR-003, AC-002, AC-003, NFR-001 |
| 16 | Refresh after any of scenarios 12–15 | Board and filter reflect the last change made before refresh | AC-001, AC-002 |
| 17 | Confirm no network request is made and no login/account UI exists during any of the above | Holds trivially — no such code exists | FR-011, AC-007 |

## Requirement Traceability Check

Every FR, AC, NFR, and BR in `requirements.md` is mapped below to where the
(now-updated) architecture satisfies it, and whether this review changed
anything about that coverage.

| Requirement | Covered by | Review impact |
| --- | --- | --- |
| FR-001 | `useEffect` on `[tasks]` → `saveTasks` | Unchanged |
| FR-002 | Same effect (toggle produces new `tasks` array) | Unchanged |
| FR-003 | `useEffect` on `[filter]` → `saveFilter` | Unchanged |
| FR-004 | Lazy `useState` initializers calling `loadTasks`/`loadFilter` | Unchanged |
| FR-005 | `isValidTaskArray` gate before restoring | Unchanged |
| FR-006 | `isValidFilter` gate before restoring | Unchanged |
| FR-007 | `loadTasks()` fallback is `[]`, not `starterTasks` | Unchanged |
| FR-008 | `isValidTask`/`isValidTaskArray`/`isValidFilter` | **Strengthened** — duplicate-`id` check added (Finding 1) |
| FR-009 | Parse/shape failures caught, return `[]`/`'all'` | **Strengthened** — duplicate-`id` arrays now also fall into this path |
| FR-010 | `browserStorage.ts` never throws | Unchanged |
| FR-011 | No network/backend code in the design | Unchanged |
| FR-012 | `starterTasks` removed from `App.tsx` | Unchanged |
| AC-001 | FR-004/005 combined (flow 1) | Unchanged |
| AC-002 | FR-006 (restore) + FR-003 (save) | Unchanged |
| AC-003 | Effects on `[tasks]`/`[filter]` cover create/toggle/delete/filter-change | Unchanged |
| AC-004 | FR-007/012 | Unchanged (Finding 4 is copy-quality only, not a coverage gap) |
| AC-005 | FR-008/009 | **Strengthened** by Finding 1 |
| AC-006 | FR-010 (silent in-memory continuation) | Unchanged |
| AC-007 | FR-011 (no backend/account exists) | Unchanged |
| NFR-001 | Save effects run on the commit right after the state change | Unchanged |
| NFR-002 | JSON stringify/parse over "tens of tasks" is negligible | Unchanged (see note below — not empirically measured) |
| NFR-003 | No `storage` event listener / `BroadcastChannel` introduced | Unchanged |
| BR-001 | No title/priority edit added; only existing toggle persisted | Unchanged |
| BR-002 | No version/schema field anywhere in the design | Unchanged |
| BR-003 | No user-facing alert/warning; console also silent per Decision 2 | Unchanged |
| BR-004 | No cross-tab reconciliation code | Unchanged |
| BR-005 | `browserStorage.ts` targets `window.localStorage` only | Unchanged |

Note on NFR-002: the architecture's "sub-millisecond" performance claim is a
reasonable engineering estimate for JSON operations over "tens of tasks," but
it has not been (and, per this review's constraints, cannot be) empirically
measured — there is no runnable project to benchmark yet. Treat it as a
design assumption, not a validated result, until implemented and profiled if
ever in doubt.

Every FR/AC/NFR/BR has a concrete design element behind it. No requirement is
covered only by narrative claim with no corresponding component, effect, or
predicate in the design.

## Residual Risks

Carried over from the architecture's own "Assumptions and Risks" section
(still valid, unchanged by this review):
- Silent persistence failure is indistinguishable from normal first-run
  behavior to the end user (accepted trade-off per FR-010/BR-003).
- Hand-crafted `localStorage` content that satisfies the shape/enum/id
  validation will be loaded as if legitimate; there is no authentication or
  trust boundary in this app, and none is required by the requirements.
- Write cost scales linearly with task-list size on every mutation (no
  diffing); accepted at the "tens of tasks" scale defined by NFR-002.

New, review-identified residual risks (non-blocking):
- `Date.now()`-based `id` generation can still collide within the same live
  session (e.g., two extremely rapid submissions in the same millisecond);
  the duplicate-`id` load-time check (Finding 1) prevents such a corrupted
  state from being *reloaded* on a future startup, but does not prevent it
  from *occurring* during a session, since `addTask`'s id-generation logic is
  unchanged and out of this story's scope.
- No automated test harness currently exists in this repository (Finding 3);
  the verification matrix above is designed to be usable either as manual QA
  steps or as a basis for unit tests, whichever the implementer chooses.
- The empty-state message reuse (Finding 4) is a minor, non-blocking UX
  ambiguity left to implementer/product discretion.

## Review Outcome

**Conditionally approved for implementation.**

No blocking architectural flaw remains: state ownership is single and clear
(`App.tsx` owns `tasks`/`filter`; storage modules are stateless and
call-on-demand), every FR/AC/NFR/BR traces to a concrete design element, and
the one correctness gap found during this review (duplicate-`id` validation,
Finding 1) has already been folded into `architecture.md` as part of this
review — implementation can proceed directly against the updated document.

Conditions to close out alongside implementation (none require further
architectural redesign):
1. Implement `isValidTaskArray`'s duplicate-`id` rejection exactly as now
   specified in `architecture.md` (Finding 1) — cheap, already fully
   specified.
2. Explicitly decide and record (e.g., in the PR description) whether
   automated tests are added for this story or verification is manual against
   the Verification Matrix above (Finding 3) — either is acceptable, silence
   is not.
3. Explicitly decide the empty-state copy behavior (accept the reused string
   or branch it) before considering the UI finished (Finding 4) — cosmetic,
   non-blocking.

## Files Changed by This Review

- `Docs_persist-task-board/architecture.md` — updated in place: added the
  duplicate-`id` validation rule to `isValidTaskArray`'s contract, the flow-1
  validation narrative, the FR-008 requirement-coverage row, and the
  Assumptions/Risks section; replaced the "Open Decisions" section with
  "Decisions Resolved by Design Review" recording the three resolved items.
- `Docs_persist-task-board/design-review.md` — created (this document).
- `Docs_persist-task-board/requirements.md` — not modified, per review
  constraints.
