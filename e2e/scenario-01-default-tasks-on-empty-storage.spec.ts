import { test, expect } from './fixtures';
import { STARTER_STATS } from './pages/task-board.page';

/**
 * Scenario 1: Default behavior on empty/missing Local Storage shows starter
 * tasks.
 */
test.describe('Scenario 1: Default behavior on empty/missing Local Storage', () => {
  test('shows the default starter tasks and consistent, non-negative stats', async ({
    taskBoard,
  }) => {
    // Given: Local Storage does not contain persisted board data. Checked
    // right after the Background clears storage and before the reload -
    // the app immediately re-persists its initial task list on load, so
    // asserting this *after* the reload would no longer reflect the
    // "empty storage" precondition.
    expect(taskBoard.rawValueAfterClear).toBeNull();

    // When: the app loads (the Background's reload already triggered this).
    await expect(taskBoard.heading).toBeVisible();

    // Then: the default starter tasks are displayed.
    await taskBoard.expectDefaultStarterTasksDisplayed();

    // And: the task statistics show non-negative integer counts for Total,
    // Open, and Done, consistent with the starter tasks.
    const stats = await taskBoard.getStats();

    expect(Number.isInteger(stats.total)).toBe(true);
    expect(Number.isInteger(stats.open)).toBe(true);
    expect(Number.isInteger(stats.done)).toBe(true);
    expect(stats.total).toBeGreaterThanOrEqual(0);
    expect(stats.open).toBeGreaterThanOrEqual(0);
    expect(stats.done).toBeGreaterThanOrEqual(0);
    expect(stats.total).toBe(stats.open + stats.done);
    expect(stats).toEqual(STARTER_STATS);
  });
});
