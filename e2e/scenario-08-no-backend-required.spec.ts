import { test, expect } from './fixtures';

/**
 * Scenario 8: Persistence does not require backend API/auth/database
 * changes (out of scope).
 */
test.describe('Scenario 8: persistence works without login/backend', () => {
  test('creates and persists a task without any login prompt', async ({ taskBoard, page }) => {
    // Given: the app does not prompt for login.
    await expect(taskBoard.heading).toBeVisible();
    await expect(
      page.getByRole('textbox', { name: /login|username|password/i }),
    ).toHaveCount(0);
    await expect(page.getByLabel(/password/i)).toHaveCount(0);

    // When: I create a new task with title "Offline task" and priority
    // "Medium".
    await taskBoard.createTask('Offline task', 'Medium');

    // And: I reload the page.
    await taskBoard.reload();

    // Then: the task is still displayed - all state changes were persisted
    // purely via the browser's Local Storage, with no backend involved.
    await taskBoard.expectTaskVisible('Offline task');
  });
});
