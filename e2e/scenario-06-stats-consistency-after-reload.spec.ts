import { test, expect } from './fixtures';

/**
 * Scenario Outline 6: Consistency of stats/counters after reload.
 */
const examples: Array<{ createCount: number; doneCount: number }> = [
  { createCount: 2, doneCount: 1 },
];

test.describe('Scenario 6: stats/counters remain consistent after reload', () => {
  for (const { createCount, doneCount } of examples) {
    test(`Total/+${createCount}, Done/+${doneCount}, Open/+${
      createCount - doneCount
    } vs. baseline`, async ({ taskBoard }) => {
      // Given: I record the current task statistics as baseline.
      const baseline = await taskBoard.getStats();

      // When: I create <createCount> new tasks with priority "Low".
      const createdTitles: string[] = [];
      for (let i = 0; i < createCount; i += 1) {
        const title = `Stats task ${i + 1} - ${Date.now()}-${i}`;
        createdTitles.push(title);
        await taskBoard.createTask(title, 'Low');
      }

      // And: I mark <doneCount> of the newly created tasks as Done.
      for (let i = 0; i < doneCount; i += 1) {
        await taskBoard.markDone(createdTitles[i]);
      }

      // And: I reload the page.
      await taskBoard.reload();

      // Then: the Total/Done/Open counts equal the baseline plus the
      // expected deltas.
      const after = await taskBoard.getStats();

      expect(after.total).toBe(baseline.total + createCount);
      expect(after.done).toBe(baseline.done + doneCount);
      expect(after.open).toBe(baseline.open + (createCount - doneCount));
      expect(after.total).toBe(after.open + after.done);
    });
  }
});
