# Implementation Plan: Task Board Persistence Feature

**Plan Date**: 2026-09-07  
**Project**: Vite + React + TypeScript Task Board  
**Feature**: Automatic task persistence using sessionStorage  
**Architecture**: Hooks-based with SessionStorageAdapter  
**Status**: Ready for implementation (design review: CONDITIONAL APPROVAL)  

---

## Scope and Architecture Assumptions

### Approved Design Resolution
This plan incorporates design review findings:
- **CRITICAL (FINDING 1)**: Load is **synchronous** (not async) to eliminate race conditions
- **HIGH (FINDING 2)**: Priority validation split—hook validates at creation, adapter filters on load
- **Baseline**: Debounced auto-save (50ms), graceful degradation, auto-clear `storageError` on successful save

### Technology Stack
- React 18+ (Hooks API)
- TypeScript
- Browser `sessionStorage` API
- Vite (build tooling)

### Key Invariants
1. Only tasks with a `priority` field are persisted
2. Maximum 8 tasks in storage and memory
3. Auto-save triggered on any task mutation (add/update/delete)
4. Debounce timer is cleaned up on component unmount to prevent orphan saves

### Known Risks & Mitigations
| Risk | Severity | Mitigation |
|------|----------|-----------|
| sessionStorage quota exceeded | Medium | Log to console, gracefully degrade to memory, notify user |
| Task loses priority on update if not preserved in UI | Medium | updateTask() passes through all fields; UI must include priority in payload |
| Race condition if unmount occurs during debounced save | Low | Cleanup function executes pending save exactly once before component unmounts |
| Corrupted JSON in sessionStorage | Low | Try-catch on parse, return empty array, log to console |

---

## Implementation Task Breakdown

### Task 1: Define Task Type and Storage Payload Schema
**Task ID**: T1  
**Phase**: Foundation  
**Priority**: P0 (Critical Path)  
**Dependencies**: None  
**Estimated Complexity**: 1/5 (Simple type definition)

#### Description
Create the TypeScript type definition for `Task` and the storage payload format. This establishes the data contract for all downstream components.

#### Deliverables
- **File**: [src/types/Task.ts](src/types/Task.ts) (NEW)
- **Exports**:
  - `type Task` (5 fields: id, title, status, priority, ordering not required as array order suffices)
  - `interface StoragePayload` (version, timestamp, tasks)

#### Implementation Details

```typescript
// src/types/Task.ts
export type Task = {
  id: number;                      // Unique identifier (e.g., Date.now())
  title: string;                   // Non-empty task description
  status: 'open' | 'done';         // Current state
  priority: 'Low' | 'Medium' | 'High'; // Required for persistence
};

export interface StoragePayload {
  version: string;                 // "1.0" for schema versioning
  timestamp: number;               // ms since epoch, for debugging
  tasks: Task[];                   // Array of up to 8 tasks
}
```

#### Acceptance Criteria
- [ ] `src/types/Task.ts` exists and exports both `Task` type and `StoragePayload` interface
- [ ] Task type includes exactly 4 required fields: id, title, status, priority
- [ ] priority field type is a union of 'Low' | 'Medium' | 'High'
- [ ] id field is number type (supports Date.now() format)
- [ ] File compiles without TypeScript errors
- [ ] Exports are importable from `src/types/Task` in other modules

#### Requirement Traceability
- **FR1**: Task structure includes priority field (persistence requirement)
- **FR4**: Data structure covers title, priority, status, and ordering
- **NFR3**: JSON serialization format defined

#### Verification Gate
- Compile TypeScript: `npx tsc --noEmit`
- Verify types are exported and importable

---

### Task 2: Implement SessionStorageAdapter (Persistence Layer)
**Task ID**: T2  
**Phase**: Foundation  
**Priority**: P0 (Critical Path)  
**Dependencies**: T1 (Task type definition)  
**Estimated Complexity**: 2/5 (Straightforward, with error handling)

#### Description
Implement the `SessionStorageAdapter` class that encapsulates all sessionStorage operations. This adapter is stateless and provides `load()` and `save()` methods with comprehensive error handling.

**Key Design Decisions Enforced**:
- **Synchronous load**: `load(): Task[]` (no async) to eliminate race conditions
- **Async save signature**: `save(tasks: Task[]): Promise<void>` for consistency and testability
- **Priority filtering on load**: Tasks without priority are silently filtered during restoration
- **Dumb save**: `save()` method does not validate or filter; adapter is stateless

