import { test, expect } from './fixtures';
import type { Priority } from './pages/task-board.page';

/**
 * Scenario Outline 2: Happy path - created tasks persist after page reload.
 */
const examples: Array<{ title: string; priority: Priority }> = [
  { title: 'Write test plan', priority: 'High' },
  { title: 'Regression task #1', priority: 'Low' },
];

test.describe('Scenario 2: created tasks persist after page reload', () => {
  for (const { title, priority } of examples) {
    test(`"${title}" with priority "${priority}" persists after reload`, async ({
      taskBoard,
    }) => {
      // When: I create a new task with the given title and priority.
      await taskBoard.createTask(title, priority);

      // And: I verify the task appears on the board.
      await taskBoard.expectTaskVisible(title);

      // And: I reload the page.
      await taskBoard.reload();

      // Then: the task is still displayed, with the expected priority and
      // an "Open" status.
      await taskBoard.expectTaskVisible(title);
      await taskBoard.expectPriority(title, priority);
      await taskBoard.expectStatus(title, 'Open');
    });
  }

  test('shows the created tasks in addition to the starter tasks', async ({ taskBoard }) => {
    await taskBoard.createTask(examples[0].title, examples[0].priority);
    await taskBoard.reload();

    const stats = await taskBoard.getStats();
    expect(stats.total).toBe(4); // 3 starter tasks + 1 created task
  });
});
