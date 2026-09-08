# Design Review: Persist Task Board Between Sessions

Reviewer role: senior software design review, pre-implementation. No production code has been written for this feature at the time of this review (`src/App.tsx` still uses `starterTasks` and plain `useState`; no `src/hooks/` directory exists; `package.json` has no test runner configured). This review is a static review of `requirements.md` and `architecture.md`; it does not claim any runtime, build, or test execution, since there is no runnable implementation of this feature yet.

## Review Scope

- Documents reviewed: `requirements.md` (frozen, not modified by this review) and `architecture.md` (updated where a finding changed the recommended design).
- Code inspected for context only: `src/App.tsx` (current pre-persistence implementation, used to check the architecture's proposal against real call sites — e.g., existing use of the functional-updater form of `setTasks`), `src/main.tsx` (confirms `<React.StrictMode>` is enabled), `package.json` (confirms no test framework is present, so no automated verification matrix can be executed at this stage).
- Out of scope for this review, per task constraints: writing production code, modifying `requirements.md`, adding infrastructure/persistence backends beyond what the requirements specify.
- Every finding below is labeled `Finding`, `Recommendation`, `Assumption`, or `Open Decision` and is not to be read as a confirmed requirement unless it is a direct restatement of `requirements.md`.

## Findings (ordered by severity)

### D-01 — [High] Ambiguity in where the persistence write happens, risking a side-effect-in-updater bug
**Status:** Resolved (architecture.md updated)

**Finding:** The original `architecture.md` was internally inconsistent about *how* `useLocalStorageState`'s write path is implemented. The "Task mutation" sequence diagram depicted `setTasks(nextTasks)` immediately followed by `setItem(...)`, as if the write happened synchronously inside the setter call. Separately, the "Assumptions and Risks" section stated "the write effect is keyed on the `tasks`/`filter` state value," implying a `useEffect`-based design. These are two different implementations with materially different risk profiles:
- If the write is performed inside a wrapped `setState` function, and that function needs to capture the *resolved* next value when called with React's functional-updater form (`setTasks((current) => [...])` — which is exactly how `App.tsx`'s existing `addTask`, `toggleTask`, and `deleteTask` handlers call `setTasks` today), the only way to get the resolved value is to run `localStorage.setItem` **inside the updater function passed to `setState`**. That is a side effect inside a state updater/reducer — an explicit anti-pattern flagged by this review's heuristics, and unsafe because React (especially under `<StrictMode>`, and under concurrent features) may invoke updater functions more than once or discard results, which would cause duplicate or spurious writes.
- If instead the write is a separate `useEffect` keyed on the committed state value, the setter can be forwarded unchanged from `useState`, fully preserving functional-updater support with no logic duplicated at call sites — but the write is then a post-commit effect, not synchronous with the triggering event.

Nothing in the original document told an implementer which of these to build, and the existing `App.tsx` mutation handlers already commit the app to needing functional-updater support.

**Decision:** Use the `useEffect`-based design. The hook must return React's own `setState` (unwrapped), and persistence writes run only inside a `useEffect` keyed on `[key, state]`, never inside a `setState` updater function. `architecture.md` has been updated (Components and Responsibilities table, State ownership bullets, and the mutation sequence diagram note) to state this explicitly, and a corresponding residual risk (write-timing relative to instantaneous tab close) has been added to Assumptions and Risks.

**Verification:** Code-review check once implemented — confirm `useLocalStorageState.ts` contains exactly one `useState` call whose setter is returned as-is, and exactly one `useEffect` that performs `localStorage.setItem`; confirm no `localStorage` call exists inside any function passed as a `setState` argument anywhere in the codebase.

---

### D-02 — [Medium] `localStorage` property access, not just its methods, can throw
**Status:** Resolved (architecture.md updated)

**Finding:** FR-009/FR-010 require that *any* read or write failure be caught silently. A naive implementation might assume only `.getItem()`/`.setItem()` calls can throw. In some restricted environments (certain private-browsing modes, strict cookie/storage policies), merely accessing the `window.localStorage` property can throw a `SecurityError` before any method is invoked. If the `try` block wraps only the method call and not the property access expression, this exception path would escape the catch, violating FR-009/FR-010 and NFR-002.

