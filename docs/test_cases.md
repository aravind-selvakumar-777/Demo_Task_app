# Test Cases — Task Board (KAN-42)

> **Scope**: localStorage persistence, task CRUD, filtering, reset functionality, and accessibility.
> **Automated by**: `e2e/task-board.spec.ts` (Playwright + TypeScript) and `src/App.test.tsx` (Vitest + React Testing Library)

---

## TC-01 — Page load renders default starter tasks

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Open the app in a browser with an empty localStorage.

**Expected**
- Page heading "Task Board" is visible.
- Three starter tasks are shown: "Review the landing copy", "Prepare demo data", "Send summary to the team".

---

## TC-02 — Initial task statistics

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Open the app with empty localStorage.

**Expected**
- Stats grid shows **3** Total, **2** Open, **1** Done.

---

## TC-03 — Add a new task (default Medium priority)

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Type a task title in the input.
2. Leave priority as "Medium" (default).
3. Click "Add task".

**Expected**
- New task appears at the top of the list.
- Task shows "Medium priority".
- Input field is cleared.

---

## TC-04 — Add a task with High priority

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| Medium |

**Steps**
1. Type a task title.
2. Select "High" from the priority dropdown.
3. Click "Add task".

**Expected**
- New task card shows "High priority".

---

## TC-05 — Add a task with Low priority

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| Medium |

**Steps**
1. Type a task title.
2. Select "Low" from the priority dropdown.
3. Click "Add task".

**Expected**
- New task card shows "Low priority".

---

## TC-06 — Empty or whitespace title is rejected

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Leave the input empty and click "Add task".
2. Enter spaces only and click "Add task".

**Expected**
- No new task is created.
- Task count remains unchanged.

---

## TC-07 — Input cleared after task submission

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| Medium |

**Steps**
1. Type a title and click "Add task".

**Expected**
- The task-name input is empty after the task is added.

---

## TC-08 — Mark an open task as Done

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Find an open task (e.g., "Review the landing copy").
2. Click its "Open" toggle button.

**Expected**
- Button label changes to "Done".
- Task card is visually marked as done.

---

## TC-09 — Reopen a Done task

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Find a done task (e.g., "Send summary to the team").
2. Click its "Done" toggle button.

**Expected**
- Button label changes to "Open".
- Task is restored to open status.

---

## TC-10 — Statistics update after toggling status

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Toggle an open task to Done.

**Expected**
- Open count decreases by 1.
- Done count increases by 1.
- Total count is unchanged.

---

## TC-11 — Delete a task

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Click the "Delete" button on any task card.

**Expected**
- The task is removed from the list immediately.

---

## TC-12 — Statistics update after deletion

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| Medium |

**Steps**
1. Delete a task.

**Expected**
- Total count decreases by 1.

---

## TC-13 — Empty-state message when all tasks are deleted

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| Medium |

**Steps**
1. Delete every task in the list.

**Expected**
- "No tasks match this filter." message is displayed.

---

## TC-14 — Filter "open" shows only open tasks

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Click the "open" filter button.

**Expected**
- Only tasks with status "open" are shown.
- Done tasks are hidden.

---

## TC-15 — Filter "done" shows only done tasks

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Click the "done" filter button.

**Expected**
- Only tasks with status "done" are shown.
- Open tasks are hidden.

---

## TC-16 — Filter "all" shows all tasks

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| Medium |

**Steps**
1. Switch to "done" filter.
2. Click the "all" filter button.

**Expected**
- All tasks are visible again.

---

## TC-17 — Empty-state when filter matches nothing

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| Low |

**Steps**
1. Switch to "open" filter.
2. Delete all visible open tasks.

**Expected**
- "No tasks match this filter." is displayed.

---

## TC-18 — localStorage persistence across page reload

| Field       | Value |
|-------------|-------|
| **Type**    | E2E |
| **Priority**| Critical |

**Steps**
1. Add a new task.
2. Reload the page.

**Expected**
- The added task is still present after reload.

### TC-18b — Corrupted localStorage fallback

**Steps**
1. Inject `CORRUPT{{` into `demo_task_board_tasks` localStorage key.
2. Reload the page.

**Expected**
- App falls back to showing the default starter tasks.

---

## TC-19 — Reset board restores default starter tasks

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Add one or more custom tasks.
2. Click the "Reset" button.

**Expected**
- Custom tasks are removed.
- All three default starter tasks appear.

---

## TC-20 — Reset clears custom tasks from localStorage on reload

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| High |

**Steps**
1. Add a custom task.
2. Click "Reset".
3. Reload the page.

**Expected**
- After reload, the custom task does not reappear.
- Default starter tasks are shown.

---

## TC-21 — Accessibility: aria-live region

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| Medium |

**Steps**
1. Inspect the task list container.

**Expected**
- The task list has `aria-live="polite"`.

---

## TC-22 — Accessibility: labeled regions

| Field       | Value |
|-------------|-------|
| **Type**    | E2E + Unit |
| **Priority**| Medium |

**Expected**
- Stats grid has `aria-label="Task statistics"`.
- Filter toolbar has `aria-label="Task filters"`.
- Reset button has `aria-label="Reset board to default starter tasks"`.
- Task-name input is labeled "Task name".
- Priority dropdown is labeled "Priority".