#### Deliverables
- **File**: [src/services/SessionStorageAdapter.ts](src/services/SessionStorageAdapter.ts) (NEW)
- **Class**: `SessionStorageAdapter`
- **Public Methods**:
  - `constructor(storageKey: string = 'taskBoardData')`
  - `load(): Task[]` (synchronous)
  - `save(tasks: Task[]): Promise<void>` (async)
  - `hasCapacity(currentCount: number): boolean`
  - `clear(): void`
- **Singleton Export**: `export const storageAdapter = new SessionStorageAdapter();`

#### Implementation Details

**Load Method** (Synchronous):
```typescript
load(): Task[] {
  try {
    const raw = sessionStorage.getItem(this.storageKey);
    if (!raw) return [];
    const payload: StoragePayload = JSON.parse(raw);
    // Filter: only tasks with priority field
    const filtered = (payload.tasks || []).filter(task => task.priority);
    // Cap: max 8 tasks
    return filtered.slice(0, 8);
  } catch (error) {
    console.error(`Failed to load tasks from sessionStorage:`, error);
    return [];
  }
}
```

**Save Method** (Async):
```typescript
async save(tasks: Task[]): Promise<void> {
  try {
    const payload: StoragePayload = {
      version: '1.0',
      timestamp: Date.now(),
      tasks: tasks.slice(0, 8) // Safeguard: cap at 8
    };
    const serialized = JSON.stringify(payload);
    sessionStorage.setItem(this.storageKey, serialized);
  } catch (error) {
    if (error instanceof DOMException && error.code === 22) {
      // QuotaExceededError
      console.warn('sessionStorage quota exceeded; tasks saved in memory only');
    } else {
      console.error('Failed to save tasks to sessionStorage:', error);
    }
    throw new Error('Storage save failed'); // Re-throw for hook to catch
  }
}
```

**HasCapacity Method**:
```typescript
hasCapacity(currentCount: number): boolean {
  return currentCount < 8;
}
```

**Clear Method**:
```typescript
clear(): void {
  try {
    sessionStorage.removeItem(this.storageKey);
  } catch (error) {
    console.error('Failed to clear sessionStorage:', error);
  }
}
```

#### Acceptance Criteria
- [ ] `src/services/SessionStorageAdapter.ts` exists and exports class and singleton
- [ ] `load()` is synchronous (not async) and returns `Task[]`
- [ ] `load()` filters out tasks without a priority field
- [ ] `load()` caps returned array at 8 tasks
- [ ] `load()` returns empty array on parse error (no throw)
- [ ] `save()` is async and accepts `Task[]` parameter
- [ ] `save()` serializes to StoragePayload format (version, timestamp, tasks)
- [ ] `save()` throws Error on quota exceeded or serialization failure (catch in hook)
- [ ] `hasCapacity(7)` returns true; `hasCapacity(8)` returns false
- [ ] `clear()` removes key from sessionStorage
- [ ] Error messages logged to console for debugging
- [ ] Singleton instance exported as `storageAdapter`

#### Requirement Traceability
- **FR1**: Persists to sessionStorage with 8-task limit
- **FR1**: Only tasks with priority are persisted (via filter on load)
- **NFR2**: Error handling with graceful degradation (catch, log, continue)
- **NFR3**: JSON serialization, storage key is `taskBoardData`

#### Verification Gate
- Unit test: `load()` with valid payload returns filtered tasks
- Unit test: `load()` with no priority field filters task out
- Unit test: `save()` throws on quota exceeded
- Unit test: `hasCapacity()` returns correct boolean
- Manual test: Add 8 tasks, verify save completes in <100ms

---

### Task 3: Implement useTaskPersistence Hook
**Task ID**: T3  
**Phase**: Integration  
**Priority**: P0 (Critical Path)  
**Dependencies**: T1 (Task type), T2 (SessionStorageAdapter)  
**Estimated Complexity**: 3/5 (Debounce logic, error handling)

#### Description
Implement the custom React hook that manages task state, auto-save logic, and error handling. This hook is the bridge between the UI (App.tsx) and the persistence layer (SessionStorageAdapter).

**Key Design Enforcements**:
- **Synchronous mount load**: Call `storageAdapter.load()` during useEffect to hydrate tasks
- **Debounced auto-save** (50ms): Batch rapid mutations, ensure <100ms save latency
- **Return signature**: Includes status strings for hook consumers ('success', 'max_limit_exceeded', 'priority_required')
- **Auto-clear storageError**: On successful save, set `storageError = null`
- **Debounce cleanup on unmount**: useEffect cleanup clears timer, allows pending save to execute once