**Decision:** The `try` block in the hook must wrap the full access chain (`window.localStorage.getItem(...)` / `window.localStorage.setItem(...)` as single statements), not assume `localStorage` is already a safely-obtained reference. Documented in `architecture.md` Assumptions and Risks.

**Verification:** Add a boundary-case entry to the verification matrix below ("`localStorage` getter itself throws") and confirm manually (e.g., via a mocked `Object.defineProperty(window, 'localStorage', { get() { throw ... } })` in a future unit test, once a test runner exists) that the app does not crash.

---

### D-03 — [Medium] No explicit verification matrix existed for boundary cases before implementation
**Status:** Resolved (added below in this document)

**Finding:** `architecture.md`'s "Requirement Coverage" table maps requirements to design decisions at a narrative level, but there was no concrete, enumerable list of boundary-case inputs (malformed JSON variants, wrong-shape objects, edge-case enum values, storage-unavailable simulations, StrictMode double-invocation) to check against before writing code. Per the review heuristics, a focused verification matrix is required before implementation begins.

**Decision:** See "Verification Matrix" section below. This is a review artifact (design-review.md), not a new architectural component — no `architecture.md` change was needed beyond referencing it.

**Verification:** N/A (this finding produces the matrix itself).

---

### D-04 — [Low] `FR-001` mentions "order" as if it were a stored field, while the `Task` shape has none
**Status:** Resolved — already correctly handled by `architecture.md`, documented here for traceability clarity only

