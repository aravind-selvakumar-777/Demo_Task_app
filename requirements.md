# Requirements: Persist Task Board Between Sessions

## Source
- Type: Confluence page
- Reference: "User Story: Persist Task Board Between Sessions" — space `copilotcap`, page ID 8060929 — https://epam-team-nub9ahqn.atlassian.net/wiki/spaces/copilotcap/pages/8060929/User+Story+Persist+Task+Board+Between+Sessions
- Retrieved: 2026-09-08

## User Story
As a Task Board user, I want my tasks, statuses, priorities, and active filter to be saved automatically, so that I can refresh or reopen the application without losing my work.

## Objective and Scope

### Objective
Add browser-local persistence to the Demo Task Board so that the task list (with titles, statuses, priorities, and ordering) and the active filter survive a page refresh and a full browser close/reopen on the same browser and device, without requiring a backend or a user account.

### In scope
- Persisting the task list (id, title, status, priority, order) to `window.localStorage`.
- Persisting the active filter (`all` / `open` / `done`) to `window.localStorage`.
- Restoring both on application startup.
- Defining and handling the "no saved data" and "malformed saved data" fallback states.
- Defining silent-failure behavior when `localStorage` is unavailable or a write/read throws.
- Removing the hardcoded `starterTasks` array as the default seed data for first load (per clarification 1).

### Out of scope
- Cross-device or cross-browser synchronization of task data (clarification 5).
- A bulk "reset board" / "clear all tasks" action; users remove tasks only one at a time via the existing Delete action (clarification 6).
- Backend/API storage, user accounts, or authentication.
- Data schema versioning or migration across future app releases.
- Defined behavior for concurrent writes across multiple open tabs/windows of the same browser (not addressed by the source story).

## Functional Requirements
- **FR-001:** On every task-list mutation that completes successfully (add task, mark done, reopen, delete task), the app must write the full current task list — including id, title, status, priority, and order — to `localStorage` as part of that action.
- **FR-002:** On every change to the active filter (`all` / `open` / `done`), the app must write the selected filter value to `localStorage`.
- **FR-003:** On application startup, the app must attempt to read the persisted task list from `localStorage` and, if it is present and valid, use it as the initial `tasks` state.
- **FR-004:** On application startup, the app must attempt to read the persisted filter value from `localStorage` and, if it is present and valid, use it as the initial `filter` state.
- **FR-005:** If no persisted task list exists in `localStorage` (first-ever load, or storage was cleared), the app must initialize `tasks` to an empty array (`[]`). The hardcoded `starterTasks` array must no longer be used as the default seed data for first load.
- **FR-006:** If no persisted filter exists in `localStorage`, the app must initialize `filter` to `'all'`.
- **FR-007:** If the persisted task data is malformed, corrupted, or does not match the expected `Task[]` shape (`id: number`, `title: string`, `status: 'open' | 'done'`, `priority: 'Low' | 'Medium' | 'High'`), the app must discard it and initialize `tasks` to an empty array without throwing an unhandled error or crashing the UI.
- **FR-008:** If the persisted filter value is malformed or is not one of `'all' | 'open' | 'done'`, the app must discard it and initialize `filter` to `'all'` without crashing.
- **FR-009:** If a write to `localStorage` fails for any reason (storage disabled, quota exceeded, private-browsing restrictions, etc.), the app must catch the error, continue operating normally in memory for the remainder of that session, and must not display an error message to the user or crash.
- **FR-010:** If a read from `localStorage` fails for any reason, the app must catch the error and fall back to the empty-state defaults defined in FR-005 and FR-006 without crashing.
- **FR-011:** Restored tasks must preserve the exact ordering they had when saved; ordering must not be re-sorted or altered during restore.
- **FR-012:** Persisted task and filter data must remain entirely within the user's browser local storage; the app must not transmit task data to any backend or API and must not require user authentication or an account.