#### Deliverables
- **File**: [src/hooks/useTaskPersistence.ts](src/hooks/useTaskPersistence.ts) (NEW)
- **Hook Export**: `function useTaskPersistence(storageKey: string = 'taskBoardData'): UseTaskPersistenceReturn`
- **Return Type**:
  ```typescript
  type UseTaskPersistenceReturn = {
    tasks: Task[];
    addTask: (task: Omit<Task, 'id'>) => 'success' | 'max_limit_exceeded' | 'priority_required';
    updateTask: (id: number, updates: Partial<Task>) => void;
    deleteTask: (id: number) => void;
    storageError: string | null;
  };
  ```

#### Implementation Details

**Hook Structure**:
```typescript
// src/hooks/useTaskPersistence.ts
import { useState, useEffect, useRef } from 'react';
import { Task } from '../types/Task';
import { storageAdapter } from '../services/SessionStorageAdapter';

export function useTaskPersistence(
  storageKey: string = 'taskBoardData'
): UseTaskPersistenceReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Mount: Synchronous load from sessionStorage
  useEffect(() => {
    const loadedTasks = storageAdapter.load();
    setTasks(loadedTasks);
  }, []);

  // Auto-save effect: Debounce and save on tasks change
  useEffect(() => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        await storageAdapter.save(tasks);
        setStorageError(null); // Auto-clear on success
      } catch (error) {
        setStorageError((error as Error).message || 'Storage save failed');
      }
    }, 50); // 50ms debounce

    // Cleanup: Ensure timer is cleared on unmount
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [tasks]);

  const addTask = (task: Omit<Task, 'id'>): 'success' | 'max_limit_exceeded' | 'priority_required' => {
    if (!task.priority) {
      return 'priority_required';
    }
    if (!storageAdapter.hasCapacity(tasks.length)) {
      return 'max_limit_exceeded';
    }
    const newTask: Task = {
      id: Date.now(),
      ...task
    };
    setTasks(prev => [newTask, ...prev]);
    return 'success';
  };

  const updateTask = (id: number, updates: Partial<Task>): void => {
    setTasks(prev =>
      prev.map(task =>
        task.id === id ? { ...task, ...updates } : task
      )
    );
  };

  const deleteTask = (id: number): void => {
    setTasks(prev => prev.filter(task => task.id !== id));
  };

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    storageError
  };
}

type UseTaskPersistenceReturn = {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id'>) => 'success' | 'max_limit_exceeded' | 'priority_required';
  updateTask: (id: number, updates: Partial<Task>) => void;
  deleteTask: (id: number) => void;
  storageError: string | null;
};
```

#### Acceptance Criteria
- [ ] `src/hooks/useTaskPersistence.ts` exists and exports named hook
- [ ] Hook initializes tasks synchronously from `storageAdapter.load()` on mount
- [ ] `addTask()` returns 'priority_required' if priority is missing
- [ ] `addTask()` returns 'max_limit_exceeded' if 8 tasks exist
- [ ] `addTask()` returns 'success' if task created with auto-save triggered
- [ ] New task is assigned unique id using Date.now()
- [ ] `updateTask()` allows any Partial<Task> update (including priority changes)
- [ ] `deleteTask()` removes task by id
- [ ] Auto-save debounced at 50ms
- [ ] `storageError` is set on save failure
- [ ] `storageError` is auto-cleared (set to null) on next successful save
- [ ] Debounce timer is cleaned up on component unmount
- [ ] All mutations trigger auto-save debounce
- [ ] No TypeScript errors; hook is testable and mockable

#### Requirement Traceability
- **FR2**: Auto-save on task creation, update, delete
- **FR3**: Restore tasks on mount via synchronous load
- **FR5**: 8-task limit enforced via hasCapacity check
- **AC1**: Page refresh restores all tasks (via load on mount)
- **AC3**: Max task limit prevents 9th task creation
- **AC4**: Priority field required for creation
- **NFR1**: Auto-save completes in <100ms (50ms debounce + immediate save)
- **NFR2**: Error handling captures and communicates storage errors

#### Verification Gate
- Unit test: Mount loads tasks synchronously
- Unit test: addTask() with missing priority returns 'priority_required'
- Unit test: addTask() with 8 existing tasks returns 'max_limit_exceeded'
- Unit test: Mutation triggers debounced save
- Unit test: storageError auto-clears on successful save
- Integration test: Add 3 tasks, refresh page, verify all 3 persist

---

### Task 4: Update App.tsx to Integrate useTaskPersistence Hook
**Task ID**: T4  
**Phase**: Integration  
**Priority**: P1 (Feature Completion)  
**Dependencies**: T3 (useTaskPersistence hook)  
**Estimated Complexity**: 3/5 (UI updates, error display, validation feedback)

