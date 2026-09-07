/**
 * useTaskPersistence.test.ts - Unit tests for task state management hook
 *
 * Tests cover:
 * - Synchronous load on mount
 * - addTask with validation (priority required, max 8 tasks)
 * - updateTask and deleteTask mutations
 * - Auto-save debounce behavior
 * - storageError state lifecycle
 * - Cleanup on unmount
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useTaskPersistence } from './useTaskPersistence';
import { storageAdapter } from '../services/SessionStorageAdapter';
import { Task } from '../types/Task';

// Mock the storage adapter
vi.mock('../services/SessionStorageAdapter', () => ({
  storageAdapter: {
    load: vi.fn(),
    save: vi.fn(),
    hasCapacity: vi.fn((count: number) => count < 8),
    clear: vi.fn(),
  },
}));

describe('useTaskPersistence', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    sessionStorage.clear();
  });

  afterEach(() => {
    sessionStorage.clear();
  });

  // ===== MOUNT / LOAD TESTS =====

  describe('mount and load', () => {
    it('should load tasks synchronously on mount', () => {
      const mockTasks: Task[] = [
        { id: 1, title: 'Task 1', status: 'open', priority: 'High' },
        { id: 2, title: 'Task 2', status: 'done', priority: 'Low' },
      ];

      vi.mocked(storageAdapter.load).mockReturnValue(mockTasks);

      const { result } = renderHook(() => useTaskPersistence());

      expect(result.current.tasks).toEqual(mockTasks);
      expect(storageAdapter.load).toHaveBeenCalledTimes(1);
    });

    it('should start with empty tasks if load returns empty array', () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);

      const { result } = renderHook(() => useTaskPersistence());

      expect(result.current.tasks).toEqual([]);
    });

    it('should start with null storageError', () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);

      const { result } = renderHook(() => useTaskPersistence());

      expect(result.current.storageError).toBeNull();
    });
  });

  // ===== ADD TASK TESTS =====

  describe('addTask()', () => {
    it('should return "success" and add task when priority is provided', async () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      const newTask = { title: 'New task', status: 'open' as const, priority: 'High' as const };
      let addResult = '';

      await act(async () => {
        addResult = result.current.addTask(newTask);
      });

      expect(addResult).toBe('success');
      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0]).toMatchObject(newTask);
    });

    it('should return "priority_required" when priority is missing', async () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);

      const { result } = renderHook(() => useTaskPersistence());

      let addResult = '';

      await act(async () => {
        addResult = result.current.addTask({
          title: 'New task',
          status: 'open',
          priority: '' as any, // Missing priority
        });
      });

      expect(addResult).toBe('priority_required');
      expect(result.current.tasks).toHaveLength(0); // Task not added
    });

    it('should return "max_limit_exceeded" when 8 tasks exist', async () => {
      const existingTasks: Task[] = Array.from({ length: 8 }, (_, i) => ({
        id: i,
        title: `Task ${i}`,
        status: 'open',
        priority: 'High',
      }));

      vi.mocked(storageAdapter.load).mockReturnValue(existingTasks);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      let addResult = '';

      await act(async () => {
        addResult = result.current.addTask({
          title: 'New task',
          status: 'open',
          priority: 'High',
        });
      });

      expect(addResult).toBe('max_limit_exceeded');
      expect(result.current.tasks).toHaveLength(8); // Task not added
    });

    it('should assign unique id using Date.now()', async () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      const newTask = { title: 'Task', status: 'open' as const, priority: 'Medium' as const };

      await act(async () => {
        result.current.addTask(newTask);
      });

      expect(result.current.tasks[0].id).toBeTruthy();
      expect(typeof result.current.tasks[0].id).toBe('number');
    });

    it('should add task to front of array (newest first)', async () => {
      const existingTask: Task = { id: 1, title: 'Existing', status: 'open', priority: 'High' };
      vi.mocked(storageAdapter.load).mockReturnValue([existingTask]);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      const newTask = { title: 'New', status: 'open' as const, priority: 'Medium' as const };

      await act(async () => {
        result.current.addTask(newTask);
      });

      expect(result.current.tasks).toHaveLength(2);
      expect(result.current.tasks[0].title).toBe('New'); // New task is first
      expect(result.current.tasks[1].title).toBe('Existing');
    });
  });

  // ===== UPDATE TASK TESTS =====

  describe('updateTask()', () => {
    it('should update task fields', async () => {
      const tasks: Task[] = [{ id: 1, title: 'Task 1', status: 'open', priority: 'High' }];
      vi.mocked(storageAdapter.load).mockReturnValue(tasks);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      await act(async () => {
        result.current.updateTask(1, { status: 'done' });
      });

      expect(result.current.tasks[0].status).toBe('done');
      expect(result.current.tasks[0].title).toBe('Task 1'); // Other fields preserved
    });

    it('should update priority field', async () => {
      const tasks: Task[] = [{ id: 1, title: 'Task 1', status: 'open', priority: 'High' }];
      vi.mocked(storageAdapter.load).mockReturnValue(tasks);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      await act(async () => {
        result.current.updateTask(1, { priority: 'Low' });
      });

      expect(result.current.tasks[0].priority).toBe('Low');
    });

    it('should silently do nothing if task not found', async () => {
      const tasks: Task[] = [{ id: 1, title: 'Task 1', status: 'open', priority: 'High' }];
      vi.mocked(storageAdapter.load).mockReturnValue(tasks);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      await act(async () => {
        result.current.updateTask(999, { status: 'done' });
      });

      expect(result.current.tasks[0].status).toBe('open'); // Unchanged
    });
  });

  // ===== DELETE TASK TESTS =====

  describe('deleteTask()', () => {
    it('should remove task by id', async () => {
      const tasks: Task[] = [
        { id: 1, title: 'Task 1', status: 'open', priority: 'High' },
        { id: 2, title: 'Task 2', status: 'open', priority: 'Low' },
      ];
      vi.mocked(storageAdapter.load).mockReturnValue(tasks);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      await act(async () => {
        result.current.deleteTask(1);
      });

      expect(result.current.tasks).toHaveLength(1);
      expect(result.current.tasks[0].id).toBe(2);
    });

    it('should silently do nothing if task not found', async () => {
      const tasks: Task[] = [{ id: 1, title: 'Task 1', status: 'open', priority: 'High' }];
      vi.mocked(storageAdapter.load).mockReturnValue(tasks);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      await act(async () => {
        result.current.deleteTask(999);
      });

      expect(result.current.tasks).toHaveLength(1); // Unchanged
    });
  });

  // ===== AUTO-SAVE & DEBOUNCE TESTS =====

  describe('auto-save and debounce', () => {
    it('should call save() after mutation', async () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      const newTask = { title: 'Task', status: 'open' as const, priority: 'High' as const };

      await act(async () => {
        result.current.addTask(newTask);
      });

      // Wait for debounce (50ms)
      await waitFor(() => {
        expect(storageAdapter.save).toHaveBeenCalled();
      });
    });

    it('should debounce multiple rapid mutations into single save', async () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      await act(async () => {
        result.current.addTask({ title: 'Task 1', status: 'open', priority: 'High' });
        result.current.addTask({ title: 'Task 2', status: 'open', priority: 'Medium' });
        result.current.addTask({ title: 'Task 3', status: 'open', priority: 'Low' });
      });

      // Wait for debounce
      await waitFor(() => {
        expect(storageAdapter.save).toHaveBeenCalledTimes(1);
      });
    });

    it('should save all current tasks', async () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      const newTask = { title: 'Task', status: 'open' as const, priority: 'High' as const };

      await act(async () => {
        result.current.addTask(newTask);
      });

      await waitFor(() => {
        expect(storageAdapter.save).toHaveBeenCalledWith(expect.arrayContaining([expect.objectContaining(newTask)]));
      });
    });
  });

  // ===== STORAGE ERROR TESTS =====

  describe('storageError handling', () => {
    it('should set storageError on save failure', async () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);
      vi.mocked(storageAdapter.save).mockRejectedValue(new Error('Save failed'));

      const { result } = renderHook(() => useTaskPersistence());

      const newTask = { title: 'Task', status: 'open' as const, priority: 'High' as const };

      await act(async () => {
        result.current.addTask(newTask);
      });

      await waitFor(() => {
        expect(result.current.storageError).toBe('Save failed');
      });
    });

    it('should auto-clear storageError on next successful save', async () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);
      vi.mocked(storageAdapter.save)
        .mockRejectedValueOnce(new Error('First save failed'))
        .mockResolvedValueOnce(undefined);

      const { result } = renderHook(() => useTaskPersistence());

      const task1 = { title: 'Task 1', status: 'open' as const, priority: 'High' as const };

      // First mutation: save fails
      await act(async () => {
        result.current.addTask(task1);
      });

      await waitFor(() => {
        expect(result.current.storageError).toBe('First save failed');
      });

      // Second mutation: save succeeds
      const task2 = { title: 'Task 2', status: 'open' as const, priority: 'Medium' as const };

      await act(async () => {
        result.current.addTask(task2);
      });

      await waitFor(() => {
        expect(result.current.storageError).toBeNull();
      });
    });

    it('should use error message from thrown Error', async () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);
      vi.mocked(storageAdapter.save).mockRejectedValue(new Error('Quota exceeded'));

      const { result } = renderHook(() => useTaskPersistence());

      await act(async () => {
        result.current.addTask({ title: 'Task', status: 'open', priority: 'High' });
      });

      await waitFor(() => {
        expect(result.current.storageError).toBe('Quota exceeded');
      });
    });
  });

  // ===== CLEANUP TESTS =====

  describe('cleanup on unmount', () => {
    it('should clear debounce timer on unmount', async () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);
      vi.mocked(storageAdapter.save).mockResolvedValue(undefined);

      const { result, unmount } = renderHook(() => useTaskPersistence());

      const newTask = { title: 'Task', status: 'open' as const, priority: 'High' as const };

      await act(async () => {
        result.current.addTask(newTask);
      });

      // Unmount before debounce completes
      unmount();

      // Verify cleanup doesn't cause errors
      expect(() => unmount()).not.toThrow();
    });
  });

  // ===== CUSTOM STORAGE KEY TESTS =====

  describe('custom storage key', () => {
    it('should accept custom storageKey parameter', () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);

      renderHook(() => useTaskPersistence('customKey'));

      expect(storageAdapter.load).toHaveBeenCalled();
    });

    it('should use default storageKey if not provided', () => {
      vi.mocked(storageAdapter.load).mockReturnValue([]);

      renderHook(() => useTaskPersistence());

      expect(storageAdapter.load).toHaveBeenCalled();
    });
  });
});
