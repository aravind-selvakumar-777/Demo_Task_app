import { expect, test } from '@playwright/test';

const tasksKey = 'demo-task-board-tasks';

type Priority = 'Low' | 'Medium' | 'High';

test.describe('KAN-36 LocalStorage persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key: string) => window.localStorage.removeItem(key), tasksKey);
    await page.reload();
  });

  async function createTask(page: any, title: string, priority: Priority) {
    await page.getByLabel('Task name').fill(title);
    await page.getByLabel('Priority').selectOption(priority);
    await page.getByRole('button', { name: 'Add task' }).click();
    await expect(page.getByRole('heading', { name: title, level: 2 })).toBeVisible();
  }

  async function toggleDone(page: any, title: string) {
    await page.getByRole('button', { name: new RegExp(`(Complete|Reopen) ${title}`) }).click();
  }

  async function deleteTask(page: any, title: string) {
    const card = page.locator('.task-card', { has: page.getByRole('heading', { name: title, level: 2 }) });
    await card.locator('button.delete-button').click();
    await expect(page.getByRole('heading', { name: title, level: 2 })).toHaveCount(0);
  }

  async function expectStats(page: any, total: number, open: number, done: number) {
    const stats = page.getByLabel('Task statistics');
    await expect(stats.locator('span').nth(0)).toHaveText(String(total));
    await expect(stats.locator('span').nth(1)).toHaveText(String(open));
    await expect(stats.locator('span').nth(2)).toHaveText(String(done));
  }

  test('SC-01 - Tasks persist after refresh with title, priority, status, and statistics', async ({ page }) => {
    await createTask(page, 'Task A', 'High');
    await createTask(page, 'Task B', 'Low');

    await toggleDone(page, 'Task B');

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Task A', level: 2 })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Task B', level: 2 })).toBeVisible();

    const cardA = page.locator('.task-card', { has: page.getByRole('heading', { name: 'Task A', level: 2 }) });
    const cardB = page.locator('.task-card', { has: page.getByRole('heading', { name: 'Task B', level: 2 }) });

    await expect(cardA.getByText(/High priority/i)).toBeVisible();
    await expect(cardB.getByText(/Low priority/i)).toBeVisible();

    await expect(cardA.getByRole('button', { name: /Complete Task A|Reopen Task A/ })).toContainText(/Open/i);
    await expect(cardB.getByRole('button', { name: /Complete Task B|Reopen Task B/ })).toContainText(/Done/i);

    // starter tasks (3) + 2 newly created
    await expectStats(page, 5, 3, 2);
  });

  test('SC-02 - Task status toggle persists after refresh', async ({ page }) => {
    await createTask(page, 'Toggle Me', 'Medium');

    await toggleDone(page, 'Toggle Me');
    await page.reload();
    await expect(page.getByRole('button', { name: new RegExp(`Reopen Toggle Me`) })).toBeVisible();

    await toggleDone(page, 'Toggle Me');
    await page.reload();
    await expect(page.getByRole('button', { name: new RegExp(`Complete Toggle Me`) })).toBeVisible();
  });

  test('SC-03 - Task deletion persists after refresh', async ({ page }) => {
    await createTask(page, 'Delete Me', 'Low');
    await deleteTask(page, 'Delete Me');

    await page.reload();
    await expect(page.getByRole('heading', { name: 'Delete Me', level: 2 })).toHaveCount(0);
  });

  test('SC-04 - Persisted tasks are loaded in a new tab in the same browser context', async ({ context, page }) => {
    await createTask(page, 'Tab Check', 'Medium');

    const page2 = await context.newPage();
    await page2.goto('/');

    await expect(page2.getByRole('heading', { name: 'Tab Check', level: 2 })).toBeVisible();
  });

  test('SC-05 - Empty board persists after refresh (no re-seeding default tasks)', async ({ page }) => {
    // remove all tasks (including starter tasks)
    while ((await page.locator('button.delete-button').count()) > 0) {
      await page.locator('button.delete-button').first().click();
    }

    await page.reload();

    await expect(page.getByText(/No tasks match this filter/i)).toBeVisible();
    await expectStats(page, 0, 0, 0);
  });

  test('SC-06 - App loads gracefully when localStorage contains malformed data', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key: string) => window.localStorage.setItem(key, 'not-json'), tasksKey);
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
  });

  test('SC-07 - App loads gracefully when localStorage key is missing (first run)', async ({ page }) => {
    await page.goto('/');
    await page.evaluate((key: string) => window.localStorage.removeItem(key), tasksKey);
    await page.reload();
    await expect(page.locator('body')).toBeVisible();
  });

  test('SC-08 - App does not crash if localStorage is unavailable (blocked)', async ({ page }) => {
    await page.addInitScript(() => {
      const blocked = {
        getItem() {
          throw new Error('localStorage blocked');
        },
        setItem() {
          throw new Error('localStorage blocked');
        },
        removeItem() {
          throw new Error('localStorage blocked');
        },
        clear() {
          throw new Error('localStorage blocked');
        },
        key() {
          throw new Error('localStorage blocked');
        },
        get length() {
          throw new Error('localStorage blocked');
        },
      };

      Object.defineProperty(window, 'localStorage', {
        configurable: true,
        get() {
          return blocked;
        },
      });
    });

    await page.goto('/');
    await expect(page.locator('body')).toBeVisible();

    await createTask(page, 'LS blocked task', 'Low');
  });

  test('SC-09 - Active filter selection is restored after refresh (All)', async ({ page }) => {
    await page.getByRole('button', { name: 'all', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'all', exact: true })).toHaveClass(/active/);
  });

  test('SC-09 - Active filter selection is restored after refresh (Open)', async ({ page }) => {
    await page.getByRole('button', { name: 'open', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'open', exact: true })).toHaveClass(/active/);
  });

  test('SC-09 - Active filter selection is restored after refresh (Done)', async ({ page }) => {
    await page.getByRole('button', { name: 'done', exact: true }).click();
    await page.reload();
    await expect(page.getByRole('button', { name: 'done', exact: true })).toHaveClass(/active/);
  });
});