## Acceptance Criteria
- **AC-001:** Given at least one task exists on the board, when the page is refreshed, then all tasks are restored with the same titles, priorities, statuses, and original ordering they had before the refresh.
- **AC-002:** Given a filter other than the default is selected, when the browser is closed and reopened (or the page is refreshed) on the same browser and device, then the same filter is still selected.
- **AC-003:** Given a task is created, completed, reopened, or deleted, when that action finishes, then the persisted board in `localStorage` reflects the updated task list immediately.
- **AC-004:** Given no task data has ever been saved in this browser, or `localStorage` has been cleared, when the app starts, then the task list is empty and no starter/demo tasks are shown.
- **AC-005:** Given no filter has ever been saved in this browser, when the app starts, then the active filter is `all`.
- **AC-006:** Given the value stored under the tasks key in `localStorage` is malformed or unsupported (invalid JSON or wrong shape), when the app starts, then it displays an empty task list and does not crash or show an error to the user.
- **AC-007:** Given the value stored under the filter key in `localStorage` is malformed or unsupported, when the app starts, then the active filter defaults to `all` and the app does not crash.
- **AC-008:** Given `localStorage` is unavailable or a write throws an error (e.g., private browsing, quota exceeded), when the user performs a task or filter action, then the action still completes in the UI for that session, no error is shown to the user, and the app does not crash.
- **AC-009:** Given task data persisted on one browser/device, when the app is opened in a different browser or on a different device, then no tasks are automatically synced from the original browser/device.

## Non-Functional Requirements
- **NFR-001:** Persistence read/write operations must not introduce noticeable UI latency; standard synchronous `localStorage` calls are acceptable and no loading indicator is required for save/load operations.
- **NFR-002:** All persistence-related error handling (read and write) must degrade gracefully — the task board must remain fully usable in-memory for the session even if persistence is entirely unavailable.

## Business Rules and Constraints
- **BR-001:** A browser/profile with no saved data shows an empty task board; the previously hardcoded starter tasks are no longer shown by default (clarification 1).
- **BR-002:** Persisted data is scoped strictly to the browser/profile/device via `localStorage`; no mechanism syncs data across browsers or devices (clarification 5).
- **BR-003:** Users may remove tasks only individually via the existing Delete action; no bulk reset/clear-all action is provided by this requirement (clarification 6).
- **BR-004:** Persistence write failures are handled silently; the application must never surface a persistence error to the user (clarification 4).
- **BR-005:** Task data must remain local to the browser and must not require a backend or a user account (source AC-6).

## Data, Integrations, and Dependencies
- Persisted task shape: array of `{ id: number, title: string, status: 'open' | 'done', priority: 'Low' | 'Medium' | 'High' }`, matching the existing `Task` type in `src/App.tsx`.
- Persisted filter shape: one of `'all' | 'open' | 'done'`, matching the existing `filter` state in `src/App.tsx`.
- Dependency: browser `window.localStorage` API. No backend, database, or external API is introduced.
- Storage key naming is an implementation detail not specified by the source story (see Assumptions).

## Assumptions
- Specific `localStorage` key names are left to the implementer; keys should be descriptive and namespaced to this app to avoid collisions with other data at the same origin.
- No data versioning or migration strategy is required by this story; future changes to the `Task` shape are out of scope here.
- Behavior when multiple tabs of the same browser write to `localStorage` concurrently (e.g., last-write-wins) is not specified by the story and is not tested by these requirements.
- The existing `starterTasks` constant may remain in the codebase (e.g., for reference or tests) but must not be used as the default seed when no persisted data exists.

## Traceability
| Requirement | Source or clarification |
| --- | --- |
| FR-001 | Source AC-3 |
| FR-002 | Source AC-2 |
| FR-003 | Source AC-1 |
| FR-004 | Source AC-2 |
| FR-005 | Source AC-4; clarification 1 (empty list, remove starterTasks as default) |
| FR-006 | Clarification 3 (default filter `all`) |
| FR-007 | Source AC-5 |
| FR-008 | Source AC-5; clarification 3 |
| FR-009 | Clarification 4 (silent write-failure handling) |
| FR-010 | Source AC-5; clarification 4 |
| FR-011 | Source AC-1 (original ordering) |
| FR-012 | Source AC-6 |
| AC-001 | Source AC-1 |
| AC-002 | Source AC-2; clarification 2 (localStorage for reopen/close survival) |
| AC-003 | Source AC-3 |
| AC-004 | Source AC-4; clarification 1 |
| AC-005 | Clarification 3 |
| AC-006 | Source AC-5 |
| AC-007 | Source AC-5; clarification 3 |
| AC-008 | Clarification 4 |
| AC-009 | Clarification 5 (no cross-device/browser sync) |
| BR-001 | Clarification 1 |
| BR-002 | Clarification 5 |
| BR-003 | Clarification 6 |
| BR-004 | Clarification 4 |
| BR-005 | Source AC-6 |

## Open Questions
- None. All material ambiguities were resolved via clarification with the requester (see Traceability).
