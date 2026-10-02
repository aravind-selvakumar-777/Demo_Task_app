import { expect, Page, test } from '@playwright/test';

/**
 * E2E tests for the Task Board application (KAN-42).
 *
 * Test scenarios mapped from docs/test_cases.md:
 *   TC-01  Page loads and renders default starter tasks
 *   TC-02  Task statistics show correct initial counts
 *   TC-03  Add a new task (default Medium priority)
 *   TC-04  Add a task with High priority
 *   TC-05  Add a task with Low priority
 *   TC-06  Empty / whitespace task title is rejected
 *   TC-07  New task input is cleared after submission
 *   TC-08  Mark an open task as Done
 *   TC-09  Reopen a Done task
 *   TC-10  Statistics update after toggling status
 *   TC-11  Delete a task
 *   TC-12  Statistics update after deletion
 *   TC-13  Empty-state message when all tasks deleted
 *   TC-14  Filter "open" shows only open tasks
 *   TC-15  Filter "done" shows only done tasks
 *   TC-16  Filter "all" shows all tasks
 *   TC-17  Empty-state message when filter matches nothing
 *   TC-18  localStorage persists tasks across page reload
 *   TC-19  Reset board restores default starter tasks
 *   TC-20  Reset board clears custom tasks from localStorage
 *   TC-21  Accessibility – aria-live region present
 *   TC-22  Accessibility – stats grid has aria-label
 *
 * KAN-42 review fix: stat assertions use data-testid locators instead of
 * fragile CSS-order selectors (.stats-grid > div > span).
 */

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
const BASE_URL = 'http://localhost:5173';

/**
 * Clear localStorage before every test so each test is isolated.
 * KAN-42 review: uses page.context().addInitScript() approach where possible;
 * for the reload-based helper a page.evaluate + reload is acceptable since
 * tests must first navigate to seed state before they can clear it.
 */
async function resetStorage(page: Page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload({ waitUntil: 'domcontentloaded' });
}

/** Fill in the task-name input and optionally change priority, then click "Add task". */
async function addTask(page: Page, title: string, priority?: string) {
  await page.getByPlaceholder('Add a task').fill(title);
  if (priority) {
    await page.getByRole('combobox').selectOption(priority);
  }
  await page.getByRole('button', { name: /add task/i }).click();
}

/** Click the Reset button using its specific aria-label to avoid ambiguity. */
async function clickReset(page: Page) {
  await page.getByRole('button', { name: 'Reset board to default starter tasks' }).click();
}

// ---------------------------------------------------------------------------
// TC-01 / TC-02 — Page load & initial state
// ---------------------------------------------------------------------------
test.describe('TC-01 / TC-02 — Initial page state', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await resetStorage(page);
  });

  test('TC-01: renders page heading and all three starter tasks', async ({ page }) => {
    await expect(page.getByRole('heading', { name: /task board/i })).toBeVisible();
    await expect(page.getByText('Review the landing copy')).toBeVisible();
    await expect(page.getByText('Prepare demo data')).toBeVisible();
    await expect(page.getByText('Send summary to the team')).toBeVisible();
  });

  test('TC-02: statistics grid shows 3 total, 2 open, 1 done', async ({ page }) => {
    // KAN-42 review fix: use data-testid instead of CSS-order selector
    await expect(page.getByTestId('stat-total')).toHaveText('3');
    await expect(page.getByTestId('stat-open')).toHaveText('2');
    await expect(page.getByTestId('stat-done')).toHaveText('1');
  });
});

// ---------------------------------------------------------------------------
// TC-03 to TC-07 — Task creation
// ---------------------------------------------------------------------------
test.describe('TC-03 to TC-07 — Task creation', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await resetStorage(page);
  });

  test('TC-03: adds a new task with default Medium priority', async ({ page }) => {
    await addTask(page, 'E2E Test Task Medium');
    await expect(page.getByText('E2E Test Task Medium')).toBeVisible();
    // Check that the specific task card has "Medium priority" in its paragraph
    const taskCard = page.locator('article.task-card').filter({ hasText: 'E2E Test Task Medium' });
    await expect(taskCard.locator('p').filter({ hasText: 'Medium priority' })).toBeVisible();
  });

  test('TC-04: adds a task with High priority', async ({ page }) => {
    await addTask(page, 'E2E HighPrioTask', 'High');
    await expect(page.getByText('E2E HighPrioTask')).toBeVisible();
    // Use locator('p') inside the card to target only the priority paragraph
    const taskCard = page.locator('article.task-card').filter({ hasText: 'E2E HighPrioTask' });
    await expect(taskCard.locator('p').filter({ hasText: 'High priority' })).toBeVisible();
  });

  test('TC-05: adds a task with Low priority', async ({ page }) => {
    await addTask(page, 'E2E LowPrioTask', 'Low');
    await expect(page.getByText('E2E LowPrioTask')).toBeVisible();
    const taskCard = page.locator('article.task-card').filter({ hasText: 'E2E LowPrioTask' });
    await expect(taskCard.locator('p').filter({ hasText: 'Low priority' })).toBeVisible();
  });

  test('TC-06: does not add a task when title is empty or whitespace', async ({ page }) => {
    // Count initial task cards
    const initial = await page.locator('article.task-card').count();

    // Try empty submit
    await page.getByRole('button', { name: /add task/i }).click();
    await expect(page.locator('article.task-card')).toHaveCount(initial);

    // Try whitespace submit
    await page.getByPlaceholder('Add a task').fill('   ');
    await page.getByRole('button', { name: /add task/i }).click();
    await expect(page.locator('article.task-card')).toHaveCount(initial);
  });

  test('TC-07: input field is cleared after task is added', async ({ page }) => {
    await page.getByPlaceholder('Add a task').fill('Clear Me After Add');
    await page.getByRole('button', { name: /add task/i }).click();
    await expect(page.getByPlaceholder('Add a task')).toHaveValue('');
  });
});

