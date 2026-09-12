import { test } from './fixtures';

/**
 * Scenario 5: Restores full board state after reload with mixed
 * create/update/delete operations.
 */
test.describe('Scenario 5: mixed create/update/delete operations restore state', () => {
  test('keeps "Task B" as Done and drops "Task A" after reload', async ({ taskBoard }) => {
    // When: I create "Task A" (High) and "Task B" (Medium).
    await taskBoard.createTask('Task A', 'High');
    await taskBoard.createTask('Task B', 'Medium');

    // And: I mark "Task B" as Done.
    await taskBoard.markDone('Task B');

    // And: I delete "Task A".
    await taskBoard.deleteTask('Task A');

    // And: I reload the page.
    await taskBoard.reload();

    // Then: "Task B" is displayed with status "Done".
    await taskBoard.expectTaskVisible('Task B');
    await taskBoard.expectStatus('Task B', 'Done');

    // And: "Task A" is not displayed.
    await taskBoard.expectTaskHidden('Task A');
  });
});
