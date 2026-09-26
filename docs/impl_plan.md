# Implementation Plan – KAN-35

## Overview
Implement browser Local Storage persistence for the Demo Task Board task list so that tasks are restored after page refresh/reload and on return to the app. Persistence must be automatic (no extra user actions) and gracefully handle missing/invalid storage data without crashing.

Canonical ticket: [KAN-35](https://epam-team-nub9hqqn.atlassian.net/browse/KAN-35)


## Assumptions
- The app is a frontend-only React + TypeScript app and maintains tasks in React state today.
  - If the state is managed deeply inside components, we will add a dedicated persistence helper hook/utility and minimally rewire the top-level state initialization to use it.
  - (Assumption) Task shape is approximately: id: string, title: string, status: 'Open' | 'Done' (or enum), priority: 'Low' | 'Medium' | 'High'. We'll match the actual codebase types once inspected during implementation.
- Local Storage key name: we'll use a collision-resistant namespace as per FR-4, e.g. `demo_task_board:tasks` (final key to be confirmed in code review).
  - The ticket hants a key like `demo_task_board_tasks`; we'll prefer namespacing with a colon to reduce origin collisions, but either is acceptable if consistent.
- Filter state persistence (FR-6): we will NOT persist the active filter in this change and it will reset to `All` on reload. This will be documented in this plan and in code comments as needed.


## Scope
In scope:
- Persist the task array to Local Storage on every state-mutating action (including add, toggle status, open/done, delete).
  - Mapping to: AC Scenario 2, 3, 4, 5 and FR-1,5.
  - Note: the ticket says "before the page renders the updated list". In React, state update and render are synchronous wrt the event handler turn, but storage write can be done in the state updater (functional setState) to ensure it executes before the next paint.
- Restore tasks from Local Storage on app initialization, with graceful fallback to default starter tasks when data is missing/empty/corrupt.
  - Mapping to: AC Scenario 1, 6 and FR-2,3.
  - Implem explicit try/catch to handle Mode where localStorage is unavailable (NFR-2).
- Extract persistence logic into a dedicated utility/hook e.g. `useLocalStoragedState` or similar, as required by NFR-6.
- Add unit tests covering load/save, corrupted-JSON fallback, and error (handled) paths (DoD, and NFR-2). Exact testing framework will match repo config (e.g. Vitest or Jest).


Out of scope (ticket explicitly): backend, sync across devices/browsers, auth, import/export, manual save button.


## Proposed Design

### Data model & storage format
- Local Storage key: `demo_task_board:tasks` (final)
- Value: JSON string representing an envelope with version and data:
  ```json
  {
    "v": 1,
    "tasks": [
      { "id": "...", "title": "...", "status": "Open", "priority": "High" }
    ]
  }
  ```
- Validation:
  - On read, ensure we got an object with `number` version and `array` tasks.
  - On task entries, ensure required fields exist and are of expected types. If not, treat as invalid and fallback to defaults (ticket's "Schema version" risk mitigation)..

### State initialisation (load)
- Introduce a helper: `readTasksFromStorage(): Task[] | null`
  - Wrap `catch (err)` to handle private mode/disabeled storage.
  - Return null if key missing/empty/parse fails/validation fails.
- Use a lazy initial state based on storage:
  - `initState = () => readTasksFromStorage() ?? defaultStarterTasks`

### State persistence (save)
- Introduce a helper: `writeTasksToStorage(tasks: Task[]): void`
  - Serialise as the versioned envelope above.
  - Wrap in try/catch.
  - On `quota_exceeded` / `DomException` storage error, swallow and optionally log to console (no UI required by ticket, but see Observability section below).
- Hook into state mutations:
  - Option A (preferred): write to storage inside the functional state updater for add/toggle/delete. This makes the storage update acompany the exact new state value.
  - Option B (trade-off): `a useEffect` watching `tasks` to write on change. This is implemation-simple but doesn't guarantee the "prior to render" wording as strongly.
- We will use Option A.

### Human-readable design choices
- No UI changes are required by this ticket.
 - No filter persistence (This feature is optional); filter resets to `All` on reload.
 - Default starter tasks only used when there is no valid storage data (AC Scenario 6).

## Data/Schema changes
- None (frontend only).
- Add a small storage envelope version field (`"v": 1`) in stored JSON to mitigate stale data risks.


## API/UI changes
- None (ending storage is internal to the frontend).

## Edge cases
- LocalStorage missing key: use default starter tasks. **Maps: AC6, FR-3** 
- Empty string/null: treat as missing and fallback.
 - Invalid JSON (syntax error): catch, fallback, no crash. **Maps: AC6, FR-3** 
- Valid JSON but invalid shape (wrong types/schema version mismatch): fallback to defaults.
- LocalStorage unavailable (incognito/disabled): catch on read and write, app still functions in-memory (NFR-2).
 - Quota exceeded: catch error on write, app continues working inmemory (NFR-2). Optional console warn for developer visibility.
 - Multi-tab concurrency: known limitation (out of scope to sync via `storage` events).

## Security considerations
- Data comes from localStorage and is controlled by the end user; treat as untrusted input.
- Parsing via `JSON.parse` is safe by itself, but we must not dangerously inject unsanitised task titles into the DOM as HTML.
  - Assumption: titles are rendered as text (no `dangerouslySetInnerHTML`). We won't introduce it.
- Wrap all storage calls in try/catch to avoid exception-based DoS.

## Observability
- As the ticket mentions tracking fallback/quota events, but the repo may not have an analytics pipeline:
  - In code, add non-blocking `console.warn` for (storage unreadable, parse error, quota exceeded) behind a dev guard (e.g. `import.meta.env.DEV` for Vite).
  - If a tracking/utility exists in repo, wire these as events; otherwise document as a future improvement.


## Testing plan
- Unit tests (infer framework from repo, e.g. Vitest/Jest):
  - `readTasksFromStorage` when valid data exists returns task array. **Maps: AC1, FR-2-3**
  - `readTasksFromStorage` when key missing returns null (fallback handled by caller). **Maps: AC6, FR-3** 
  - `readTasksFromStorage` when invalid JSON does not throw and returns null. **Maps: AC6, FR-3** 
  - `writeTasksToStorage` writes envelope with version v=1. **Maps: FR-1, FR-5**
  - `writeTasksToStorage` swallows quota exceeded/errors and does not throw. **Maps: NFR-2**
- Integration (component level):
  - Guided scenarios to match acceptance criteria:
    1. Add task — reload app — verify task persists. **AC1, AC2**
    2. Toggle status — reload – verify status persists. **AC3**
    3. Delete task — reload – verify task does not return. **AC4** 
    4. Delete all tasks – reload – verify empty board (do not reinject starters). **AC5**
    5. Corrupt localStorage value (manually set invalid string) – reoad – app doesn't crash, default tasks load. **AC6**


## Migration / Rollout plan
- No backend migration.
- Consider a one-time migration guard:
  - If a previous key exists (e.g. `demo_task_board_tasks`) and the new key is namespaced, we can read from old key first (then write to new). (Marked as out of scope unless repo already uses that key.)
- Rollout: merge as a frontend change; low risk.


## Risks & mitigations
- Risk: Storage quota exceeded leads to unable to persist new changes.
  - Mitigation: try/catch on write; continue app functioning using in-memory state; optional developer warn log.
- Risk: Storage data corruption causes crash/broken board.
  - Mitigation: validate schema, catch JSON.parse errors, fallback to defaults.

- Risk: Multi-tab overwrites.
  - Mitigation: document known limitation; multi-tab sync is out of scope.


## Acceptance Criteria mapping
- AC1
  - Implem storage load on init (FR-2, FR-3) and storage writes on mutations (FR-1).
- AC2
  - On add, persist the new task array during the state updater. **FR-1**
- AC3
  - On toggle, persist updated status values.
- AC4
  - On delete, persist the array without that task.
  - Reload shows it absent.
 
- AC5
  - Persist empty array and do not reinject starter tasks if storage is valid but empty.
  - Important note: the loader must distinguish between "no storage data" vs "valid storage data with empty tasks".

- AC6
  - Catch json parse errors/validation failures and fallback to defaults without crash.


## Task checklist
- [ ] Confirm repo's actual Task type shape (fields and enums).
- [ ] Define storage key name (namespaced).
- [ ] Implement storage read utility with validation and try/catch.
 - [ ] Implement storage write utility with versioned envelope, try/catch, quota handling.
- [ ] Wire lazy initialisation of tasks from storage with fallback to starter tasks.
- [ ] Update add/toggle/delete handlers to persist the new array in the state updater.
- [ ] Add unit tests for read/write, invalid JSON fallback, error/derived paths.
- [ ] Manual test all 6 AC scenarios across Chrome/Firefox/Edge/Safari.
- [ ] Add brief documentation (in code comments or README if present) for: key, filter non-persistence, known limitations (multi-tab).