// ---------------------------------------------------------------------------
// TC-08 to TC-10 — Status toggle
// ---------------------------------------------------------------------------
test.describe('TC-08 to TC-10 — Status toggle', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await resetStorage(page);
  });

  test('TC-08: marks an open task as Done', async ({ page }) => {
    // "Review the landing copy" is open; its button says "Complete Review the landing copy"
    const completeBtn = page.getByRole('button', { name: /complete review the landing copy/i });
    await expect(completeBtn).toBeVisible();
    await completeBtn.click();
    // Button now says Reopen
    await expect(
      page.getByRole('button', { name: /reopen review the landing copy/i }),
    ).toBeVisible();
  });

  test('TC-09: reopens a Done task', async ({ page }) => {
    // "Send summary to the team" is initially Done
    const reopenBtn = page.getByRole('button', { name: /reopen send summary to the team/i });
    await expect(reopenBtn).toBeVisible();
    await reopenBtn.click();
    await expect(
      page.getByRole('button', { name: /complete send summary to the team/i }),
    ).toBeVisible();
  });

  test('TC-10: statistics update after toggling task to Done', async ({ page }) => {
    // Toggle "Review the landing copy" to done → done=2, open=1
    await page
      .getByRole('button', { name: /complete review the landing copy/i })
      .click();
    // KAN-42 review fix: use data-testid instead of CSS-order selector
    await expect(page.getByTestId('stat-open')).toHaveText('1');
    await expect(page.getByTestId('stat-done')).toHaveText('2');
  });
});