**Finding:** `requirements.md` FR-001 says the app must write "id, title, status, priority, and order," listing `order` alongside real `Task` fields. But the `Task` type (both in current `src/App.tsx` and in requirements' own "Data, Integrations, and Dependencies" section) has no `order` field, and FR-007's authoritative shape check also omits it. This reads as a minor wording ambiguity in the requirements (not to be corrected here, since `requirements.md` must not be modified) that could confuse an implementer into inventing an `order: number` field.

**Decision:** `architecture.md`'s Data Model section already resolves this correctly: ordering is represented **positionally** by array order, preserved naturally by `JSON.stringify`/`JSON.parse`; no `order` field is added to `Task`. This review confirms that interpretation is the only one consistent with FR-007's shape definition and with the existing `Task` type, and it satisfies FR-011 (no re-sorting) without contradicting FR-001.

**Verification:** Confirm the shipped `Task` type has exactly 4 fields (`id`, `title`, `status`, `priority`) and that AC-001's manual check ("original ordering preserved after refresh") passes by array order alone, with no separate order field ever written or read.

---

### D-05 — [Low] Redundant open decisions left unresolved would have blocked a clean handoff to implementation
**Status:** Resolved (architecture.md updated)

**Finding:** `architecture.md` previously listed four "Open Decisions" (first-render write-back guard, console logging, type-guard file location, `:v1` key suffix) without resolving any of them. Per this review's constraint to distinguish assumptions/open items from confirmed decisions, and to make the design implementation-ready, these needed explicit resolution (or an explicit statement that they remain genuinely open and why).

**Decision:** All four were low-risk/low-cost and are now resolved and recorded in `architecture.md`'s "Decisions Confirmed in Design Review" section:
- No first-render write-back guard (redundant write is idempotent and harmless).
- No `console.warn` added by default (not required; BR-004 governs user-facing surfaces only, but adding it is not part of this design).
- Type guards remain colocated in `App.tsx` (YAGNI; revisit only if the file grows).
- No `:v1` key-suffix convention adopted (versioning explicitly out of scope; plain keys used).

**Verification:** Diff review of `architecture.md` confirms no dangling "Open Decisions" section remains unresolved; only one residual, genuinely non-blocking item remains (see Residual Risks).

---

### D-06 — [Informational] Pre-existing `Date.now()` id-collision risk is unrelated to this feature but is now made durable across sessions
**Status:** Accepted, out of scope — no architecture change proposed

**Finding:** `App.tsx`'s existing `addTask` assigns `id: Date.now()`. Two tasks added within the same millisecond (e.g., via fast double-submission or programmatic testing) would receive duplicate ids, which already breaks the `key={task.id}` React list rendering assumption today, independent of persistence. Once persistence ships, such a collision — if it ever occurred — would now also be written to and restored from `localStorage`, making a pre-existing rendering-fragility bug durable across sessions instead of reset on each reload. This is not caused by the persistence design and is not part of this story's requirements (no requirement addresses id-generation strategy or uniqueness validation on restore).

**Decision:** No change to this architecture. `isTaskArray`'s validator, per FR-007, only needs to check field shape (`id: number`, etc.), not cross-item uniqueness; requiring uniqueness enforcement would be scope creep beyond FR-007's literal text. Flagged here purely as a residual, pre-existing risk for awareness, not a blocker for this feature.

**Verification:** None required for this story. If desired, a future, separate story could switch to a monotonic counter or `crypto.randomUUID()` for id generation.

---

### D-07 — [Informational] Multi-tab last-write-wins is correctly scoped out, not a gap
**Status:** Confirmed as intentionally out of scope

**Finding:** `requirements.md` explicitly lists concurrent multi-tab writes as unaddressed and untested by this story (Out of scope; Assumptions). `architecture.md` correctly reflects this — no `storage` event listener or cross-tab coordination is added, and the "last write wins" consequence is documented as an accepted risk, not a defect.

**Decision:** No change needed. This finding is recorded only to confirm the review explicitly checked this heuristic (per task instructions) and found it already correctly handled, rather than silently skipping it.

**Verification:** N/A — behavioral confirmation would require a two-tab manual test, which is explicitly out of scope and untested by the source requirements.

---

### D-08 — [Informational] StrictMode double-invocation is correctly assessed as safe
**Status:** Confirmed as intentionally handled

**Finding:** `src/main.tsx` wraps `<App />` in `<React.StrictMode>`. `architecture.md` correctly notes that StrictMode's double-invocation of lazy `useState` initializers is safe here because the read path is a pure, idempotent read with no side effects. This review's D-01 resolution (moving writes into a `useEffect`, never into an updater function) reinforces this: StrictMode's double-invocation of updater functions (a deliberate React 18 behavior for catching impure reducers) can no longer cause duplicate/spurious writes, because no updater function ever performs a write.

**Decision:** No further change needed beyond the D-01 resolution already applied.

**Verification:** See Verification Matrix, row "StrictMode double-mount (dev only)."

## Agreed Design Decisions

1. `useLocalStorageState<T>(key, defaultValue, validator)` returns `[state, setState]` where `setState` is React's own `useState` setter, unwrapped — full functional-updater support is preserved for existing `App.tsx` call sites.
2. Persistence writes happen exclusively inside a `useEffect` keyed on `[key, state]`; no `localStorage` call ever executes inside a `setState` updater function.
3. Reads happen exclusively inside the lazy initializer passed to the internal `useState` call, at first render, wrapped in `try/catch` around the full property-access-and-method-call chain.
4. On any read failure (missing key, thrown access/parse error, or validator rejection), fall back to the caller-supplied default (`[]` for tasks, `'all'` for filter) — never partially repair a malformed array.
5. On any write failure, swallow the error silently; never surface it to the UI; state remains fully usable in memory for the rest of the session.
6. No first-render write-back guard, no console logging by default, no type-guard extraction, no `:v1` key suffix — all deferred/rejected as unnecessary for this story's scope (see D-05).
7. No id-uniqueness validation is added to `isTaskArray` (see D-06); no multi-tab coordination is added (see D-07).
8. Storage keys: `taskboard.tasks` (JSON array of `Task`), `taskboard.filter` (JSON string, one of `'all' | 'open' | 'done'`) — plain, unversioned, namespaced with a `taskboard.` prefix.
9. `starterTasks` may remain in the codebase but must not be used as the initial value passed into `useLocalStorageState` for `tasks`.

## Requirement Traceability Check

| Requirement | Design decision / architecture location | Status |
| --- | --- | --- |
| FR-001 | `useEffect`-driven write on `tasks` state change, inside `useLocalStorageState`; triggered by every mutation handler via `setTasks` | Covered |
| FR-002 | Same hook/effect pattern reused for `filter`, triggered by `setFilter` | Covered |
| FR-003 | Lazy `useState` initializer reads `taskboard.tasks`, validates via `isTaskArray`, returns as initial state | Covered |
| FR-004 | Lazy `useState` initializer reads `taskboard.filter`, validates via `isFilterValue`, returns as initial state | Covered |
| FR-005 | Missing/invalid key falls back to `[]`; `starterTasks` removed from the initial value passed to the hook (Agreed Decision 9) | Covered |
| FR-006 | Missing/invalid key falls back to `'all'` | Covered |
| FR-007 | `isTaskArray` type guard runs after `JSON.parse`; any shape mismatch discards the whole array (no partial repair, Agreed Decision 4) | Covered |
| FR-008 | `isFilterValue` type guard runs after `JSON.parse`; any mismatch discards and falls back to `'all'` | Covered |
| FR-009 | Write path wrapped in `try/catch` covering the full `localStorage` access chain (D-02); errors swallowed silently | Covered |
| FR-010 | Read path wrapped in `try/catch` covering the full access chain; falls back to FR-005/FR-006 defaults | Covered |
| FR-011 | Order preserved positionally by array order through `JSON.stringify`/`JSON.parse`; no `order` field, no sort step (D-04) | Covered |
| FR-012 | No network calls, no auth, no backend introduced anywhere in the design | Covered |
| AC-001 | FR-003/FR-011 combination; verify via matrix row "refresh with existing tasks" | Covered |
| AC-002 | FR-002/FR-004 combination; verify via matrix row "non-default filter survives refresh" | Covered |
| AC-003 | FR-001 write-on-mutation, immediate (post-commit effect, D-01) | Covered |
| AC-004 | FR-005; verify via matrix row "first load, no saved data" | Covered |
| AC-005 | FR-006; verify via matrix row "first load, no saved filter" | Covered |
| AC-006 | FR-007; verify via matrix rows "malformed JSON" and "wrong shape" | Covered |
| AC-007 | FR-008; verify via matrix row "malformed filter value" | Covered |
| AC-008 | FR-009/FR-010, NFR-002; verify via matrix row "storage unavailable/throws" | Covered |
| AC-009 | FR-012, BR-002; no sync mechanism exists to test against | Covered (by absence of any sync mechanism) |
| NFR-001 | Synchronous `localStorage` calls only; no async layer, no loading indicator | Covered |
| NFR-002 | React state is the single in-session source of truth; persistence failures never block UI reads/writes | Covered |
| BR-001 | Same as FR-005/AC-004 | Covered |
| BR-002 | Same as FR-012/AC-009; no cross-device mechanism exists | Covered |
| BR-003 | No bulk clear/reset action added anywhere in the design; `deleteTask` unchanged as the sole removal path | Covered |
| BR-004 | Write failures caught and never surfaced to the UI (Agreed Decision 5) | Covered |
| BR-005 | No backend, no auth, all storage local to `window.localStorage` | Covered |

All 27 FR/AC/BR/NFR items in `requirements.md` have an explicit, traceable design decision. No coverage gaps found.

## Verification Matrix (to run once implementation exists; not executed by this review)

| # | Scenario | Expected outcome | Requirement(s) |
| --- | --- | --- | --- |
| 1 | First load, `localStorage` empty (no keys ever set) | `tasks = []`, `filter = 'all'`, no starter tasks shown | FR-005, FR-006, AC-004, AC-005 |
| 2 | Add a task, refresh page | Task reappears with same id/title/status/priority, same position | FR-001, FR-003, AC-001, AC-003 |
| 3 | Add 3 tasks in a specific order, refresh | Order identical to pre-refresh order (no re-sort) | FR-011, AC-001 |
| 4 | Mark a task done, refresh | Status persists as `'done'` | FR-001, FR-003, AC-001 |
| 5 | Reopen a done task, refresh | Status persists as `'open'` | FR-001, FR-003, AC-001 |
| 6 | Delete a task, refresh | Task does not reappear; remaining tasks/order intact | FR-001, FR-003, AC-001, AC-003 |
| 7 | Select filter `'open'` or `'done'`, refresh | Same filter selected after reload | FR-002, FR-004, AC-002 |
| 8 | `localStorage['taskboard.tasks']` set to invalid JSON (e.g., `"{not json"`) | App loads with `tasks = []`, no thrown error, no visible error message | FR-007, AC-006 |
| 9 | `localStorage['taskboard.tasks']` set to valid JSON but wrong shape (e.g., `{"a":1}` or `[{"id":"x"}]` — string id, missing fields, wrong enum value) | App loads with `tasks = []`, no crash | FR-007, AC-006 |
| 10 | `localStorage['taskboard.filter']` set to invalid JSON or an unsupported value (e.g., `'"maybe"'`) | App loads with `filter = 'all'`, no crash | FR-008, AC-007 |
| 11 | `localStorage.setItem` mocked to throw (quota exceeded / storage disabled) during add/toggle/delete/filter-change | Action completes in the UI; no error shown; state updates normally in memory | FR-009, AC-008, NFR-002 |
| 12 | `localStorage.getItem` mocked to throw during startup | App loads with `tasks = []`, `filter = 'all'`; no crash | FR-010, AC-008 |
| 13 | Accessing the `window.localStorage` property itself throws (not just its methods) — see D-02 | App loads/operates identically to scenario 11/12; no uncaught exception | FR-009, FR-010 |
| 14 | Rapid double-submit of "Add task" (functional-updater race) | Both tasks are added and both persist correctly after refresh; no lost update | FR-001, D-01 |
| 15 | `<React.StrictMode>` double-mount in dev (`npm run dev`) | No duplicate visible tasks, no console errors; at most a harmless duplicate identical write to `localStorage` | D-01, D-08 (informational) |
| 16 | Two browser tabs of the same app open; make different edits in each | Last tab to write wins; no crash (explicitly out of scope/untested per requirements) | D-07 (informational, not a pass/fail gate) |
| 17 | Task list grows large enough to approach `localStorage` quota (manual/simulated) | Write throws, is caught, UI remains usable for the session (no persistence, but no crash) | FR-009, NFR-002 |
| 18 | Delete the only remaining task, then refresh | Empty board shown; no error; not confused with "first load" state (both render identically, which is correct — no distinct code path required) | FR-005 (same code path), AC-004 |

## Residual Risks

- **Write-timing edge case on instantaneous unload** (D-01 resolution trade-off): a post-commit `useEffect` write could theoretically be lost if the tab closes/crashes before the effect flushes. Accepted per NFR-001; not testable without a real browser; no mitigation required by the requirements.
- **No user-facing signal when persistence is entirely unavailable** (by design, per BR-004): a user in a fully storage-disabled environment will not know their work won't survive a refresh. This is required behavior, not a defect, but is worth the team's explicit awareness.
- **Multi-tab last-write-wins** (D-07): explicitly out of scope and untested by the source requirements; documented, not mitigated.
- **Pre-existing `Date.now()` id-collision risk** (D-06): unrelated to this feature, now made durable across sessions; out of scope for this story.
- **No automated test runner exists yet** in `package.json` (no Vitest/Jest configured). The Verification Matrix above cannot be executed as automated tests until a test framework is added; until then, verification will be manual. This is noted as a residual gap in the project's overall readiness, not a defect in this feature's architecture.

## Review Outcome

**Conditionally approved for implementation**, subject to the following being carried into the implementation phase exactly as resolved in this review:
1. `useLocalStorageState`'s `setState` must be the raw `useState` setter (functional-updater compatible); writes must live only in a `useEffect`, never inside a `setState` updater (D-01).
2. `try/catch` blocks must wrap the entire `window.localStorage` access expression, not just method calls (D-02).
3. The Verification Matrix above must be exercised manually (or via tests, if a test runner is added) before this feature is considered done, since no automated verification exists yet in this repository.

No blocking gaps remain in requirement coverage — all 12 FRs, 9 ACs, 5 BRs, and 2 NFRs have an explicit, traceable design decision (see Requirement Traceability Check). No unresolved architectural ambiguities remain after the `architecture.md` updates made during this review.
