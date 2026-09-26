import { test, expect } from '@playwright/test';

test.describe('Local Storage Persistence - KAN-39', () => {
  // Clear localStorage before each test
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate(() => localStorage.clear());
  });

  test('AC1: Tasks persist after page refresh', async ({ page }) => {
    await page.goto('/');

    // Create a new task
    await page.fill('input[placeholder="Add a task"]', 'Test Task for Persistence');
    await page.selectOption('select', 'High');
    await page.click('button[type="submit"]');

    // Verify task is visible
    await expect(page.locator('text=Test Task for Persistence')).toBeVisible();
    
    // Verify stats
    await expect(page.locator('.stats-grid div:nth-child(1) span')).toContainText('4'); // Total
    await expect(page.locator('.stats-grid div:nth-child(2) span')).toContainText('4'); // Open

    // Refresh the page
    await page.reload();

    // Verify task is still present
    await expect(page.locator('text=Test Task for Persistence')).toBeVisible();
    await expect(page.locator('text=High priority')).toBeVisible();
    
    // Verify stats are correct after reload
    await expect(page.locator('.stats-grid div:nth-child(1) span')).toContainText('4'); // Total
    await expect(page.locator('.stats-grid div:nth-child(2) span')).toContainText('4'); // Open
    await expect(page.locator('.stats-grid div:nth-child(3) span')).toContainText('0'); // Done
  });

  test('AC2: Tasks persist after tab close and reopen (simulated)', async ({ page, context }) => {
    await page.goto('/');

    // Create a task
    await page.fill('input[placeholder="Add a task"]', 'Tab Close Test Task');
    await page.selectOption('select', 'Medium');
    await page.click('button[type="submit"]');

    // Verify task is visible
    await expect(page.locator('text=Tab Close Test Task')).toBeVisible();

    // Close the page (simulating tab close)
    await page.close();

    // Open a new page (simulating tab reopen)
    const newPage = await context.newPage();
    await newPage.goto('/');

    // Verify task is still present
    await expect(newPage.locator('text=Tab Close Test Task')).toBeVisible();
    await expect(newPage.locator('text=Medium priority')).toBeVisible();

    await newPage.close();
  });

  test('AC3: Status change is persisted', async ({ page }) => {
    await page.goto('/');

    // Create a new task
    await page.fill('input[placeholder="Add a task"]', 'Task to Complete');
    await page.click('button[type="submit"]');

    // Mark task as done
    const taskCard = page.locator('article.task-card').filter({ hasText: 'Task to Complete' });
    await taskCard.locator('button.status-toggle').click();

    // Verify task status changed
    await expect(taskCard).toHaveClass(/done/);
    await expect(taskCard.locator('button.status-toggle')).toContainText('Done');

    // Refresh the page
    await page.reload();

    // Verify task is still marked as done
    const reloadedTaskCard = page.locator('article.task-card').filter({ hasText: 'Task to Complete' });
    await expect(reloadedTaskCard).toHaveClass(/done/);
    await expect(reloadedTaskCard.locator('button.status-toggle')).toContainText('Done');
    
    // Verify stats reflect the done task
    await expect(page.locator('.stats-grid div:nth-child(3) span')).toContainText('1'); // Done
  });

  test('AC4: Task deletion is persisted', async ({ page }) => {
    await page.goto('/');

    // Create a new task
    await page.fill('input[placeholder="Add a task"]', 'Task to Delete');
    await page.click('button[type="submit"]');

    // Verify task is visible
    await expect(page.locator('text=Task to Delete')).toBeVisible();

    // Delete the task
    const taskCard = page.locator('article.task-card').filter({ hasText: 'Task to Delete' });
    await taskCard.locator('button.delete-button').click();

    // Verify task is no longer visible
    await expect(page.locator('text=Task to Delete')).not.toBeVisible();

    // Refresh the page
    await page.reload();

    // Verify task is still not visible
    await expect(page.locator('text=Task to Delete')).not.toBeVisible();
  });

  test('AC5: Empty board is persisted', async ({ page }) => {
    await page.goto('/');

    // Delete all starter tasks
    const deleteButtons = page.locator('button.delete-button');
    const count = await deleteButtons.count();
    
    for (let i = 0; i < count; i++) {
      // Always click the first delete button (as deleting removes elements)
      await page.locator('button.delete-button').first().click();
    }

    // Verify empty state or no tasks visible
    const taskCards = page.locator('article.task-card');
    await expect(taskCards).toHaveCount(0);
    
    // Verify stats show zero
    await expect(page.locator('.stats-grid div:nth-child(1) span')).toContainText('0'); // Total

    // Refresh the page
    await page.reload();

    // Verify board is still empty (no starter tasks re-injected)
    await expect(page.locator('article.task-card')).toHaveCount(0);
    await expect(page.locator('.stats-grid div:nth-child(1) span')).toContainText('0'); // Total
  });

  test('AC6: Corrupted localStorage data is handled gracefully', async ({ page }) => {
    await page.goto('/');

    // Inject malformed JSON into localStorage
    await page.evaluate(() => {
      localStorage.setItem('demo_task_board_tasks', 'invalid-json-{{{');
    });

    // Reload the page
    await page.reload();

    // Should fall back to default starter tasks without crashing
    // The default has 3 starter tasks
    const taskCards = page.locator('article.task-card');
    await expect(taskCards).toHaveCount(3);
    
    // Verify stats show default values
    await expect(page.locator('.stats-grid div:nth-child(1) span')).toContainText('3'); // Total
    
    // Verify no JavaScript errors (page should be functional)
    await page.fill('input[placeholder="Add a task"]', 'Test after corruption');
    await page.click('button[type="submit"]');
    await expect(page.locator('text=Test after corruption')).toBeVisible();
  });

  test('Additional: Multiple tasks persist correctly', async ({ page }) => {
    await page.goto('/');

    // Create multiple tasks with different priorities and statuses
    const tasks = [
      { title: 'High Priority Task', priority: 'High', complete: false },
      { title: 'Medium Priority Task', priority: 'Medium', complete: true },
      { title: 'Low Priority Task', priority: 'Low', complete: false },
    ];

    for (const task of tasks) {
      await page.fill('input[placeholder="Add a task"]', task.title);
      await page.selectOption('select', task.priority);
      await page.click('button[type="submit"]');
      
      if (task.complete) {
        const taskCard = page.locator('article.task-card').filter({ hasText: task.title });
        await taskCard.locator('button.status-toggle').click();
      }
    }

    // Verify all tasks are present
    for (const task of tasks) {
      await expect(page.locator(`text=${task.title}`)).toBeVisible();
    }

    // Refresh the page
    await page.reload();

    // Verify all tasks are still present with correct status
    for (const task of tasks) {
      await expect(page.locator(`text=${task.title}`)).toBeVisible();
      const taskCard = page.locator('article.task-card').filter({ hasText: task.title });
      
      if (task.complete) {
        await expect(taskCard).toHaveClass(/done/);
      } else {
        await expect(taskCard).toHaveClass(/open/);
      }
    }
  });

  test('Additional: Filter state does not persist (expected behavior)', async ({ page }) => {
    await page.goto('/');

    // Set filter to 'done'
    await page.click('button:has-text("done")');
    
    // Verify filter is active
    await expect(page.locator('button:has-text("done")')).toHaveClass(/active/);

    // Refresh the page
    await page.reload();

    // Filter should reset to 'all' (as per implementation - filter is not persisted)
    await expect(page.locator('button:has-text("all")')).toHaveClass(/active/);
  });
});
