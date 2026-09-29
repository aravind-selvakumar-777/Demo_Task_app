import { beforeEach, describe, expect, it } from 'vitest';
import type { Task } from '../types';
import {
  FILTER_STORAGE_KEY,
  TASKS_STORAGE_KEY,
  isValidFilter,
  isValidTask,
  isValidTaskArray,
  loadFilter,
  loadTasks,
  saveFilter,
  saveTasks,
} from './taskBoardStorage';

const validTask: Task = { id: 1, title: 'Write tests', status: 'open', priority: 'High' };
const anotherValidTask: Task = { id: 2, title: 'Ship it', status: 'done', priority: 'Low' };

describe('taskBoardStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  describe('isValidTask', () => {
    it('accepts a well-formed task', () => {
      expect(isValidTask(validTask)).toBe(true);
    });

    it('rejects a task missing a required field (row 5)', () => {
      const { title, ...withoutTitle } = validTask;
      void title;
      expect(isValidTask(withoutTitle)).toBe(false);
    });

    it('rejects a task with an out-of-enum status (row 6)', () => {
      expect(isValidTask({ ...validTask, status: 'archived' })).toBe(false);
    });

    it('rejects a task with an out-of-enum priority', () => {
      expect(isValidTask({ ...validTask, priority: 'Urgent' })).toBe(false);
    });

    it('rejects a task with id as a string instead of a number (row 7)', () => {
      expect(isValidTask({ ...validTask, id: '1' })).toBe(false);
    });

    it('rejects non-object values', () => {
      expect(isValidTask(null)).toBe(false);
      expect(isValidTask('a task')).toBe(false);
      expect(isValidTask(42)).toBe(false);
    });
  });

  describe('isValidTaskArray', () => {
    it('accepts an array of unique, valid tasks', () => {
      expect(isValidTaskArray([validTask, anotherValidTask])).toBe(true);
    });

    it('accepts an empty array', () => {
      expect(isValidTaskArray([])).toBe(true);
    });

    it('rejects a non-array value (row 4)', () => {
      expect(isValidTaskArray({ tasks: [validTask] })).toBe(false);
    });

    it('rejects an array containing one invalid entry (row 5/6/7)', () => {
      expect(isValidTaskArray([validTask, { ...anotherValidTask, status: 'archived' }])).toBe(false);
    });

    it('rejects an array with two entries sharing the same id (row 8)', () => {
      const duplicate: Task = { ...anotherValidTask, id: validTask.id };
      expect(isValidTaskArray([validTask, duplicate])).toBe(false);
    });
  });

  describe('isValidFilter', () => {
    it.each(['all', 'open', 'done'])('accepts the supported filter value %s', (value) => {
      expect(isValidFilter(value)).toBe(true);
    });

    it('rejects an out-of-enum filter value (row 9)', () => {
      expect(isValidFilter('archived')).toBe(false);
    });

    it('rejects non-string values', () => {
      expect(isValidFilter(null)).toBe(false);
      expect(isValidFilter(1)).toBe(false);
    });
  });

  describe('loadTasks', () => {
    it('returns [] when no data is stored (row 1)', () => {
      expect(loadTasks()).toEqual([]);
    });

    it('returns the stored tasks when they are valid (row 2)', () => {
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([validTask, anotherValidTask]));
      expect(loadTasks()).toEqual([validTask, anotherValidTask]);
    });

    it('returns [] when the stored value is not valid JSON (row 3)', () => {
      window.localStorage.setItem(TASKS_STORAGE_KEY, '{not valid json');
      expect(loadTasks()).toEqual([]);
    });

    it('returns [] when the stored value parses but is not an array (row 4)', () => {
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify({ tasks: [validTask] }));
      expect(loadTasks()).toEqual([]);
    });

    it('returns [] when one task entry is missing a required field (row 5)', () => {
      const { title, ...withoutTitle } = validTask;
      void title;
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([withoutTitle]));
      expect(loadTasks()).toEqual([]);
    });

    it('returns [] when one task entry has an out-of-enum status (row 6)', () => {
      window.localStorage.setItem(
        TASKS_STORAGE_KEY,
        JSON.stringify([{ ...validTask, status: 'archived' }]),
      );
      expect(loadTasks()).toEqual([]);
    });

    it('returns [] when one task entry has id as a string (row 7)', () => {
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([{ ...validTask, id: '1' }]));
      expect(loadTasks()).toEqual([]);
    });

    it('returns [] when two entries share the same id (row 8)', () => {
      const duplicate: Task = { ...anotherValidTask, id: validTask.id };
      window.localStorage.setItem(TASKS_STORAGE_KEY, JSON.stringify([validTask, duplicate]));
      expect(loadTasks()).toEqual([]);
    });
  });

  describe('saveTasks', () => {
    it('persists the given tasks so a subsequent loadTasks restores them (row 12/13/14)', () => {
      saveTasks([validTask, anotherValidTask]);
      expect(loadTasks()).toEqual([validTask, anotherValidTask]);
    });
  });

  describe('loadFilter', () => {
    it("returns 'all' when no data is stored (row 1)", () => {
      expect(loadFilter()).toBe('all');
    });

    it('returns the stored filter when it is valid (row 2)', () => {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify('done'));
      expect(loadFilter()).toBe('done');
    });

    it("returns 'all' when the stored filter is outside the enum (row 9)", () => {
      window.localStorage.setItem(FILTER_STORAGE_KEY, JSON.stringify('archived'));
      expect(loadFilter()).toBe('all');
    });

    it("returns 'all' when the stored value is not valid JSON", () => {
      window.localStorage.setItem(FILTER_STORAGE_KEY, '{not valid json');
      expect(loadFilter()).toBe('all');
    });
  });

  describe('saveFilter', () => {
    it('persists the given filter so a subsequent loadFilter restores it (row 15)', () => {
      saveFilter('open');
      expect(loadFilter()).toBe('open');
    });
  });
});
