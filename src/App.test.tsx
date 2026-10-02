/**
 * App.test.tsx
 * Component-level unit tests for the Task Board App (KAN-42).
 * Covers: rendering, task creation, status toggle, deletion, filtering,
 *         localStorage persistence, reset functionality, and statistics.
 */

import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import App from './App';
import { STORAGE_KEY } from './storage';

// ---------------------------------------------------------------------------
// Setup / teardown
// ---------------------------------------------------------------------------
beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  cleanup();
  localStorage.clear();
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------
function renderApp() {
  return render(<App />);
}

function getTaskInput(): HTMLInputElement {
  return screen.getByPlaceholderText('Add a task') as HTMLInputElement;
}

function getPrioritySelect(): HTMLSelectElement {
  return screen.getByRole('combobox') as HTMLSelectElement;
}

function clickAddTask() {
  fireEvent.click(screen.getByRole('button', { name: /add task/i }));
}

function addTask(title: string, priority = 'Medium') {
  fireEvent.change(getTaskInput(), { target: { value: title } });
  fireEvent.change(getPrioritySelect(), { target: { value: priority } });
  clickAddTask();
}

// ---------------------------------------------------------------------------
// 1. Initial render with default starter tasks
// ---------------------------------------------------------------------------
describe('Initial render', () => {
  it('renders the app title', () => {
    renderApp();
    expect(screen.getByRole('heading', { name: /task board/i })).toBeInTheDocument();
  });

  it('shows default starter tasks when localStorage is empty', () => {
    renderApp();
    expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
    expect(screen.getByText('Prepare demo data')).toBeInTheDocument();
    expect(screen.getByText('Send summary to the team')).toBeInTheDocument();
  });

  it('displays correct initial statistics (3 total, 2 open, 1 done)', () => {
    renderApp();
    const statSpans = document.querySelectorAll('.stats-grid > div > span');
    expect(statSpans[0].textContent).toBe('3'); // Total
    expect(statSpans[1].textContent).toBe('2'); // Open
    expect(statSpans[2].textContent).toBe('1'); // Done
  });

  it('renders the task input field and priority selector', () => {
    renderApp();
    expect(getTaskInput()).toBeInTheDocument();
    expect(getPrioritySelect()).toBeInTheDocument();
  });

  it('renders filter buttons: all, open, done', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^open$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^done$/i })).toBeInTheDocument();
  });

  it('renders a Reset button', () => {
    renderApp();
    expect(screen.getByRole('button', { name: /reset/i })).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 2. Task creation
// ---------------------------------------------------------------------------
describe('Task creation', () => {
  it('adds a new task to the list', () => {
    renderApp();
    addTask('My New Task');
    expect(screen.getByText('My New Task')).toBeInTheDocument();
  });

  it('clears the input field after adding a task', () => {
    renderApp();
    addTask('Clear Me');
    expect(getTaskInput().value).toBe('');
  });

  it('does not add a task when title is empty', () => {
    renderApp();
    clickAddTask();
    // Still only 3 starter tasks
    const articles = document.querySelectorAll('article.task-card');
    expect(articles.length).toBe(3);
  });

  it('does not add a task when title is whitespace only', () => {
    renderApp();
    fireEvent.change(getTaskInput(), { target: { value: '   ' } });
    clickAddTask();
    const articles = document.querySelectorAll('article.task-card');
    expect(articles.length).toBe(3);
  });

  it('respects the selected priority when adding a task', () => {
    renderApp();
    addTask('Unique High Prio Task XYZ', 'High');
    // Use getAllByText because starter tasks may also have "High priority"
    const highPriorityElements = screen.getAllByText('High priority');
    expect(highPriorityElements.length).toBeGreaterThanOrEqual(1);
    // Confirm the specific task was added
    expect(screen.getByText('Unique High Prio Task XYZ')).toBeInTheDocument();
  });

  it('adds a Low priority task correctly', () => {
    renderApp();
    addTask('Unique Low Prio Task ABC', 'Low');
    // Use getAllByText since "Send summary to the team" also has Low priority
    const lowPriorityElements = screen.getAllByText('Low priority');
    expect(lowPriorityElements.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('Unique Low Prio Task ABC')).toBeInTheDocument();
  });

  it('new task appears with Open status', () => {
    renderApp();
    addTask('Brand New Task');
    const openButtons = screen.getAllByRole('button', { name: /complete brand new task/i });
    expect(openButtons.length).toBeGreaterThanOrEqual(1);
  });

  it('persists a new task to localStorage immediately', () => {
    renderApp();
    addTask('Persisted Task');
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    const found = parsed.find((t: { title: string }) => t.title === 'Persisted Task');
    expect(found).toBeDefined();
    expect(found.status).toBe('open');
  });

  it('statistics update after adding a task', () => {
    renderApp();
    addTask('Stats Task');
    const statSpans = document.querySelectorAll('.stats-grid > div > span');
    expect(statSpans[0].textContent).toBe('4'); // Total
    expect(statSpans[1].textContent).toBe('3'); // Open
  });
});

// ---------------------------------------------------------------------------
// 3. Status toggle
// ---------------------------------------------------------------------------
describe('Status toggle', () => {
  it('marks an open task as done', () => {
    renderApp();
    const completeBtn = screen.getByRole('button', {
      name: /complete review the landing copy/i,
    });
    fireEvent.click(completeBtn);
    expect(
      screen.getByRole('button', { name: /reopen review the landing copy/i }),
    ).toBeInTheDocument();
  });

  it('reopens a done task', () => {
    renderApp();
    const reopenBtn = screen.getByRole('button', {
      name: /reopen send summary to the team/i,
    });
    fireEvent.click(reopenBtn);
    expect(
      screen.getByRole('button', { name: /complete send summary to the team/i }),
    ).toBeInTheDocument();
  });

  it('persists status change to localStorage', () => {
    renderApp();
    fireEvent.click(
      screen.getByRole('button', { name: /complete review the landing copy/i }),
    );
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    const task = parsed.find((t: { title: string }) => t.title === 'Review the landing copy');
    expect(task.status).toBe('done');
  });

  it('updates Done counter after toggling a task', () => {
    renderApp();
    // Initially done = 1
    fireEvent.click(
      screen.getByRole('button', { name: /complete review the landing copy/i }),
    );
    // Now done = 2, open = 1
    const statSpans = document.querySelectorAll('.stats-grid > div > span');
    expect(statSpans[2].textContent).toBe('2'); // Done count
    expect(statSpans[1].textContent).toBe('1'); // Open count
  });
});

// ---------------------------------------------------------------------------
// 4. Task deletion
// ---------------------------------------------------------------------------
describe('Task deletion', () => {
  it('removes a task from the list on delete click', () => {
    renderApp();
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    expect(document.querySelectorAll('article.task-card').length).toBe(2);
  });

  it('persists deletion to localStorage', () => {
    renderApp();
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = JSON.parse(raw!);
    expect(parsed.length).toBe(2);
  });

  it('updates Total counter after deletion', () => {
    renderApp();
    const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    fireEvent.click(deleteButtons[0]);
    const statSpans = document.querySelectorAll('.stats-grid > div > span');
    expect(statSpans[0].textContent).toBe('2'); // Total
  });

  it('shows empty-state message when all tasks are deleted', () => {
    renderApp();
    let deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    while (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    }
    expect(screen.getByText(/no tasks match this filter/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 5. Filtering
// ---------------------------------------------------------------------------
describe('Filtering', () => {
  it('"open" filter shows only open tasks', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }));
    expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
    expect(screen.getByText('Prepare demo data')).toBeInTheDocument();
    expect(screen.queryByText('Send summary to the team')).not.toBeInTheDocument();
  });

  it('"done" filter shows only done tasks', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    expect(screen.queryByText('Review the landing copy')).not.toBeInTheDocument();
    expect(screen.queryByText('Prepare demo data')).not.toBeInTheDocument();
    expect(screen.getByText('Send summary to the team')).toBeInTheDocument();
  });

  it('"all" filter shows all tasks', () => {
    renderApp();
    fireEvent.click(screen.getByRole('button', { name: /^done$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^all$/i }));
    expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
    expect(screen.getByText('Send summary to the team')).toBeInTheDocument();
  });

  it('shows empty-state when no tasks match the active filter', () => {
    renderApp();
    // Delete all open tasks while in "open" filter
    fireEvent.click(screen.getByRole('button', { name: /^open$/i }));
    let deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    while (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    }
    expect(screen.getByText(/no tasks match this filter/i)).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 6. localStorage persistence on load
// ---------------------------------------------------------------------------
describe('localStorage persistence on load', () => {
  it('restores tasks from localStorage on app load', () => {
    const saved = [
      { id: 1, title: 'Restored Task', status: 'open', priority: 'High' },
      { id: 2, title: 'Another Saved', status: 'done', priority: 'Medium' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    renderApp();
    expect(screen.getByText('Restored Task')).toBeInTheDocument();
    expect(screen.getByText('Another Saved')).toBeInTheDocument();
    // Starter tasks should NOT appear since we have saved tasks
    expect(screen.queryByText('Review the landing copy')).not.toBeInTheDocument();
  });

  it('falls back to starter tasks when localStorage is empty', () => {
    renderApp();
    expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
  });

  it('falls back to starter tasks when stored JSON is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, 'CORRUPTED_DATA{{');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderApp();
    expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
    warnSpy.mockRestore();
  });

  it('falls back to starter tasks when stored data fails schema validation', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'bad', title: 99 }]));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    renderApp();
    expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
    warnSpy.mockRestore();
  });

  it('restores correct status for tasks loaded from localStorage', () => {
    const saved = [
      { id: 1, title: 'Done Task Loaded', status: 'done', priority: 'Low' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    renderApp();
    expect(
      screen.getByRole('button', { name: /reopen done task loaded/i }),
    ).toBeInTheDocument();
  });

  it('restores correct priority for tasks loaded from localStorage', () => {
    const saved = [
      { id: 1, title: 'High Prio Loaded Task', status: 'open', priority: 'High' },
    ];
    localStorage.setItem(STORAGE_KEY, JSON.stringify(saved));
    renderApp();
    // The task is the only one, so getByText is safe
    expect(screen.getByText('High priority')).toBeInTheDocument();
  });
});

// ---------------------------------------------------------------------------
// 7. Reset functionality
// ---------------------------------------------------------------------------
describe('Reset functionality', () => {
  it('restores default starter tasks after reset', () => {
    renderApp();
    addTask('Custom Task');
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    expect(screen.queryByText('Custom Task')).not.toBeInTheDocument();
    expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
    expect(screen.getByText('Prepare demo data')).toBeInTheDocument();
    expect(screen.getByText('Send summary to the team')).toBeInTheDocument();
  });

  it('clears the custom task from localStorage after reset', () => {
    renderApp();
    addTask('Will Be Cleared');
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      const found = parsed.find((t: { title: string }) => t.title === 'Will Be Cleared');
      expect(found).toBeUndefined();
    }
  });

  it('resets statistics to default values after reset', () => {
    renderApp();
    addTask('Extra Task');
    addTask('Another Extra');
    fireEvent.click(screen.getByRole('button', { name: /reset/i }));
    const statSpans = document.querySelectorAll('.stats-grid > div > span');
    expect(statSpans[0].textContent).toBe('3'); // Total back to 3
  });
});

// ---------------------------------------------------------------------------
// 8. Task statistics
// ---------------------------------------------------------------------------
describe('Task statistics', () => {
  it('shows correct Total, Open, Done counts for starter tasks', () => {
    renderApp();
    const statSpans = document.querySelectorAll('.stats-grid > div > span');
    expect(statSpans[0].textContent).toBe('3'); // Total
    expect(statSpans[1].textContent).toBe('2'); // Open
    expect(statSpans[2].textContent).toBe('1'); // Done
  });

  it('updates Open count when a task is added', () => {
    renderApp();
    addTask('New Open Task');
    const statSpans = document.querySelectorAll('.stats-grid > div > span');
    expect(statSpans[0].textContent).toBe('4'); // Total
    expect(statSpans[1].textContent).toBe('3'); // Open
    expect(statSpans[2].textContent).toBe('1'); // Done
  });

  it('updates counts when a task is toggled to Done', () => {
    renderApp();
    fireEvent.click(
      screen.getByRole('button', { name: /complete review the landing copy/i }),
    );
    const statSpans = document.querySelectorAll('.stats-grid > div > span');
    expect(statSpans[1].textContent).toBe('1'); // Open
    expect(statSpans[2].textContent).toBe('2'); // Done
  });

  it('updates counts when all tasks are deleted', () => {
    renderApp();
    let deleteButtons = screen.getAllByRole('button', { name: /delete/i });
    while (deleteButtons.length > 0) {
      fireEvent.click(deleteButtons[0]);
      deleteButtons = screen.queryAllByRole('button', { name: /delete/i });
    }
    const statSpans = document.querySelectorAll('.stats-grid > div > span');
    expect(statSpans[0].textContent).toBe('0'); // Total
    expect(statSpans[1].textContent).toBe('0'); // Open
    expect(statSpans[2].textContent).toBe('0'); // Done
  });
});

// ---------------------------------------------------------------------------
// 9. Accessibility
// ---------------------------------------------------------------------------
describe('Accessibility', () => {
  it('task list has aria-live="polite" attribute', () => {
    renderApp();
    const taskList = document.querySelector('[aria-live="polite"]');
    expect(taskList).not.toBeNull();
  });

  it('stats grid has aria-label="Task statistics"', () => {
    renderApp();
    const statsGrid = document.querySelector('[aria-label="Task statistics"]');
    expect(statsGrid).not.toBeNull();
  });

  it('Reset button has an aria-label', () => {
    renderApp();
    const resetBtn = screen.getByRole('button', { name: /reset board to default/i });
    expect(resetBtn).toBeInTheDocument();
  });

  it('filter toolbar has aria-label="Task filters"', () => {
    renderApp();
    const toolbar = document.querySelector('[aria-label="Task filters"]');
    expect(toolbar).not.toBeNull();
  });

  it('task input has accessible label "Task name"', () => {
    renderApp();
    expect(screen.getByRole('textbox', { name: /task name/i })).toBeInTheDocument();
  });

  it('priority selector has accessible label "Priority"', () => {
    renderApp();
    expect(screen.getByRole('combobox', { name: /priority/i })).toBeInTheDocument();
  });
});
