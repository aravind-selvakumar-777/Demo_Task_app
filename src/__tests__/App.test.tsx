import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import App from '../App';
import { TASKS_STORAGE_KEY, TASKS_SCHEMA_VERSION, type Task } from '../utils/storage';

function seedStorage(tasks: Task[]) {
  window.localStorage.setItem(
    TASKS_STORAGE_KEY,
    JSON.stringify({
      version: TASKS_SCHEMA_VERSION,
      updatedAt: new Date().toISOString(),
      tasks,
    }),
  );
}

function readStoredTasks(): Task[] {
  const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
  expect(raw).not.toBeNull();
  return JSON.parse(raw as string).tasks;
}

describe('App (Local Storage persistence)', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    window.localStorage.clear();
  });

  it('shows the default starter tasks when Local Storage is empty (AC3)', () => {
    render(<App />);

    expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
    expect(screen.getByText('Prepare demo data')).toBeInTheDocument();
    expect(screen.getByText('Send summary to the team')).toBeInTheDocument();
  });

  it('restores previously persisted tasks on load (AC2)', () => {
    seedStorage([
      { id: 42, title: 'Persisted task from storage', status: 'open', priority: 'Low' },
    ]);

    render(<App />);

    expect(screen.getByText('Persisted task from storage')).toBeInTheDocument();
    expect(screen.queryByText('Review the landing copy')).not.toBeInTheDocument();
  });

  it('keeps stats consistent with the restored task list (AC4)', () => {
    seedStorage([
      { id: 1, title: 'Task A', status: 'open', priority: 'Low' },
      { id: 2, title: 'Task B', status: 'done', priority: 'Medium' },
      { id: 3, title: 'Task C', status: 'done', priority: 'High' },
    ]);

    render(<App />);

    const stats = screen.getByLabelText('Task statistics');
    expect(within(stats).getByText('3')).toBeInTheDocument(); // Total
    expect(within(stats).getByText('1')).toBeInTheDocument(); // Open
    expect(within(stats).getByText('2')).toBeInTheDocument(); // Done
  });

  it('persists a new task to Local Storage after creation (AC1)', async () => {
    const user = userEvent.setup();
    render(<App />);

    await user.type(screen.getByPlaceholderText('Add a task'), 'Write persistence tests');
    await user.click(screen.getByRole('button', { name: 'Add task' }));

    expect(screen.getByText('Write persistence tests')).toBeInTheDocument();

    const storedTasks = readStoredTasks();
    expect(storedTasks.some((task) => task.title === 'Write persistence tests')).toBe(true);
  });

  it('persists status toggles to Local Storage (AC1)', async () => {
    seedStorage([{ id: 1, title: 'Toggle me', status: 'open', priority: 'Low' }]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Complete Toggle me' }));

    const storedTasks = readStoredTasks();
    expect(storedTasks.find((task) => task.id === 1)?.status).toBe('done');
  });

  it('persists deletions to Local Storage (AC1)', async () => {
    seedStorage([{ id: 1, title: 'Delete me', status: 'open', priority: 'Low' }]);
    const user = userEvent.setup();
    render(<App />);

    await user.click(screen.getByRole('button', { name: 'Delete' }));

    expect(screen.queryByText('Delete me')).not.toBeInTheDocument();

    const storedTasks = readStoredTasks();
    expect(storedTasks).toHaveLength(0);
  });

  it('falls back to defaults when the saved payload is corrupted', () => {
    window.localStorage.setItem(TASKS_STORAGE_KEY, '{not-valid-json');

    render(<App />);

    expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
  });
});
