import { test as base } from '@playwright/test';
import { TaskBoardPage } from './pages/task-board.page';

type Fixtures = {
  taskBoard: TaskBoardPage;
};

/**
 * Extends the base Playwright test with a `taskBoard` fixture that performs
 * the Background steps shared by every scenario in `test_cases.md`:
 *   Given I open the Task Board app
 *   And I clear the app's browser Local Storage
 *   And I reload the page
 */
export const test = base.extend<Fixtures>({
  taskBoard: async ({ page }, use) => {
    const taskBoard = new TaskBoardPage(page);
    await taskBoard.openWithCleanStorage();
    await use(taskBoard);
  },
});

export { expect } from '@playwright/test';