// ---------------------------------------------------------------------------
// TC-11 to TC-13 — Task deletion
// ---------------------------------------------------------------------------
test.describe('TC-11 to TC-13 — Task deletion', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await resetStorage(page);
  });

  test('TC-11: deletes a task from the list', async ({ page }) => {
    const deleteButtons = page.getByRole('button', { name: /delete/i });
    const initialCount = await deleteButtons.count();
    await deleteButtons.first().click();
    await expect(page.locator('article.task-card')).toHaveCount(initialCount - 1);
  });

  test('TC-12: statistics update after deletion', async ({ page }) => {
    await page.getByRole('button', { name: /delete/i }).first().click();
    // KAN-42 review fix: use data-testid instead of CSS-order selector
    await expect(page.getByTestId('stat-total')).toHaveText('2');
  });

  test('TC-13: shows empty-state message when all tasks are deleted', async ({ page }) => {
    // Delete all tasks one by one
    while ((await page.getByRole('button', { name: /delete/i }).count()) > 0) {
      await page.getByRole('button', { name: /delete/i }).first().click();
    }
    await expect(page.getByText(/no tasks match this filter/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// TC-14 to TC-17 — Filtering
// ---------------------------------------------------------------------------
test.describe('TC-14 to TC-17 — Filtering', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await resetStorage(page);
  });

  test('TC-14: "open" filter shows only open tasks', async ({ page }) => {
    await page.getByRole('button', { name: /^open$/i }).click();
    await expect(page.getByText('Review the landing copy')).toBeVisible();
    await expect(page.getByText('Prepare demo data')).toBeVisible();
    await expect(page.getByText('Send summary to the team')).not.toBeVisible();
  });

  test('TC-15: "done" filter shows only done tasks', async ({ page }) => {
    await page.getByRole('button', { name: /^done$/i }).click();
    await expect(page.getByText('Send summary to the team')).toBeVisible();
    await expect(page.getByText('Review the landing copy')).not.toBeVisible();
    await expect(page.getByText('Prepare demo data')).not.toBeVisible();
  });

  test('TC-16: "all" filter shows all tasks', async ({ page }) => {
    // Switch to done then back to all
    await page.getByRole('button', { name: /^done$/i }).click();
    await page.getByRole('button', { name: /^all$/i }).click();
    await expect(page.getByText('Review the landing copy')).toBeVisible();
    await expect(page.getByText('Send summary to the team')).toBeVisible();
    await expect(page.getByText('Prepare demo data')).toBeVisible();
  });

  test('TC-17: shows empty-state when filter matches nothing', async ({ page }) => {
    // Switch to open filter and delete all open tasks
    await page.getByRole('button', { name: /^open$/i }).click();
    while ((await page.getByRole('button', { name: /delete/i }).count()) > 0) {
      await page.getByRole('button', { name: /delete/i }).first().click();
    }
    await expect(page.getByText(/no tasks match this filter/i)).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// TC-18 — localStorage persistence across page reload
// ---------------------------------------------------------------------------
test.describe('TC-18 — localStorage persistence', () => {
  test('TC-18: tasks survive a full page reload', async ({ page }) => {
    await page.goto(BASE_URL);
    await resetStorage(page);

    // Add a unique task
    await addTask(page, 'UniquePersistedTask2024');
    await expect(page.getByText('UniquePersistedTask2024')).toBeVisible();

    // Reload the page (localStorage should still contain the task)
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('UniquePersistedTask2024')).toBeVisible();
  });

  test('TC-18b: corrupted localStorage falls back to starter tasks', async ({ page }) => {
    await page.goto(BASE_URL);
    // Inject corrupted data
    await page.evaluate(() => {
      localStorage.setItem('demo_task_board_tasks', 'CORRUPT{{');
    });
    await page.reload({ waitUntil: 'domcontentloaded' });
    await expect(page.getByText('Review the landing copy')).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// TC-19 / TC-20 — Reset board
// ---------------------------------------------------------------------------
test.describe('TC-19 / TC-20 — Reset board', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await resetStorage(page);
  });

  test('TC-19: Reset restores all three default starter tasks', async ({ page }) => {
    // First add a custom task
    await addTask(page, 'CustomTaskToWipe');
    await expect(page.getByText('CustomTaskToWipe')).toBeVisible();

    // Reset using precise aria-label to avoid ambiguity
    await clickReset(page);

    // Custom task gone, defaults present
    await expect(page.getByText('CustomTaskToWipe')).not.toBeVisible();
    await expect(page.getByText('Review the landing copy')).toBeVisible();
    await expect(page.getByText('Prepare demo data')).toBeVisible();
    await expect(page.getByText('Send summary to the team')).toBeVisible();
  });

  test('TC-20: after Reset, reloading the page still shows starter tasks', async ({ page }) => {
    await addTask(page, 'WillDisappearAfterReset');
    // Use the precise aria-label to avoid strict-mode match against task title containing "Reset"
    await clickReset(page);

    // Reload — if localStorage was cleared, we should get starter tasks again
    await page.reload({ waitUntil: 'domcontentloaded' });

    await expect(page.getByText('Review the landing copy')).toBeVisible();
    await expect(page.getByText('WillDisappearAfterReset')).not.toBeVisible();
  });

  test('TC-20b: statistics are reset to 3/2/1 after reset', async ({ page }) => {
    await addTask(page, 'Extra 1');
    await addTask(page, 'Extra 2');
    // Now stats = 5 total, 4 open, 1 done
    await clickReset(page);
    // KAN-42 review fix: use data-testid instead of CSS-order selector
    await expect(page.getByTestId('stat-total')).toHaveText('3');
    await expect(page.getByTestId('stat-open')).toHaveText('2');
    await expect(page.getByTestId('stat-done')).toHaveText('1');
  });
});

// ---------------------------------------------------------------------------
// TC-21 / TC-22 — Accessibility
// ---------------------------------------------------------------------------
test.describe('TC-21 / TC-22 — Accessibility attributes', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL);
    await resetStorage(page);
  });

  test('TC-21: task list has aria-live="polite"', async ({ page }) => {
    const taskList = page.locator('[aria-live="polite"]');
    await expect(taskList).toBeVisible();
  });

  test('TC-22: stats grid has aria-label="Task statistics"', async ({ page }) => {
    const statsGrid = page.locator('[aria-label="Task statistics"]');
    await expect(statsGrid).toBeVisible();
  });

  test('TC-22b: filter toolbar has aria-label="Task filters"', async ({ page }) => {
    const toolbar = page.locator('[aria-label="Task filters"]');
    await expect(toolbar).toBeVisible();
  });

  test('TC-22c: Reset button has an aria-label', async ({ page }) => {
    const resetBtn = page.getByRole('button', { name: 'Reset board to default starter tasks' });
    await expect(resetBtn).toBeVisible();
  });
});
