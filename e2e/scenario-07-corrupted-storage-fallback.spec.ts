import { test, expect } from './fixtures';
import { STARTER_STATS } from './pages/task-board.page';

/**
 * Scenario Outline 7: Fallback behavior when Local Storage data is
 * corrupted/invalid.
 */
const invalidValues = ['NOT_JSON', '', '{}', '[{ id: 1 }]'];

test.describe('Scenario 7: fallback behavior for corrupted/invalid Local Storage data', () => {
  for (const invalidValue of invalidValues) {
    test(`falls back to starter tasks when Local Storage is ${JSON.stringify(
      invalidValue,
    )}`, async ({ taskBoard, page }) => {
      const uncaughtErrors: Error[] = [];
      page.on('pageerror', (error) => uncaughtErrors.push(error));

      // Given: I set persisted board data in Local Storage to <invalidValue>.
      await taskBoard.setLocalStorageRaw(invalidValue);

      // When: I reload the page.
      await taskBoard.reload();

      // Then: the app loads without an uncaught error.
      expect(
        uncaughtErrors,
        `Unexpected uncaught error(s): ${uncaughtErrors.map((e) => e.message).join('; ')}`,
      ).toHaveLength(0);

      // And: the default starter tasks are displayed.
      await taskBoard.expectDefaultStarterTasksDisplayed();

      // And: the task statistics (Total, Open, Done) are consistent with
      // the displayed starter tasks.
      const stats = await taskBoard.getStats();
      expect(stats).toEqual(STARTER_STATS);
      expect(stats.total).toBe(stats.open + stats.done);
    });
  }
});
