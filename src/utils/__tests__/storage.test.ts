import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  TASKS_STORAGE_KEY,
  TASKS_SCHEMA_VERSION,
  clearTasks,
  loadTasks,
  saveTasks,
  type Task,
} from '../storage';

const sampleTasks: Task[] = [
  { id: 1, title: 'Write the report', status: 'open', priority: 'High' },
  { id: 2, title: 'Ship the feature', status: 'done', priority: 'Medium' },
];

describe('storage utilities', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('loadTasks', () => {
    it('returns null when no payload has been saved (AC3 - defaults path)', () => {
      expect(loadTasks()).toBeNull();
    });

    it('returns the saved tasks when a valid payload exists (AC2)', () => {
      saveTasks(sampleTasks);

      expect(loadTasks()).toEqual(sampleTasks);
    });

    it('returns null when the saved value is corrupted JSON', () => {
      window.localStorage.setItem(TASKS_STORAGE_KEY, '{not-valid-json');

      expect(loadTasks()).toBeNull();
    });

    it('returns null when the payload is missing required task fields', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({
          version: TASKS_SCHEMA_VERSION,
          tasks: [{ id: 1, title: 'Missing status/priority' }],
        }),
      );

      expect(loadTasks()).toBeNull();
    });

    it('returns null when the payload version does not match the current schema', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({ version: 999, tasks: sampleTasks }),
      );

      expect(loadTasks()).toBeNull();
    });

    it('returns null when tasks is not an array', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify({ version: TASKS_SCHEMA_VERSION, tasks: 'nope' }),
      );

      expect(loadTasks()).toBeNull();
    });
  });

  describe('saveTasks', () => {
    it('writes a versioned JSON payload containing the tasks', () => {
      saveTasks(sampleTasks);

      const raw = window.localStorage.getItem(TASKS_STORAGE_KEY);
      expect(raw).not.toBeNull();

      const parsed = JSON.parse(raw as string);
      expect(parsed.version).toBe(TASKS_SCHEMA_VERSION);
      expect(parsed.tasks).toEqual(sampleTasks);
      expect(typeof parsed.updatedAt).toBe('string');
    });

    it('handles storage write errors (e.g. quota exceeded) without throwing', () => {
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
        throw new DOMException('The quota has been exceeded.', 'QuotaExceededError');
      });

      expect(() => saveTasks(sampleTasks)).not.toThrow();

      setItemSpy.mockRestore();
    });
  });

  describe('clearTasks', () => {
    it('removes any persisted payload', () => {
      saveTasks(sampleTasks);
      expect(loadTasks()).not.toBeNull();

      clearTasks();

      expect(window.localStorage.getItem(TASKS_STORAGE_KEY)).toBeNull();
      expect(loadTasks()).toBeNull();
    });
  });
});
