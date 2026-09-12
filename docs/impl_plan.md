# KAN-30 — Implementation Plan: Local Storage Persistence for Task Board

## Overview
Implement client-side persistence for the Task Board using **browser Local Storage** so that tasks and derived stats survive page reloads. The app must:
- Load tasks from Local Storage on startup (if present)
- Fall back to default starter tasks when no saved data exists
- Persist task list on any change (create, update status, delete)
- Keep task statistics (Total/Open/Done) consistent with the persisted list

### Acceptance criteria mapping (KAN-30)
- **AC1:** Persist tasks (ID, Title, Status, Priority) to Local Storage on create/update/delete.
- **AC2:** On page reload, tasks are restored from Local Storage.
- **AC3:** If Local Storage is empty, default tasks are shown.
- **AC4:** Stats reflect the restored/persisted list after reload.
- **AC5:** No backend/API/auth/DB changes.

## Assumptions
- The application is a **pure frontend** task board (no server persistence).
- Existing task data model includes at least: `id`, `title`, `status` (Open/Done), and `priority` (or similar).
- The UI already supports creating tasks, toggling status, and deleting tasks.
- Local Storage key names are not yet standardized in the repo.

> If the repo uses TypeScript, interfaces/types will be updated accordingly. If it is JavaScript, we will document the shape and validate at runtime.

## Scope
- Add Local Storage read/write utilities.
- Wire persistence into the task state lifecycle:
  - **Initial load**: hydrate state from Local Storage.
  - **On change**: serialize and save the canonical task list.
- Ensure statistics derive from the in-memory task list (which is hydrated from Local Storage).
- Add tests covering persistence behavior.

## Out of Scope
- Any backend persistence, APIs, authentication, or database work (AC5).
- Sync across devices/users.
- Real-time collaboration.
- Versioning/migrations beyond simple forward-compatible parsing/validation.

## Proposed Design
### Storage strategy
- Store the **entire task list** as a single JSON payload in Local Storage.
- Use one key, e.g.:
  - `task_board.tasks.v1`

Rationale:
- Simple to manage and atomic.
- Avoids partial writes and inconsistent state.

### Data model to persist
Persist only what’s needed per AC1:
```json
{
  "version": 1,
  "updatedAt": "2026-09-12T00:00:00.000Z",
  "tasks": [
    {
      "id": "string|number",
      "title": "string",
      "status": "OPEN|DONE" ,
      "priority": "LOW|MEDIUM|HIGH"
    }
  ]
}
```
Notes:
- `version` enables future changes without breaking old data.
- `updatedAt` is optional but helpful for debugging.

### Application state flow
1. **App start**
   - Attempt to load from Local Storage.
   - If found and valid → set initial state to persisted tasks (AC2).
   - If missing/invalid → use default tasks (AC3).
2. **Any task mutation** (create / toggle done / delete)
   - Update in-memory state.
   - Persist updated state to Local Storage (AC1).
3. **Stats computation**
   - Always compute Total/Open/Done from current in-memory tasks.
   - Because initial state is hydrated from Local Storage, stats automatically match on reload (AC4).

### Implementation approach (framework-agnostic)
- Add a small persistence module, e.g. `src/utils/storage.*` or similar.
- Provide functions:
  - `loadTasks(): Task[] | null`
  - `saveTasks(tasks: Task[]): void`
  - `clearTasks(): void` (optional, used for dev/testing)
- Use a single source of truth (task list state). Persist via:
  - React: `useEffect(() => saveTasks(tasks), [tasks])`
  - Or, if using reducers: persist inside reducer middleware/dispatch wrapper.

## Data/Schema changes
- **Local Storage schema**: introduce `task_board.tasks.v1` JSON payload.
- No database/schema changes (AC5).

## API/UI changes
- **No API changes** (AC5).
- UI remains the same; behavior changes:
  - After reload, the board shows previously saved tasks (AC2).
  - Default starter tasks only appear when there is no saved payload (AC3).

Optional (only if already present in UI patterns; otherwise omit):
- Add a “Reset board” button for QA/dev to clear Local Storage.

## Edge cases
- Local Storage not available (private mode, disabled storage, SSR environment):
  - Gracefully fall back to in-memory default tasks.
  - Do not crash; log a warning in dev.
- Corrupted JSON / unexpected schema:
  - Catch JSON parse errors.
  - Validate minimal task fields.
  - If invalid → ignore stored data and use defaults.
- Large task list exceeding Local Storage quota:
  - Catch `QuotaExceededError` on write.
  - Keep app functional in-memory; surface console warning.
- ID collisions:
  - Ensure new task IDs remain unique even after hydration.
  - Prefer UUIDs or monotonic timestamp-based IDs.

## Security considerations
- Local Storage is readable by any script running on the origin:
  - Do not store secrets.
  - Only store task data (title/status/priority/id) as per AC1.
- Treat stored content as untrusted:
  - Validate and sanitize fields (e.g., title as string length limit).
  - UI should render titles safely (no `dangerouslySetInnerHTML`).

## Observability
- Add lightweight console diagnostics in non-production builds:
  - Log when data is loaded from storage vs defaults.
  - Log parse/validation failures.
  - Log quota errors on save.

If the repo already has logging utilities, use them; otherwise keep minimal.

## Testing plan
### Unit tests
- `loadTasks`:
  - returns tasks when valid payload exists (AC2)
  - returns `null` when key missing (AC3 path)
  - returns `null` on invalid JSON
  - returns `null` on schema mismatch (missing required fields)
- `saveTasks`:
  - writes JSON with version/tasks
  - handles quota errors gracefully

### Integration tests
- Render app with pre-populated Local Storage:
  - tasks appear correctly after initial render (AC2)
  - stats match tasks (AC4)
- Create/toggle/delete actions:
  - verify Local Storage updated after each operation (AC1)

### E2E (if framework exists in repo)
- Scenario:
  1. Load app (no Local Storage) → see default tasks (AC3)
  2. Add a task and mark one done
  3. Reload page → see persisted tasks/state and correct stats (AC1/AC2/AC4)

## Migration/Rollout plan
- No server rollout.
- On first launch after release:
  - If no Local Storage payload exists → defaults shown (AC3).
  - As soon as user makes a change, a v1 payload is created.
- Future-proofing:
  - If `version !== 1`, ignore and fall back to defaults until a migration is implemented.

## Risks & mitigations
- **Risk:** Breaking initial default task load logic.
  - *Mitigation:* Implement hydration as “try load → else defaults” and add tests.
- **Risk:** Persisting derived state (stats) causing inconsistency.
  - *Mitigation:* Persist only tasks; derive stats at runtime.
- **Risk:** Storage errors crash app.
  - *Mitigation:* Wrap all storage access in try/catch; safe fallbacks.

## Task checklist (mapped to acceptance criteria)
- [ ] Identify current task model and where task state is managed.
- [ ] Add Local Storage utility module with `loadTasks/saveTasks`.
- [ ] Implement startup hydration from Local Storage (AC2, AC3).
- [ ] Persist task list on create/toggle/delete (AC1).
- [ ] Ensure stats derive from hydrated in-memory list (AC4).
- [ ] Add unit tests for storage utilities.
- [ ] Add integration tests ensuring Local Storage updates and reload restores state.
- [ ] Confirm no backend/API/auth/DB changes were introduced (AC5).
