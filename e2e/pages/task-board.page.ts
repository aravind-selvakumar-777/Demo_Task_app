import { expect, type Locator, type Page } from '@playwright/test';

export type Priority = 'Low' | 'Medium' | 'High';
export type Status = 'Open' | 'Done';

export type Stats = {
  total: number;
  open: number;
  done: number;
};

/** Must match `TASKS_STORAGE_KEY` in `src/utils/storage.ts`. */
export const TASKS_STORAGE_KEY = 'task_board.tasks.v1';

/** Titles of the default starter tasks rendered when no persisted data exists. */
export const STARTER_TASK_TITLES = [
  'Review the landing copy',
  'Prepare demo data',
  'Send summary to the team',
];

export const STARTER_STATS: Stats = { total: 3, open: 2, done: 1 };

/**
 * Page Object Model for the Demo Task Board app, encapsulating the DOM
 * interactions and Local Storage manipulation needed by the KAN-30
 * persistence test scenarios.
 */
export class TaskBoardPage {
  /**
   * Raw Local Storage value observed right after `openWithCleanStorage()`
   * cleared storage but *before* the subsequent reload (which causes the
   * app to immediately re-persist its initial task list via the
   * `saveTasks` effect). Used to assert the "Given Local Storage does not
   * contain persisted board data" precondition in Scenario 1.
   */
  public rawValueAfterClear: string | null = null;

  constructor(private readonly page: Page) {}

  get heading(): Locator {
    return this.page.getByRole('heading', { name: 'Task Board', exact: true });
  }

  async open(): Promise<void> {
    await this.page.goto('/');
    await expect(this.heading).toBeVisible();
  }

  async clearLocalStorage(): Promise<void> {
    await this.page.evaluate(() => window.localStorage.clear());
  }

  async setLocalStorageRaw(value: string): Promise<void> {
    await this.page.evaluate(
      ({ key, value: rawValue }) => window.localStorage.setItem(key, rawValue),
      { key: TASKS_STORAGE_KEY, value },
    );
  }

  async getRawLocalStorageValue(): Promise<string | null> {
    return this.page.evaluate(
      (key) => window.localStorage.getItem(key),
      TASKS_STORAGE_KEY,
    );
  }

  async reload(): Promise<void> {
    await this.page.reload();
    await expect(this.heading).toBeVisible();
  }

  /** Background: "Open app with a clean persistence state". */
  async openWithCleanStorage(): Promise<void> {
    await this.open();
    await this.clearLocalStorage();
    this.rawValueAfterClear = await this.getRawLocalStorageValue();
    await this.reload();
  }

  async createTask(title: string, priority: Priority): Promise<void> {
    await this.page.getByPlaceholder('Add a task').fill(title);
    await this.page.getByLabel('Priority').selectOption(priority);
    await this.page.getByRole('button', { name: 'Add task', exact: true }).click();
    await this.expectTaskVisible(title);
  }

  taskCard(title: string): Locator {
    return this.page
      .locator('.task-card')
      .filter({ has: this.page.getByRole('heading', { name: title, exact: true }) });
  }

  async expectTaskVisible(title: string): Promise<void> {
    await expect(this.taskCard(title)).toBeVisible();
  }

  async expectTaskHidden(title: string): Promise<void> {
    await expect(this.taskCard(title)).toHaveCount(0);
  }

  async markDone(title: string): Promise<void> {
    await this.taskCard(title)
      .getByRole('button', { name: `Complete ${title}`, exact: true })
      .click();
    await this.expectStatus(title, 'Done');
  }

  async reopen(title: string): Promise<void> {
    await this.taskCard(title)
      .getByRole('button', { name: `Reopen ${title}`, exact: true })
      .click();
    await this.expectStatus(title, 'Open');
  }

  async deleteTask(title: string): Promise<void> {
    await this.taskCard(title)
      .getByRole('button', { name: 'Delete', exact: true })
      .click();
    await this.expectTaskHidden(title);
  }

  async expectStatus(title: string, status: Status): Promise<void> {
    await expect(this.taskCard(title).locator('.status-toggle')).toHaveText(status);
  }

  async expectPriority(title: string, priority: Priority): Promise<void> {
    await expect(this.taskCard(title).locator('p')).toHaveText(`${priority} priority`);
  }

  async getStats(): Promise<Stats> {
    const statBlocks = this.page.locator('.stats-grid > div');
    const [total, open, done] = await Promise.all([
      statBlocks.nth(0).locator('span').innerText(),
      statBlocks.nth(1).locator('span').innerText(),
      statBlocks.nth(2).locator('span').innerText(),
    ]);
    return { total: Number(total), open: Number(open), done: Number(done) };
  }

  async expectDefaultStarterTasksDisplayed(): Promise<void> {
    for (const title of STARTER_TASK_TITLES) {
      await this.expectTaskVisible(title);
    }
  }
}
