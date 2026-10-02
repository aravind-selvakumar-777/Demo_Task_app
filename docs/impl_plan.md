# Implementation Plan for KAN-42: Implement Local Storage Persistence for Tasks

---

Table of Contents:

* [Overview](#overview)
* [User Story](#user-story)
* [Functional Requirements](#functional-requirements)
* [Non-Functional Requirements](#non-functional-requirements)
* [Out of Scope](#out-of-scope)
* [Assumptions](#assumptions)
* [Proposed Design](#proposed-design)
* [Security Considerations](#security-considerations)
* [Observability](#observability)
* [Testing Plan](#testing-plan)
* [Edge Cases](#edge-cases)
* [Migration Plan](#migration-plan)
* [Risks & Mitigations](#risks-mitigations)
* [Engineering Checklist](#engineering-checklist)

---

## Overview

**Jira Ticket**: KAN-42

**Title**: Implement Local Storage Persistence for Tasks

**Priority**: High

### Context

Demo Task Board currently stores all tasks only in browser memory through React state. When users refresh the page, all tasks are lost and the board resets to default starter tasks. This severely limits the application's utility as a real project-management tool and creates a poor user experience.

---

## User Story

**As a** Project Manager or Individual Contributor

**I want** tasks to persist across browser sessions

**So that** I can rely on the task board for real project work without losing data on page refresh.

### Acceptance Criteria

 - [x] Given the task board is open with tasks created, when the user refreshes the page, then all tasks and their current state (title, priority, status) are restored exactly as they were before refresh.

 - [x] Given the user creates a new task and assigns it a priority, when the page is refreshed, then the new task is visible with the correct priority and Open status.

 - [x] Given the user marks a task as Done and deletes another task, when the page is refreshed, then the Done task remains marked as Done and the deleted task is not restored.

 - [x] Given the browser's local storage is cleared, when the user opens the task board, then the application loads with default starter tasks.

 - [x] Given the user is using the task board on mobile, when tasks are created and the browser is refreshed, then tasks persist correctly on mobile devices as well.

---

## Functional Requirements

1. Serialize the complete task list (ID, Title, Status, Priority) to browser local storage whenever a task is created, updated, or deleted

2. On application load, check for saved tasks in local storage and restore them to React state

3. If no saved tasks exist, load the default starter tasks as the initial state

4. Ensure all task state changes (status toggle, priority assignment, deletion) are immediately written to local storage

5. Provide a mechanism (e.g., a Reset button or developer console method) to clear local storage and restore default starter tasks if needed

---

## Non-Functional Requirements

### Performance

**Local storage operations must complete within 50ms to avoid UI lag.**

### Storage Capacity

**Support at least 500 tasks** (typical local storage limit is 5-10MB)

### Browser Compatibility

- Ensure local storage works on modern browsers: Chrome, Firefox, Safari, Edge (latest 2 versions)
- Test on common mobile browsers (iOS Safari, Android Chrome)

### Data Integrity

- Validate stored data on load; if corrupted, fall back to default starter tasks
- Catch JSON parse errors and log warnings

### Accessibility

- No new accessibility barriers introduced
- Existing keyboard navigation and screen reader support persists through persistence implementation

---

## Out of Scope

- Backend database or server-side persistence
- Multi-user synchronization or conflict resolution
- Encryption or security measures beyond browser local storage defaults
- Export/import functionality (future story)
- Cloud sync or network sync
- Archiving old tasks

---

## Assumptions

1. Task structure includes: `id` (number), **title** (string), **status** (`open` | `done`), **priority** (`Low` | `Medium` | `High`)

2. Task state is managed via central React state hook (`useState`) or a custom `useLocalStorage` hook

3. Default tasks are pre-defined and available to load when storage is empty or corrupt

4. No external libraries are required; native browser Local Storage API is sufficient

5. Storage key is configurable (e.g., `demo_task_board_tasks`)

---

## Proposed Design

### Architecture Overview

**Component Hierarchy**:

- `App.tsx` (Root)
   - Mount effect to read local storage activates here
   - Task state lives here
   - Fetch from local storage or defaults
   - Pass update functions to children components
   - Save to storage on any change

### Persistence Engine (Utility Module)

Create a new utility module: `src/storage.ts`

```typescript
// Constants
const STORAGE_KEY = 'demo_task_board_tasks';

// Types
interface Task {
  id: number;
  title: string;
  status: 'open' | 'done';
  priority: 'Low' | 'Medium' | 'High';
}

// Save tasks to local storage
export function saveTasks(tasks: Task[]): void {
  try {
    const jsonString = JSON.stringify(tasks);
    localStorage.setItem(STORAGE_KEY, jsonString);
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[TaskBoard] Failed to save tasks:', String(error));
    }
  }
}

// Load tasks from local storage
export function loadTasks(): Task[] | null {
  try {
    const storedTasks = localStorage.getItem(STORAGE_KEY);
    if (!storedTasks) return null; // No saved tasks

    const parsedTasks = JSON.parse(storedTasks) as Task[];
    return parsedTasks;
  } catch (error) {
    if (import.meta.env.DEV) {
      console.warn('[TaskBoard] Failed to parse stored tasks:', String(error));
    }
    return null; // Fallback to defaults
  }
}
```

### Custom Hook

Create `src/useLocalStorage.ts` — a generic React hook that wraps `useState` and automatically syncs to localStorage via a `useEffect`.

---

## Security Considerations

- No sensitive data is stored; tasks are plain user-authored text
- localStorage is scoped to the origin; no cross-site exposure
- Verbose error logs (which could expose storage internals) are gated behind `import.meta.env.DEV`

---

## Observability

- Dev-mode console warnings for storage read/write failures
- Warnings are suppressed in production builds to avoid leaking internal details

---

## Testing Plan

### Unit Tests (Vitest + Testing Library)

- `src/storage.test.ts` — covers `saveTasks`, `loadTasks`, `clearTasks`, `isValidTaskArray`
- `src/useLocalStorage.test.ts` — covers hook initialisation, persistence, and validation
- `src/App.test.tsx` — covers rendering, task creation, toggle, deletion, filtering, persistence on load, reset

### E2E Tests (Playwright)

- `e2e/task-board.spec.ts` — 22 test cases (TC-01 through TC-22) covering all user-facing flows

---

## Edge Cases

- Empty localStorage → fallback to starter tasks
- Corrupted JSON in localStorage → fallback to starter tasks
- Schema-invalid data (e.g., wrong field types) → fallback to starter tasks
- Storage quota exceeded → silent no-op with dev-mode warning
- Two tasks added in rapid succession → IDs use `Date.now() + random offset` to reduce collision probability

---

## Migration Plan

No migration required — this is a greenfield persistence layer. Existing users (with no localStorage data) will automatically see starter tasks on first load.

---

## Risks & Mitigations

| Risk | Mitigation |
|---|---|
| localStorage unavailable (private browsing) | Try/catch around all storage calls; silent no-op |
| Corrupted stored data | Schema validation via `isValidTaskArray`; fallback to defaults |
| ID collisions | `Date.now() + Math.random()` offset reduces probability; future improvement: `crypto.randomUUID()` with string IDs |
| Breaking version changes in dependencies | All dependencies pinned to semver ranges in `package.json`; `engines` field specifies required Node version |

---

## Engineering Checklist

- [x] `src/storage.ts` — `saveTasks`, `loadTasks`, `clearTasks`, `isValidTaskArray`
- [x] `src/useLocalStorage.ts` — generic hook with optional validator
- [x] `src/App.tsx` — uses `useLocalStorage` for tasks only; `title`/`priority`/`filter` use plain `useState`
- [x] Reset button implemented with `aria-label`
- [x] `data-testid` attributes on stat spans for stable E2E selectors
- [x] All `console.warn` calls gated behind `import.meta.env.DEV`
- [x] Dependencies pinned to semver ranges; `engines` field added to `package.json`
- [x] Unit tests: 78 passing
- [x] E2E tests: 22 scenarios
- [x] README updated
