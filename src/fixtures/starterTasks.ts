/**
 * Single source of truth for the default starter tasks shown when the Task
 * Board has no persisted Local Storage data yet (KAN-30, AC3).
 *
 * This module is imported both by the app (src/App.tsx) and by the
 * Playwright e2e Page Object (e2e/pages/task-board.page.ts) so that the two
 * layers stay compile-time linked - if the starter tasks change here, both
 * the app and the e2e expectations update together instead of relying on a
 * hand-maintained duplicate literal in the test layer.
 */
import type { Task } from '../utils/storage';

export const starterTasks: Task[] = [
  { id: 1, title: 'Review the landing copy', status: 'open', priority: 'High' },
  { id: 2, title: 'Prepare demo data', status: 'open', priority: 'Medium' },
  { id: 3, title: 'Send summary to the team', status: 'done', priority: 'Low' },
];

/** Titles of the default starter tasks, derived from `starterTasks`. */
export const STARTER_TASK_TITLES: string[] = starterTasks.map((task) => task.title);
