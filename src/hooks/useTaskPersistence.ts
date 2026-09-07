/**
 * useTaskPersistence.ts - Custom React hook for task state and auto-save
 *
 * Manages task state, auto-save logic with debouncing, and error handling.
 * Bridges UI (App.tsx) and persistence layer (SessionStorageAdapter).
 *
 * Design notes:
 * - Synchronous load on mount (via useEffect)
 * - Debounced auto-save (50ms) batches rapid mutations
 * - addTask returns specific status strings ('success', 'max_limit_exceeded', 'priority_required')
 * - storageError auto-clears on next successful save
 * - Debounce cleanup on unmount prevents orphan timers
 */

import { useState, useEffect, useRef } from 'react';
import { Task } from '../types/Task';
import { storageAdapter } from '../services/SessionStorageAdapter';

/**
 * Return type for useTaskPersistence hook.
 *
 * @property tasks - Current array of tasks (up to 8)
 * @property addTask - Function to create new task; returns status code
 * @property updateTask - Function to update existing task fields
 * @property deleteTask - Function to remove task by id
 * @property storageError - Error message from last failed save, or null if OK
 */
export type UseTaskPersistenceReturn = {
  tasks: Task[];
  addTask: (task: Omit<Task, 'id'>) => 'success' | 'max_limit_exceeded' | 'priority_required';
  updateTask: (id: number, updates: Partial<Task>) => void;
  deleteTask: (id: number) => void;
  storageError: string | null;
};

/**
 * Custom hook for task state management and automatic persistence.
 *
 * Lifecycle:
 * 1. Mount: Synchronously load tasks from sessionStorage
 * 2. On tasks change: Debounce 50ms, then call save()
 * 3. Unmount: Cleanup debounce timer
 *
 * Storage errors are logged and communicated via storageError state,
 * which auto-clears on next successful save.
 *
 * @param storageKey - sessionStorage key (default: 'taskBoardData')
 * @returns Object with tasks, mutations, and error state
 *
 * @example
 *   const { tasks, addTask, updateTask, deleteTask, storageError } = useTaskPersistence();
 *   const result = addTask({ title: 'New task', status: 'open', priority: 'High' });
 *   if (result === 'success') { ... } else if (result === 'max_limit_exceeded') { ... }
 */
export function useTaskPersistence(storageKey: string = 'taskBoardData'): UseTaskPersistenceReturn {
  const [tasks, setTasks] = useState<Task[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  /**
   * Effect: On mount, synchronously load tasks from sessionStorage.
   * Runs once (empty dependency array) to hydrate state.
   */
  useEffect(() => {
    const loadedTasks = storageAdapter.load();
    setTasks(loadedTasks);
  }, []);

  /**
   * Effect: On tasks change, debounce and auto-save.
   *
   * - Clears previous timer if rapid mutations occur
   * - Schedules save after 50ms of inactivity
   * - On success: auto-clears storageError
   * - On failure: sets storageError message
   * - Cleanup: Clears timer on unmount (prevents orphan saves)
   */
  useEffect(() => {
    // Clear existing timer for debounce
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Schedule save after 50ms delay
    debounceTimerRef.current = setTimeout(async () => {
      try {
        await storageAdapter.save(tasks);
        setStorageError(null); // Auto-clear on successful save
      } catch (error) {
        // Set error message for UI to display
        setStorageError((error as Error).message || 'Storage save failed');
      }
    }, 50); // 50ms debounce to batch rapid mutations

    // Cleanup: Clear timer on unmount or before next effect runs
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [tasks]);

  /**
   * Create a new task with auto-save.
   *
   * Validation:
   * - Returns 'priority_required' if priority is missing
   * - Returns 'max_limit_exceeded' if 8 tasks already exist
   * - Returns 'success' on creation and triggers auto-save
   *
   * Task is assigned a unique id using Date.now().
   * New task is added to the front of the array.
   *
   * @param task - Task data (without id)
   * @returns Status string: 'success', 'max_limit_exceeded', or 'priority_required'
   */
  const addTask = (task: Omit<Task, 'id'>): 'success' | 'max_limit_exceeded' | 'priority_required' => {
    // Validate priority is provided
    if (!task.priority) {
      return 'priority_required';
    }

    // Check capacity before creating
    if (!storageAdapter.hasCapacity(tasks.length)) {
      return 'max_limit_exceeded';
    }

    // Create new task with unique id
    const newTask: Task = {
      id: Date.now(),
      ...task,
    };

    // Add to front of array (newest first)
    setTasks((prev) => [newTask, ...prev]);

    return 'success';
  };

  /**
   * Update an existing task's fields.
   *
   * Allows any Partial<Task> update (title, status, priority, etc.).
   * Preserves fields not included in updates.
   * Triggers auto-save.
   *
   * @param id - Task id to update
   * @param updates - Partial task object with fields to update
   */
  const updateTask = (id: number, updates: Partial<Task>): void => {
    setTasks((prev) =>
      prev.map((task) => (task.id === id ? { ...task, ...updates } : task))
    );
  };

  /**
   * Delete a task by id.
   *
   * Silently does nothing if task not found.
   * Triggers auto-save.
   *
   * @param id - Task id to delete
   */
  const deleteTask = (id: number): void => {
    setTasks((prev) => prev.filter((task) => task.id !== id));
  };

  return {
    tasks,
    addTask,
    updateTask,
    deleteTask,
    storageError,
  };
}
