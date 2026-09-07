/**
 * SessionStorageAdapter.test.ts - Unit tests for persistence layer
 *
 * Tests cover:
 * - Synchronous load with valid/invalid payloads
 * - Priority filtering on load
 * - Capacity checks
 * - Async save with serialization
 * - Error handling (quota exceeded, parse errors)
 * - Clear method
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { SessionStorageAdapter } from './SessionStorageAdapter';
import { Task, StoragePayload } from '../types/Task';

describe('SessionStorageAdapter', () => {
  let adapter: SessionStorageAdapter;
  const storageKey = 'testTaskBoard';

  beforeEach(() => {
    // Clear sessionStorage before each test
    sessionStorage.clear();
    adapter = new SessionStorageAdapter(storageKey);
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  // ===== LOAD TESTS =====

  describe('load()', () => {
    it('should return empty array when storage is empty', () => {
      const result = adapter.load();
      expect(result).toEqual([]);
    });

    it('should load and return tasks with valid payload', () => {
      const tasks: Task[] = [
        { id: 1, title: 'Task 1', status: 'open', priority: 'High' },
        { id: 2, title: 'Task 2', status: 'done', priority: 'Low' },
      ];
      const payload: StoragePayload = {
        version: '1.0',
        timestamp: Date.now(),
        tasks,
      };

      sessionStorage.setItem(storageKey, JSON.stringify(payload));
      const result = adapter.load();

      expect(result).toEqual(tasks);
      expect(result).toHaveLength(2);
    });

    it('should filter out tasks without priority field', () => {
      const payload: StoragePayload = {
        version: '1.0',
        timestamp: Date.now(),
        tasks: [
          { id: 1, title: 'Task 1', status: 'open', priority: 'High' },
          { id: 2, title: 'Task 2', status: 'open' } as Task, // Missing priority
          { id: 3, title: 'Task 3', status: 'done', priority: 'Medium' },
        ],
      };

      sessionStorage.setItem(storageKey, JSON.stringify(payload));
      const result = adapter.load();

      expect(result).toHaveLength(2);
      expect(result.every((t) => t.priority)).toBe(true);
    });

    it('should cap returned tasks at 8 even if storage has more', () => {
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        title: `Task ${i}`,
        status: 'open' as const,
        priority: 'High' as const,
      }));
      const payload: StoragePayload = {
        version: '1.0',
        timestamp: Date.now(),
        tasks,
      };

      sessionStorage.setItem(storageKey, JSON.stringify(payload));
      const result = adapter.load();

      expect(result).toHaveLength(8);
    });

    it('should return empty array on JSON parse error', () => {
      sessionStorage.setItem(storageKey, '{invalid json}');
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = adapter.load();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });

    it('should handle payload with empty tasks array', () => {
      const payload: StoragePayload = {
        version: '1.0',
        timestamp: Date.now(),
        tasks: [],
      };

      sessionStorage.setItem(storageKey, JSON.stringify(payload));
      const result = adapter.load();

      expect(result).toEqual([]);
    });

    it('should handle payload with null tasks field', () => {
      const payload = {
        version: '1.0',
        timestamp: Date.now(),
        tasks: null,
      };

      sessionStorage.setItem(storageKey, JSON.stringify(payload));
      const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      const result = adapter.load();

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();
    });
  });

  // ===== SAVE TESTS =====

  describe('save()', () => {
    it('should save tasks to sessionStorage with metadata', async () => {
      const tasks: Task[] = [
        { id: 1, title: 'Task 1', status: 'open', priority: 'High' },
      ];

      await adapter.save(tasks);

      const stored = sessionStorage.getItem(storageKey);
      expect(stored).toBeTruthy();

      const payload: StoragePayload = JSON.parse(stored!);
      expect(payload.version).toBe('1.0');
      expect(payload.timestamp).toBeDefined();
      expect(payload.tasks).toEqual(tasks);
    });

    it('should save all 8 tasks', async () => {
      const tasks = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        title: `Task ${i}`,
        status: 'open' as const,
        priority: 'High' as const,
      }));

      await adapter.save(tasks);

      const loaded = adapter.load();
      expect(loaded).toHaveLength(8);
    });

    it('should cap save at 8 tasks (safeguard)', async () => {
      const tasks = Array.from({ length: 10 }, (_, i) => ({
        id: i,
        title: `Task ${i}`,
        status: 'open' as const,
        priority: 'High' as const,
      }));

      await adapter.save(tasks);

      const loaded = adapter.load();
      expect(loaded).toHaveLength(8);
    });

    it('should update existing stored data', async () => {
      const tasks1: Task[] = [{ id: 1, title: 'Task 1', status: 'open', priority: 'High' }];
      const tasks2: Task[] = [
        { id: 2, title: 'Task 2', status: 'open', priority: 'Medium' },
        { id: 3, title: 'Task 3', status: 'done', priority: 'Low' },
      ];

      await adapter.save(tasks1);
      let loaded = adapter.load();
      expect(loaded).toHaveLength(1);

      await adapter.save(tasks2);
      loaded = adapter.load();
      expect(loaded).toHaveLength(2);
      expect(loaded[0].id).toBe(2);
    });

    it('should throw error on serialization failure', async () => {
      const tasks: Task[] = [{ id: 1, title: 'Task 1', status: 'open', priority: 'High' }];

      // Mock JSON.stringify to throw
      const stringifySpy = vi.spyOn(JSON, 'stringify').mockImplementationOnce(() => {
        throw new Error('Serialization failed');
      });

      await expect(adapter.save(tasks)).rejects.toThrow('Storage save failed');

      stringifySpy.mockRestore();
    });

    it('should throw error on quota exceeded', async () => {
      const tasks: Task[] = [{ id: 1, title: 'Task 1', status: 'open', priority: 'High' }];

      // Mock sessionStorage.setItem to throw a generic error
      const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
        const error = new Error('Quota exceeded');
        throw error;
      });

      const errorSpy = vi.spyOn(console, 'error').mockImplementationOnce(() => {});
      await expect(adapter.save(tasks)).rejects.toThrow('Storage save failed');
      expect(errorSpy).toHaveBeenCalled();

      setItemSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  // ===== CAPACITY TESTS =====

  describe('hasCapacity()', () => {
    it('should return true when count is less than 8', () => {
      expect(adapter.hasCapacity(0)).toBe(true);
      expect(adapter.hasCapacity(1)).toBe(true);
      expect(adapter.hasCapacity(7)).toBe(true);
    });

    it('should return false when count is 8 or more', () => {
      expect(adapter.hasCapacity(8)).toBe(false);
      expect(adapter.hasCapacity(9)).toBe(false);
      expect(adapter.hasCapacity(100)).toBe(false);
    });
  });

  // ===== CLEAR TESTS =====

  describe('clear()', () => {
    it('should remove data from sessionStorage', async () => {
      const tasks: Task[] = [{ id: 1, title: 'Task 1', status: 'open', priority: 'High' }];
      await adapter.save(tasks);

      expect(sessionStorage.getItem(storageKey)).toBeTruthy();

      adapter.clear();

      expect(sessionStorage.getItem(storageKey)).toBeNull();
    });

    it('should handle clear when storage is empty', () => {
      expect(() => adapter.clear()).not.toThrow();
      expect(sessionStorage.getItem(storageKey)).toBeNull();
    });

    it('should not throw on clear error', () => {
      const removeItemSpy = vi.spyOn(Storage.prototype, 'removeItem').mockImplementation(() => {
        throw new Error('Remove failed');
      });

      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      expect(() => adapter.clear()).not.toThrow();
      expect(errorSpy).toHaveBeenCalled();

      removeItemSpy.mockRestore();
      errorSpy.mockRestore();
    });
  });

  // ===== INTEGRATION TESTS =====

  describe('integration', () => {
    it('should save and restore tasks correctly (round-trip)', async () => {
      const originalTasks: Task[] = [
        { id: 1, title: 'Review copy', status: 'open', priority: 'High' },
        { id: 2, title: 'Prepare demo', status: 'done', priority: 'Medium' },
        { id: 3, title: 'Send summary', status: 'open', priority: 'Low' },
      ];

      await adapter.save(originalTasks);
      const loaded = adapter.load();

      expect(loaded).toEqual(originalTasks);
    });

    it('should use different keys independently', async () => {
      const adapter1 = new SessionStorageAdapter('key1');
      const adapter2 = new SessionStorageAdapter('key2');

      const tasks1: Task[] = [{ id: 1, title: 'Task 1', status: 'open', priority: 'High' }];
      const tasks2: Task[] = [
        { id: 2, title: 'Task 2', status: 'open', priority: 'Medium' },
        { id: 3, title: 'Task 3', status: 'open', priority: 'Low' },
      ];

      await adapter1.save(tasks1);
      await adapter2.save(tasks2);

      expect(adapter1.load()).toEqual(tasks1);
      expect(adapter2.load()).toEqual(tasks2);
    });
  });
});