#### Description
Integrate the `useTaskPersistence` hook into `App.tsx`. Update the task board UI to:
1. Use hook's task state and mutations
2. Display error notifications when storage fails
3. Show "max tasks" warning when 8 tasks exist
4. Display priority field in add task form
5. Validate priority is provided before allowing add

#### Deliverables
- **File**: [src/App.tsx](src/App.tsx) (MODIFIED)
- **Changes**:
  - Call `useTaskPersistence()` hook
  - Replace direct state mutations with hook methods
  - Add error notification UI (if storageError is set)
  - Add priority field to task form (required)
  - Add warning message when 8 tasks exist
  - Handle addTask() return values (success/max_limit_exceeded/priority_required)
  - Preserve existing task rendering and styling

#### Implementation Details

**Integration Pattern**:
```typescript
// src/App.tsx
import { useTaskPersistence } from './hooks/useTaskPersistence';
import { Task } from './types/Task';

function App() {
  const { tasks, addTask, updateTask, deleteTask, storageError } = useTaskPersistence();
  const [formTitle, setFormTitle] = useState('');
  const [formPriority, setFormPriority] = useState<'Low' | 'Medium' | 'High' | ''>('');
  const [addError, setAddError] = useState<string | null>(null);

  const handleAddTask = () => {
    setAddError(null);
    if (!formTitle.trim()) {
      setAddError('Task title is required');
      return;
    }
    if (!formPriority) {
      setAddError('Priority is required');
      return;
    }
    const result = addTask({
      title: formTitle.trim(),
      status: 'open',
      priority: formPriority as 'Low' | 'Medium' | 'High'
    });
    if (result === 'success') {
      setFormTitle('');
      setFormPriority('');
    } else if (result === 'max_limit_exceeded') {
      setAddError('Maximum 8 tasks reached');
    } else if (result === 'priority_required') {
      setAddError('Priority is required');
    }
  };

  return (
    <div className="app">
      {storageError && (
        <div className="error-banner">
          ⚠️ Persistence error: {storageError}. Data saved in memory only.
        </div>
      )}

      <div className="task-form">
        <input
          type="text"
          placeholder="Enter task title"
          value={formTitle}
          onChange={e => setFormTitle(e.target.value)}
        />
        <select
          value={formPriority}
          onChange={e => setFormPriority(e.target.value as any)}
        >
          <option value="">Select Priority</option>
          <option value="Low">Low</option>
          <option value="Medium">Medium</option>
          <option value="High">High</option>
        </select>
        <button onClick={handleAddTask}>Add Task</button>
        {addError && <div className="form-error">{addError}</div>}
      </div>

      {tasks.length === 8 && (
        <div className="info-banner">ℹ️ Maximum 8 tasks reached</div>
      )}

      <div className="task-list">
        {tasks.map(task => (
          <div key={task.id} className="task-item">
            <div className="task-content">
              <input
                type="checkbox"
                checked={task.status === 'done'}
                onChange={e => updateTask(task.id, { status: e.target.checked ? 'done' : 'open' })}
              />
              <span className={task.status === 'done' ? 'done' : ''}>
                {task.title}
              </span>
              <span className={`priority priority-${task.priority.toLowerCase()}`}>
                {task.priority}
              </span>
            </div>
            <button onClick={() => deleteTask(task.id)}>Delete</button>
          </div>
        ))}
      </div>
    </div>
  );
}
```

**CSS Updates** (in [src/App.css](src/App.css)):
- Add `.error-banner` style (red, alert styling)
- Add `.info-banner` style (blue, info styling)
- Add `.form-error` style (error message under form)
- Add `.priority-low`, `.priority-medium`, `.priority-high` color badges
- Ensure task list renders with priority field visible

#### Acceptance Criteria
- [ ] `App.tsx` imports and calls `useTaskPersistence()` hook
- [ ] Form includes priority field (dropdown or select)
- [ ] Form validates title and priority are non-empty
- [ ] `addTask()` call checks return value and handles all three outcomes
- [ ] Success: form clears, task added to list
- [ ] Max exceeded: error message shown, task not added
- [ ] Priority required: error message shown, task not added
- [ ] `updateTask()` called when task status changes (checkbox)
- [ ] `deleteTask()` called on delete button click
- [ ] `storageError` from hook is displayed in error banner (if set)
- [ ] Task list shows each task's priority
- [ ] Warning message shown when tasks.length === 8
- [ ] Page renders tasks on load (from persisted data)
- [ ] No build errors; TypeScript strict mode passes

