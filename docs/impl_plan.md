# Implementation Plan – KAN-39

## Overview
Implement browser `localStorage` persistence for the Demo Task Board so that the task list (ID, title, priority, status) survives page refresh, tab close/reopen, and browser restart. Persistence must be automatic (no Save button), encapsulated in a reusable custom hook, and handle corrupted/unavailable storage gracefully.

## Jira reference
- Ticket: KAN-39 https://epam-team-nub9ahqn.atlassian.net/browse/KAN-39
- Summary: Implement Local Storage Persistence to Retain Tasks Across Page Refreshes

## Acceptance Criteria mapping
1. Persist after refresh → load tasks from `localStorage` on init; compute stats from loaded tasks.
2. Persist after tab close/reopen → same as (1); storage-backed initialization.
3. Persist status change → write to storage after toggling status.
4. Persist deletion → write to storage after delete.
5. Persist empty board → if stored array is `[]`, do not re-seed starter tasks.
6. Corrupted storage → catch JSON parse errors; fall back to default starter tasks; no uncaught errors.

## Assumptions
- App is React + TypeScript (ticket mentions Vite).
- There is a single source of truth for the tasks array.
- Task model includes at least: `id`, `title`, `priority`, `status`.
- A unit test runner may or may not be present; if missing, add Vitest + jsdom as needed.

## Scope
In scope:
- Persist tasks to `localStorage` under a fixed key (recommended by DoR: `demo_task_board_tasks`).
- Read storage on application mount; use stored tasks if valid JSON array; otherwise fall back to default starter tasks.
- Encapsulate read/write logic in a reusable custom hook.
- Catch and ignore storage read/write failures (quota, private mode restrictions) so app continues in-memory.

Out of scope (per ticket):
- Backend/API/DB persistence, auth, multi-user sync, cross-device sync, export/import, encryption, multi-tab live sync.

## Proposed Design
### 1) Storage key and payload
- Key: `demo_task_board_tasks`.
- Value: JSON stringified array of task objects.
- Persist all existing task fields required by the UI (id/title/priority/status).

### 2) Reusable hook
Implement a hook (name per repo conventions) similar to:
- `useLocalStorageState<T>(key: string, initialValue: T | (() => T))`

Behavior:
- Synchronous initializer reads from `localStorage` before first render (avoid flash of defaults).
- Guards for SSR (`typeof window === 'undefined'`).
- `try/catch` around `JSON.parse` and return `initialValue` on errors.
- Validate parsed value is the expected runtime type (at minimum `Array.isArray`).
- Effect writes `JSON.stringify(value)` on every change; `try/catch` around `setItem` and swallow errors.

### 3) App integration
- Find the component where tasks state is initialized (likely `App.tsx` or board container).
- Replace `useState(starterTasks)` with the storage-backed hook:
  - `const [tasks, setTasks] = useLocalStorageState(STORAGE_KEY, starterTasks)`
- Ensure all mutations (add/delete/toggle status) update `tasks` via `setTasks` so writes happen.
- Ensure stats (Total/Open/Done) are derived from `tasks` so they reflect persisted state.

## Data/Schema changes
- None (client-side storage only).

## API/UI changes
- None expected.

## Edge cases
- Corrupt JSON: catch parse error; fall back to defaults; no uncaught error (AC6).
- Storage unavailable (private mode, security error): degrade to in-memory; no crash.
- Quota exceeded: catch on write; app continues functioning in-memory.
- Empty array is valid persisted state: do not re-inject starter tasks (AC5).

## Security considerations
- Ticket states no sensitive data. Do not store anything beyond task fields.

## Observability
- No analytics framework. Optional dev-only debug log for “loaded from storage vs defaults”.

## Testing plan
### Unit tests (hook)
Cover per DoD:
- Read valid JSON → initializes with persisted tasks.
- Missing key → uses defaults.
- Corrupt JSON → uses defaults; no throw.
- Write on change → `setItem` called with stringified payload.
- Write failure → no crash; state still updates.

### Manual/Integration (map to AC)
- AC1/AC2: create tasks, refresh, close/reopen tab; verify tasks + stats.
- AC3: toggle Done, refresh; verify.
- AC4: delete task, refresh; verify.
- AC5: delete all, refresh; verify empty state and no starter tasks.
- AC6: set malformed storage value and reload; verify fallback without errors.

## Migration/Rollout plan
- No migration. On first load: storage present → use it; else defaults. Next mutation writes storage.

## Risks & mitigations
- Flash of default tasks: use synchronous initializer.
- Storage failures crash app: wrap reads/writes in `try/catch`.

## Task checklist
- [ ] Confirm current task model and where starter tasks live.
- [ ] Define storage key constant `demo_task_board_tasks`.
- [ ] Implement reusable localStorage hook with parsing/validation + safe writes.
- [ ] Wire tasks state to use the hook.
- [ ] Verify AC5 empty persisted list does not re-seed.
- [ ] Add/Update unit tests for hook per DoD.
- [ ] Manual verify AC1–AC6 (Chrome/Firefox/Safari per DoD).
- [ ] Ensure `vite build` and lint/typecheck succeed.
