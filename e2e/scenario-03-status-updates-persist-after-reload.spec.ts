import { test } from './fixtures';

/**
 * Scenario Outline 3: Happy path - status updates persist after page reload
 * (Done and Reopen).
 */
const examples: Array<{ title: string; priority: 'Low' | 'Medium' | 'High' }> = [
  { title: 'Persist status toggle', priority: 'Medium' },
];

test.describe('Scenario 3: status updates (Done and Reopen) persist after reload', () => {
  for (const { title, priority } of examples) {
    test(`"${title}" toggled to Done and back to Open survives reloads`, async ({
      taskBoard,
    }) => {
      // Given: I create a new task with the given title and priority.
      await taskBoard.createTask(title, priority);

      // When: I mark the task as Done.
      await taskBoard.markDone(title);

      // And: I reload the page.
      await taskBoard.reload();

      // Then: the task is displayed with status "Done".
      await taskBoard.expectStatus(title, 'Done');

      // When: I reopen the task to Open.
      await taskBoard.reopen(title);

      // And: I reload the page.
      await taskBoard.reload();

      // Then: the task is displayed with status "Open".
      await taskBoard.expectStatus(title, 'Open');
    });
  }
});