#### Requirement Traceability
- **FR2**: Auto-save triggered when form submits addTask()
- **FR3**: Tasks restored on page load via hook mount
- **FR4**: Task priority displayed in UI
- **AC1**: Tasks shown on refresh (loaded from sessionStorage)
- **AC3**: Warning shown when 8 tasks present
- **AC4**: Form validates priority field
- **NFR2**: Storage errors displayed to user

#### Verification Gate
- Build: `npm run build` succeeds
- Dev server: `npm run dev` serves without console errors
- Manual test: Add task with priority, refresh page, task persists
- Manual test: Add 8 tasks, verify 9th is rejected
- Manual test: Create task without priority, verify error shown

---

### Task 5: Unit Tests for SessionStorageAdapter
**Task ID**: T5  
**Phase**: Verification  
**Priority**: P2 (Quality Gate)  
**Dependencies**: T2 (SessionStorageAdapter)  
**Estimated Complexity**: 2/5 (Straightforward test cases)

#### Description
Write unit tests to verify SessionStorageAdapter behavior: load filtering, save serialization, error handling, and capacity checks.

#### Deliverables
- **File**: [src/services/SessionStorageAdapter.test.ts](src/services/SessionStorageAdapter.test.ts) (NEW)
- **Test Coverage**:
  - Load with valid payload → filters and returns tasks
  - Load with missing priority → filters out those tasks
  - Load with corrupted JSON → returns empty array
  - Load from empty storage → returns empty array
  - Save with 8 tasks → saves all
  - Save with 10 tasks → saves first 8 (safeguard)
  - Save with quota exceeded → throws error
  - hasCapacity(7) → true; hasCapacity(8) → false
  - clear() → removes key

#### Acceptance Criteria
- [ ] [src/services/SessionStorageAdapter.test.ts](src/services/SessionStorageAdapter.test.ts) exists
- [ ] Minimum 8 test cases covering all public methods
- [ ] All tests pass: `npm run test` or equivalent
- [ ] Load filtering correctly removes tasks without priority
- [ ] Save serialization creates correct StoragePayload format
- [ ] Error cases (quota, parse) are tested and handled
- [ ] Mocking of sessionStorage API is correct
- [ ] Coverage report shows adapter fully covered

#### Requirement Traceability
- **FR1**: Load filters priority-less tasks (data integrity)
- **NFR2**: Error handling verified in tests

#### Verification Gate
- Test suite runs and all tests pass
- Coverage meets 90%+ for adapter file

---

### Task 6: Unit Tests for useTaskPersistence Hook
**Task ID**: T6  
**Phase**: Verification  
**Priority**: P2 (Quality Gate)  
**Dependencies**: T3 (useTaskPersistence hook), T2 (SessionStorageAdapter)  
**Estimated Complexity**: 3/5 (Async hooks testing, debounce timing)

#### Description
Write unit tests for useTaskPersistence hook lifecycle, mutations, debouncing, and error handling. Use React Testing Library or Vitest with act() for hook testing.

#### Deliverables
- **File**: [src/hooks/useTaskPersistence.test.ts](src/hooks/useTaskPersistence.test.ts) (NEW)
- **Test Coverage**:
  - Mount loads tasks synchronously via adapter.load()
  - addTask with valid task → returns 'success' and adds to state
  - addTask without priority → returns 'priority_required' without adding
  - addTask with 8 tasks → returns 'max_limit_exceeded'
  - updateTask changes task fields (including priority removal)
  - deleteTask removes task by id
  - Tasks mutation triggers debounced save (verify 50ms delay)
  - storageError set on save failure
  - storageError cleared on next successful save
  - Cleanup: debounce timer cleared on unmount
  - Multiple rapid mutations batched into single save (debounce test)

#### Acceptance Criteria
- [ ] [src/hooks/useTaskPersistence.test.ts](src/hooks/useTaskPersistence.test.ts) exists
- [ ] Minimum 10 test cases covering all hook behaviors
- [ ] All tests pass with act() for state updates
- [ ] Debounce timing verified (mutations within 50ms window batched)
- [ ] Mock SessionStorageAdapter for isolation
- [ ] storageError lifecycle tested (set on fail, clear on success)
- [ ] Unmount cleanup verified (timer cleared, no memory leaks)
- [ ] Coverage meets 90%+ for hook file

#### Requirement Traceability
- **FR2**: Auto-save behavior verified in tests
- **FR5**: 8-task limit enforced and tested
- **NFR1**: Debounce latency verified (<100ms)
- **NFR2**: Error handling and auto-clear tested

