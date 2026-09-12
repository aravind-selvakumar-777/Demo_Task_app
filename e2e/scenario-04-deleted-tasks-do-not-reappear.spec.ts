import { test } from './fixtures';

/**
 * Scenario Outline 4: Happy path - deleted tasks do not reappear after page
 * reload.
 */
const examples: Array<{ title: string; priority: 'Low' | 'Medium' | 'High' }> = [
  { title: 'Temp to delete', priority: 'Low' },
];

test.describe('Scenario 4: deleted tasks do not reappear after reload', () => {
  for (const { title, priority } of examples) {
    test(`"${title}" stays deleted after reload`, async ({ taskBoard }) => {
      // Given: I create a new task with the given title and priority.
      await taskBoard.createTask(title, priority);

      // And: I verify the task appears on the board.
      await taskBoard.expectTaskVisible(title);

      // When: I delete the task.
      await taskBoard.deleteTask(title);

      // And: I reload the page.
      await taskBoard.reload();

      // Then: the task is not displayed on the board.
      await taskBoard.expectTaskHidden(title);
    });
  }
});
