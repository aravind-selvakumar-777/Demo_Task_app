import { test, expect, type Page } from '@playwright/test';

// Must match src/storage/tasksStorage.ts
const TASKS_STORAGE_KEY = 'demo_task_board_tasks';

test.describe('KAN-35 Local Storage persistence', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Clear storage after navigation (works reliably across reloads in this suite)
    await page.evaluate(() => window.localStorage.clear());
    await page.reload();
  });

  test('SC-01: Tasks are restored after page refresh (added task)', async ({ page }) => {
    await page.getByPlaceholder('Add a task').fill('Pay Invoice 123');
    await page.getByRole('combobox', { name: 'Priority' }).selectOption('High');
    await page.getByRole('button', { name: /add task/i }).click();

    await page.getByRole('button', { name: /complete pay invoice 123/i }).click();

    await page.reload();

    const card = page.locator('article.task-card', {
      has: page.getByRole('heading', { name: 'Pay Invoice 123' }),
    });

    await expect(card).toBeVisible();
    await expect(card).toHaveClass(/done/);
    await expect(card.getByText(/High priority/i)).toBeVisible();
  });

  test('SC-02: New task is written to Local Storage on Add Task', async ({ page }) => {
    await page.getByPlaceholder('Add a task').fill('Standup notes');
    await page.getByRole('combobox', { name: 'Priority' }).selectOption('Low');
    await page.getByRole('button', { name: /add task/i }).click();

    const raw = await page.evaluate((key) => window.localStorage.getItem(key), TASKS_STORAGE_KEY);
    expect(raw).not.toBeNull();

    const parsed = JSON.parse(raw!);
    expect(parsed).toEqual(
      expect.objectContaining({
        v: 1,
        tasks: expect.arrayContaining([expect.objectContaining({ title: 'Standup notes', priority: 'Low' })]),
      }),
    );
  });

  test('SC-03: Tasks still persist when app is reloaded (simulate new session)', async ({ page, context }) => {
    await page.getByPlaceholder('Add a task').fill('Book room');
    await page.getByRole('combobox', { name: 'Priority' }).selectOption('Medium');
    await page.getByRole('button', { name: /add task/i }).click();

    const page2 = await context.newPage();
    await page2.goto('/');

    await expect(
      page2.locator('article.task-card', { has: page2.getByRole('heading', { name: 'Book room' }) }),
    ).toBeVisible();
  });

  test('SC-04: Status toggle is persisted after refresh (Open -> Done)', async ({ page }) => {
    await page.getByPlaceholder('Add a task').fill('Review PR');
    await page.getByRole('combobox', { name: 'Priority' }).selectOption('Medium');
    await page.getByRole('button', { name: /add task/i }).click();

    await page.getByRole('button', { name: /complete review pr/i }).click();

    await page.reload();

    const card = page.locator('article.task-card', { has: page.getByRole('heading', { name: 'Review PR' }) });
    await expect(card).toBeVisible();
    await expect(card).toHaveClass(/done/);
  });

  test('SC-05: Status toggle is persisted after refresh (Done -> Open)', async ({ page }) => {
    await page.getByPlaceholder('Add a task').fill('Fix flaky test');
    await page.getByRole('combobox', { name: 'Priority' }).selectOption('High');
    await page.getByRole('button', { name: /add task/i }).click();

    await page.getByRole('button', { name: /complete fix flaky test/i }).click();
    await page.getByRole('button', { name: /reopen fix flaky test/i }).click();

    await page.reload();

    const card = page.locator('article.task-card', { has: page.getByRole('heading', { name: 'Fix flaky test' }) });
    await expect(card).toBeVisible();
    await expect(card).toHaveClass(/open/);
  });

  test('SC-06: Deleted task is not restored after refresh', async ({ page }) => {
    await page.getByPlaceholder('Add a task').fill('Temp task index');
    await page.getByRole('combobox', { name: 'Priority' }).selectOption('Low');
    await page.getByRole('button', { name: /add task/i }).click();

    await page
      .locator('article.task-card', { has: page.getByRole('heading', { name: 'Temp task index' }) })
      .getByRole('button', { name: 'Delete' })
      .click();

    await page.reload();

    await expect(page.getByRole('heading', { name: 'Temp task index' })).toHaveCount(0);
  });

  test('SC-07: Empty board persists (no starter tasks re-injected)', async ({ page }) => {
    while (await page.getByRole('button', { name: 'Delete' }).count()) {
      await page.getByRole('button', { name: 'Delete' }).first().click();
    }

    await expect(page.getByText('No tasks match this filter.')).toBeVisible();

    await page.reload();

    await expect(page.getByText('No tasks match this filter.')).toBeVisible();
    await expect(page.locator('article.task-card')).toHaveCount(0);
  });

  test('NG-08: Missing Local Storage entry falls back to default starter tasks on load', async ({ page }) => {
    await page.evaluate((key) => window.localStorage.removeItem(key), TASKS_STORAGE_KEY);

    await page.reload();

    expect(await page.locator('article.task-card').count()).toBeGreaterThan(0);
  });

  test('NG-09: Corrupted Local Storage JSON falls back to default starter tasks on load', async ({ page }) => {
    await page.evaluate((key) => window.localStorage.setItem(key, '{'), TASKS_STORAGE_KEY);

    await page.reload();

    expect(await page.locator('article.task-card').count()).toBeGreaterThan(0);
  });

  test('NG-10: Empty Local Storage value falls back to default starter tasks on load', async ({ page }) => {
    await page.evaluate((key) => window.localStorage.setItem(key, ''), TASKS_STORAGE_KEY);

    await page.reload();

    expect(await page.locator('article.task-card').count()).toBeGreaterThan(0);
  });

  test('SC-11: Active filter resets to "All" after reload (if filter is not persisted)', async ({ page }) => {
    await page.getByRole('button', { name: 'done' }).click();
    await page.reload();

    await expect(page.getByRole('button', { name: 'all' })).toHaveClass(/active/);
  });
});