#### Verification Gate
- Hook tests run and pass with 90%+ coverage
- Mock utilities and async testing patterns confirmed working

---

### Task 7: Integration Tests (End-to-End Page Behavior)
**Task ID**: T7  
**Phase**: Verification  
**Priority**: P2 (Quality Gate)  
**Dependencies**: T4 (App.tsx integration)  
**Estimated Complexity**: 3/5 (User interaction simulation)

#### Description
Write integration tests that simulate end-to-end user workflows: add task, refresh, persist across sessions, error scenarios.

#### Deliverables
- **File**: [src/App.test.tsx](src/App.test.tsx) (NEW)
- **Test Scenarios**:
  - Add task with title and priority → appears in list
  - Refresh page → task persists from sessionStorage
  - Add task without priority → form error shown, task not added
  - Add 8 tasks → 9th addition rejected, warning shown
  - Update task status (checkbox) → change reflected, saved
  - Delete task → removed from list, not in sessionStorage on refresh
  - sessionStorage error → error banner shown, task saved in memory
  - Browser tab close simulation → sessionStorage cleared, no restore on reopen

#### Acceptance Criteria
- [ ] [src/App.test.tsx](src/App.test.tsx) exists
- [ ] Minimum 8 integration test cases
- [ ] All tests pass
- [ ] Mocks or real sessionStorage used (verify isolation)
- [ ] User interactions via React Testing Library (getByRole, fireEvent)
- [ ] Persistence verified via sessionStorage inspection
- [ ] Coverage includes all UI paths (add, update, delete, error)

#### Requirement Traceability
- **AC1**: Page refresh persistence verified
- **AC2**: sessionStorage scope behavior (clear on tab close)
- **AC3**: Max limit warning shown
- **AC4**: Priority validation shown
- **NFR2**: Error notifications displayed

#### Verification Gate
- Integration tests run and pass
- No TypeScript or runtime errors

---

### Task 8: Performance Verification and Load Testing
**Task ID**: T8  
**Phase**: Verification  
**Priority**: P2 (Quality Gate)  
**Dependencies**: T4 (App.tsx fully integrated)  
**Estimated Complexity**: 2/5 (Manual and automated performance checks)

#### Description
Verify non-functional requirements: save <100ms, page load <500ms with 8 tasks, no UI lag.

#### Deliverables
- **Verification Steps**:
  1. Measure save latency with 8 tasks (target <100ms)
  2. Measure page load with 8 tasks in sessionStorage (target <500ms)
  3. Verify no UI lag during auto-save
  4. Verify debounce prevents excessive saves
  5. Stress test: add/update/delete 20 tasks rapidly (verify debounce batches)

#### Acceptance Criteria
- [ ] Save latency measured and logged (target <100ms)
- [ ] Page load time measured (target <500ms with 8 tasks)
- [ ] Chrome DevTools performance profile shows no janky frames
- [ ] Debounce verified to batch mutations (single save for 10 rapid adds)
- [ ] Memory usage stable (no leak after add/delete cycles)
- [ ] No console errors or warnings during performance tests

#### Requirement Traceability
- **NFR1**: Performance targets verified

#### Verification Gate
- Benchmark results documented in commit or test report
- No regressions from baseline (if available)

---

### Task 9: Error Handling and Graceful Degradation Testing
**Task ID**: T9  
**Phase**: Verification  
**Priority**: P1 (Requirements Critical)  
**Dependencies**: T4 (App.tsx, full feature)  
**Estimated Complexity**: 2/5 (Targeted error scenarios)

#### Description
Verify error handling: simulate storage full, unavailable, corrupted data. Verify app continues functioning in memory and errors are logged.

#### Deliverables
- **Test Scenarios**:
  1. sessionStorage quota exceeded → error logged, task saved in memory
  2. sessionStorage unavailable (DOMException) → error logged, graceful degradation
  3. Corrupted JSON in sessionStorage → load returns empty, logged
  4. Save failure → storageError set, user notified
  5. Multiple save failures → error persists until successful save

#### Acceptance Criteria
- [ ] All error scenarios tested with mocked sessionStorage
- [ ] Console errors logged with descriptive messages
- [ ] App continues functioning with in-memory data
- [ ] User error banner displayed when storageError is set
- [ ] storageError cleared on next successful save
- [ ] No unhandled promise rejections

#### Requirement Traceability
- **NFR2**: Graceful degradation and error handling verified

#### Verification Gate
- Error handling tests pass
- Manual testing with simulated storage errors confirms user notifications

---

