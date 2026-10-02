/**
 * storage.test.ts
 * Unit tests for localStorage persistence utilities (KAN-42).
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  clearTasks,
  isValidTaskArray,
  loadTasks,
  saveTasks,
  STORAGE_KEY,
  type Task,
} from './storage';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const validTasks: Task[] = [
  { id: 1, title: 'Task A', status: 'open', priority: 'High' },
  { id: 2, title: 'Task B', status: 'done', priority: 'Low' },
];

// ---------------------------------------------------------------------------
// isValidTaskArray
// ---------------------------------------------------------------------------

describe('isValidTaskArray', () => {
  it('returns true for a valid task array', () => {
    expect(isValidTaskArray(validTasks)).toBe(true);
  });

  it('returns true for an empty array', () => {
    expect(isValidTaskArray([])).toBe(true);
  });

  it('returns false for null', () => {
    expect(isValidTaskArray(null)).toBe(false);
  });

  it('returns false for a plain object', () => {
    expect(isValidTaskArray({})).toBe(false);
  });

  it('returns false when id is not a number', () => {
    const bad = [{ id: '1', title: 'x', status: 'open', priority: 'High' }];
    expect(isValidTaskArray(bad)).toBe(false);
  });

  it('returns false when title is not a string', () => {
    const bad = [{ id: 1, title: 42, status: 'open', priority: 'High' }];
    expect(isValidTaskArray(bad)).toBe(false);
  });

  it('returns false when status is invalid', () => {
    const bad = [{ id: 1, title: 'x', status: 'pending', priority: 'High' }];
    expect(isValidTaskArray(bad)).toBe(false);
  });

  it('returns false when priority is invalid', () => {
    const bad = [{ id: 1, title: 'x', status: 'open', priority: 'Critical' }];
    expect(isValidTaskArray(bad)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// saveTasks / loadTasks / clearTasks
// ---------------------------------------------------------------------------

describe('saveTasks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('serialises tasks to localStorage under the correct key', () => {
    saveTasks(validTasks);
    const raw = localStorage.getItem(STORAGE_KEY);
    expect(raw).not.toBeNull();
    expect(JSON.parse(raw!)).toEqual(validTasks);
  });

  it('overwrites previously stored tasks', () => {
    saveTasks(validTasks);
    const updated: Task[] = [{ id: 3, title: 'Task C', status: 'open', priority: 'Medium' }];
    saveTasks(updated);
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual(updated);
  });

  it('saves an empty array without error', () => {
    expect(() => saveTasks([])).not.toThrow();
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual([]);
  });

  it('logs a warning and does not throw when localStorage throws', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });

    expect(() => saveTasks(validTasks)).not.toThrow();
    expect(warnSpy).toHaveBeenCalledWith(
      expect.stringContaining('[TaskBoard]'),
      expect.anything(),
    );

    warnSpy.mockRestore();
    vi.restoreAllMocks();
  });
});

describe('loadTasks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('returns null when nothing is stored', () => {
    expect(loadTasks()).toBeNull();
  });

  it('returns valid tasks that were previously saved', () => {
    saveTasks(validTasks);
    expect(loadTasks()).toEqual(validTasks);
  });

  it('returns null and warns when stored JSON is corrupted', () => {
    localStorage.setItem(STORAGE_KEY, 'NOT_VALID_JSON{{{');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadTasks()).toBeNull();
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('returns null and warns when stored data fails validation', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify([{ id: 'bad', title: 1 }]));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(loadTasks()).toBeNull();
    expect(warnSpy).toHaveBeenCalledWith(expect.stringContaining('corrupted'));
    warnSpy.mockRestore();
  });

  it('restores all task fields correctly', () => {
    const tasks: Task[] = [
      { id: 101, title: 'My Task', status: 'done', priority: 'Medium' },
    ];
    saveTasks(tasks);
    const loaded = loadTasks();
    expect(loaded).toHaveLength(1);
    expect(loaded![0]).toMatchObject({ id: 101, title: 'My Task', status: 'done', priority: 'Medium' });
  });
});

describe('clearTasks', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('removes persisted tasks from localStorage', () => {
    saveTasks(validTasks);
    clearTasks();
    expect(localStorage.getItem(STORAGE_KEY)).toBeNull();
  });

  it('does not throw when nothing is stored', () => {
    expect(() => clearTasks()).not.toThrow();
  });

  it('loadTasks returns null after clearTasks', () => {
    saveTasks(validTasks);
    clearTasks();
    expect(loadTasks()).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// Persistence round-trip
// ---------------------------------------------------------------------------

describe('full persistence round-trip', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('saves and restores a task with all field values intact', () => {
    const original: Task[] = [
      { id: Date.now(), title: 'Round-trip Task', status: 'open', priority: 'High' },
    ];
    saveTasks(original);
    const loaded = loadTasks();
    expect(loaded).toEqual(original);
  });

  it('reflects task deletion (filter) correctly', () => {
    saveTasks(validTasks);
    const withoutFirst = validTasks.filter((t) => t.id !== 1);
    saveTasks(withoutFirst);
    const loaded = loadTasks();
    expect(loaded).toHaveLength(1);
    expect(loaded![0].id).toBe(2);
  });

  it('reflects status toggle correctly', () => {
    saveTasks(validTasks);
    const toggled = validTasks.map((t) =>
      t.id === 1 ? { ...t, status: 'done' as const } : t,
    );
    saveTasks(toggled);
    const loaded = loadTasks();
    expect(loaded!.find((t) => t.id === 1)?.status).toBe('done');
  });
});
