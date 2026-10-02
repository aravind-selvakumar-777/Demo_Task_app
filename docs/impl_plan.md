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

 - [X ] Given the task board is open with tasks created, when the user refreshes the page, then all tasks and their current state (title, priority, status) are restored exactly as they were before refresh.

 - [X ] Given the user creates a new task and assigns it a priority, when the page is refreshed, then the new task is visible with the correct priority and Open status.

  - [X ] Given the user marks a task as Done and deletes another task, when the page is refreshed, then the Done task remains marked as Done and the deleted task is not restored.

  - [X ] Given the browser's local storage is cleared, when the user opens the task board, then the application loads with default starter tasks.

  - [X ] Given the user is using the task board on mobile, when tasks are created and the browser is refreshed, then tasks persist correctly on mobile devices as well.

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

1. Task structure includes:** `id` (string/UUID), **title** (string), **status** (Open | In Progress | Done), **priority** (Low | Medium | High), optional timestamps

2. Task state is managed via central React state hook (`useState`) or context provider

3. Default tasks are pre-defined and available to load when storage is empty or corrupt

4. No external libraries are required; native browser Local Storage API is sufficient

5. Storage key is configurable (e.g., `taskBoardTasks`)

---

## Proposed Design

### Arcitecture Overview

**Component Hierarchy**:

- `App.tsx` (Root)
   // Mount effect to comp local storage activates here
   - `DemoTaskBoard.tsx` (Component)
      - Task state heore
      - Fetch from local storage or defaults
      - Pass update functions to children components
      - Save to storage on any change

### Persistence Engine (New Service)

Create a new utility module: `src/services/persistance.ts`

```typescript
// Constants
const STORAGE_KEY = 'taskBoardTasks';

// Types
interface Task {
  id: string;
  title: string;
  status: 'Open' | 'In Progress' | 'Done';
  priority: 'Low' | 'Medium' | 'High';
  createdAt?: number;
  updatedAt?: number;
}

// Save tasks to local storage
export function saveTasksToLocalStorage(tasks: Task[]]): void {
  try {
    const jsonString = JSON.stringify(tasks);
    localStorage.setItem(STORAGE_KEY, jsonString);
    console.log(`[Persistance] Tasks saved: ${tasks.length} items in ${jsonString.length} bytes`);
  } catch (error) {
    console.error('[Persistance] Failed to save tasks:', error);
    // Handle quota exceeded or other native storage errors
  }
}

// Load tasks from local storage
export function loadTasksFromLocalStorage(): Task[] | null {
  try {
    const storedTasks = localStorage.getItem(STORAGE_KEY);
    if (!storedTasks) return null; // No saved tasks

    const parsedTasks = JSON.parse(storedTasks) as Task[];
    console.log(`[Persistance] Loaded ${parsedTasks.length} tasks from storage`);
    return parsedTasks;
  } catch (error) {
    console.warn('[Persistance] Failed to parse stored tasks:', error);
    return null; // Fallback to defaults
  }
}

/