### Task 10: Documentation and Setup Instructions
**Task ID**: T10  
**Phase**: Deployment  
**Priority**: P3 (Delivery Readiness)  
**Dependencies**: T9 (All tests passing)  
**Estimated Complexity**: 1/5 (Documentation only)

#### Description
Create or update documentation with setup instructions, architecture overview, testing procedures, and troubleshooting guide.

#### Deliverables
- **File Updates**:
  - [README.md](README.md) (UPDATED): Add persistence feature description
  - [DEVELOPMENT.md](DEVELOPMENT.md) (NEW): Local setup, testing, debugging
  - [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) (NEW): Detailed architecture reference
- **Content**:
  - Feature overview and user flow
  - Setup: npm install, npm run dev
  - Testing: npm run test (all tests)
  - Debugging: sessionStorage inspection via DevTools
  - Known limitations: sessionStorage scope, 8-task limit
  - Future improvements: localStorage migration, multi-tab sync

#### Acceptance Criteria
- [ ] README updated with feature description
- [ ] DEVELOPMENT.md created with setup and test instructions
- [ ] docs/ARCHITECTURE.md created with component diagrams
- [ ] All links in documentation are correct
- [ ] No markdown formatting errors

#### Requirement Traceability
- **General**: Feature documented for team and future maintainers

#### Verification Gate
- Documentation renders correctly in markdown viewer
- All code examples are valid and tested

---

## Blocked Work and Unblocking Plan

### No Critical Blockers
All tasks have clear dependencies and are ready to proceed in the order listed. The design review CONDITIONAL APPROVAL has been resolved:

| Finding | Resolution | Status |
|---------|-----------|--------|
| CRITICAL: Async load race condition | Use synchronous load (T2, T3) | ✅ Resolved |
| HIGH: Priority validation ownership | Split: hook creates, adapter loads | ✅ Resolved in T2, T3 |

---

## Requirement and Acceptance Criteria Coverage

### Functional Requirements Traceability

| Requirement | Coverage | Task(s) | Status |
|-------------|----------|--------|--------|
| **FR1**: sessionStorage persistence, max 8 tasks, priority required | Complete | T1, T2, T3, T4 | ✅ |
| **FR2**: Auto-save on create/update/delete | Complete | T3, T4 | ✅ |
| **FR3**: Restore on page load | Complete | T3, T4 | ✅ |
| **FR4**: Persist title, priority, status, ordering | Complete | T1, T4 | ✅ |
| **FR5**: Max 8 tasks limit | Complete | T2, T3 | ✅ |

### Acceptance Criteria Traceability

| Criterion | Coverage | Task(s) | Verification |
|-----------|----------|---------|--------------|
| **AC1**: Page refresh persistence | Complete | T3, T4, T7 | Integration test + manual |
| **AC2**: Browser tab close (sessionStorage scope) | Complete | T2, T7 | Manual + doc note |
| **AC3**: Max task limit | Complete | T3, T4, T7 | Unit test + integration test |
| **AC4**: Priority required | Complete | T3, T4, T7 | Unit test + integration test |

### Non-Functional Requirements Traceability

| Requirement | Coverage | Task(s) | Verification |
|-------------|----------|---------|--------------|
| **NFR1**: Save <100ms, load <500ms, no lag | Complete | T8 | Performance test |
| **NFR2**: Error handling, graceful degradation | Complete | T2, T9 | Error handling test |
| **NFR3**: JSON format, storage key 'taskBoardData' | Complete | T1, T2 | Type definition + adapter |

---

## Definition of Done

A task is considered **DONE** when:

1. **Code Complete**
   - All files created/modified per deliverables
   - No TypeScript errors (strict mode)
   - No ESLint warnings (if configured)
   - Code follows team style guide

2. **Testing Complete**
   - All acceptance criteria verified
   - Unit tests passing (if applicable)
   - Integration tests passing (if applicable)
   - Coverage meets 90%+ for new files

3. **Documentation Complete**
   - Code comments on complex logic
   - JSDoc for public exports
   - Task acceptance criteria marked complete

4. **Performance Verified**
   - No regressions from baseline
   - Non-functional targets met (if applicable)

5. **Code Review Ready**
   - Changes follow PR template
   - Commit messages are descriptive
   - No merge conflicts

---

## Residual Risks and Mitigation

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| sessionStorage quota exceeded in real usage | Low | Medium | Error handling logs quota exceeded; graceful degradation to memory. User notified. |
| Task loses priority if UI doesn't pass it in updateTask | Medium | High | UI layer must include priority in all updateTask() calls. Document this invariant. |
| Debounce timer orphaned if React unmounts during save | Low | Low | Cleanup function in useEffect clears timer on unmount. Tested in T6. |
| Corrupted data in sessionStorage blocks app load | Low | Low | Load catches parse errors, returns empty array. App continues. No blocking behavior. |
| Race condition if load called before App renders | Low | N/A | Resolved: load is synchronous and runs during useEffect before render. No race condition. |

---

## Implementation Order and Dependency Graph

```
T1: Task Type Definition
  ↓
T2: SessionStorageAdapter ←─ (depends on T1)
  ↓
T3: useTaskPersistence Hook ←─ (depends on T1, T2)
  ↓
T4: Update App.tsx ←─ (depends on T3)
  ├─→ T5: SessionStorageAdapter Tests (parallel with T4)
  ├─→ T6: Hook Tests (parallel with T4)
  └─→ T7: Integration Tests ←─ (depends on T4)
        ├─→ T8: Performance Testing ←─ (depends on T4)
        └─→ T9: Error Handling Testing ←─ (depends on T4)
            ↓
T10: Documentation ←─ (final, depends on T9)
```

**Recommended Sequence**:
1. **Phase 1** (Foundation): T1 → T2 (serial, fast)
2. **Phase 2** (Integration): T3 → T4 (serial, medium)
3. **Phase 3** (Quality): T5, T6, T7, T8, T9 (parallel, 1-2 days)
4. **Phase 4** (Delivery): T10 (final, <1 day)

**Estimated Total Duration**: 3-4 days with full-time engineering team (one developer can complete sequentially in 4-5 days)

---

## Files to Create and Modify

### New Files (to be created)
1. `src/types/Task.ts` - Task type and StoragePayload interface
2. `src/services/SessionStorageAdapter.ts` - Storage abstraction layer
3. `src/hooks/useTaskPersistence.ts` - State management and auto-save hook
4. `src/services/SessionStorageAdapter.test.ts` - Unit tests for adapter
5. `src/hooks/useTaskPersistence.test.ts` - Unit tests for hook
6. `src/App.test.tsx` - Integration tests for App component
7. `DEVELOPMENT.md` - Development and testing guide
8. `docs/ARCHITECTURE.md` - Detailed architecture reference

### Existing Files (to be modified)
1. `src/App.tsx` - Integrate hook, add UI updates, priority field validation
2. `src/App.css` - Add styles for error banner, info banner, priority badges
3. `README.md` - Add feature description and links to documentation
4. `package.json` - Verify test script (no changes needed if already configured)

### Configuration Files (may need review)
- `tsconfig.json` - Ensure strict mode is enabled
- `vite.config.ts` - Verify test runner is configured (if using Vitest)
- `.eslintrc` or `.eslintignore` - Add test files if needed

---

## Success Metrics and Acceptance Gates

| Phase | Gate | Criteria | Owner |
|-------|------|----------|-------|
| Foundation (T1-T2) | Type Safety | TypeScript compiles, no errors | Dev + Linter |
| Integration (T3-T4) | Functional | Feature works end-to-end, manual test passes | Dev + QA |
| Quality (T5-T9) | Test Coverage | 90%+ coverage, all tests pass, perf targets met | QA + Dev |
| Delivery (T10) | Documentation | Setup guide complete, architecture documented | Tech Lead |

---

## Assumptions and Constraints

### Assumptions
- React 18+ is available and compatible
- Vite is correctly configured for development and testing
- sessionStorage is available in the browser (no special privacy mode restrictions)
- TypeScript strict mode is enabled in tsconfig.json
- Testing framework (Vitest or Jest) will be used with React Testing Library

### Constraints
- sessionStorage is tab/window-scoped (scope defined by AC2)
- Maximum 8 tasks is a hard limit (non-negotiable per requirements)
- Priority field is required for all persisted tasks (invariant enforced)
- No server-side persistence (sessionStorage only, per requirements)
- No multi-tab synchronization (out of scope per requirements)

---

## Next Steps for Implementation Team

1. **Review this plan** with team and design lead (30 min)
2. **Assign tasks** based on team capacity (T1-T2 to senior, T3-T4 in parallel or serial)
3. **Set up test environment** if not already configured (Vitest + React Testing Library)
4. **Begin implementation** with Task 1 (Task type definition)
5. **Conduct daily standup** using this plan as source of truth
6. **Update blocked work section** if any dependencies emerge
7. **Verify acceptance criteria** before marking task complete
8. **Create PR** with reference to this impl-plan.md for traceability

---

**Plan Status**: ✅ Ready for Implementation  
**Last Updated**: 2026-09-07  
**Next Review**: After Phase 1 completion (T1-T2)
