/**
 * SessionStorageAdapter.ts - Persistence layer for sessionStorage operations
 *
 * Stateless adapter that encapsulates all sessionStorage access, serialization,
 * error handling, and validation. Provides synchronous load and async save.
 *
 * Design notes:
 * - load() is synchronous; sessionStorage is synchronous by design
 * - save() is async for consistency and testability
 * - Priority filtering happens on load to enforce the invariant that only
 *   tasks with priority are restored
 * - save() is dumb: it does not validate or filter; the hook validates at creation time
 * - Graceful degradation: errors are logged but never thrown from load();
 *   save() throws for hook to catch and handle
 */

import { Task, StoragePayload } from '../types/Task';

/**
 * Manages all sessionStorage operations for task persistence.
 *
 * Usage:
 *   const adapter = new SessionStorageAdapter('taskBoardData');
 *   const tasks = adapter.load(); // Synchronous restore
 *   await adapter.save(tasks);    // Async persist
 *   if (adapter.hasCapacity(tasks.length)) { ... }
 *   adapter.clear();              // Clear storage
 */
export class SessionStorageAdapter {
  private storageKey: string;

  /**
   * @param storageKey - localStorage key for persisting tasks (default: 'taskBoardData')
   */
  constructor(storageKey: string = 'taskBoardData') {
    this.storageKey = storageKey;
  }

  /**
   * Synchronously restore tasks from sessionStorage.
   *
   * - Filters out tasks without a priority field (enforces invariant)
   * - Caps returned array at 8 tasks
   * - Returns empty array on parse error (graceful degradation)
   * - Logs errors to console for debugging
   *
   * @returns Task array, possibly empty
   * @throws Never; catches and logs all errors internally
   */
  load(): Task[] {
    try {
      const raw = sessionStorage.getItem(this.storageKey);
      if (!raw) {
        return [];
      }

      const payload: StoragePayload = JSON.parse(raw);
      if (!Array.isArray(payload.tasks)) {
        console.error('Invalid storage payload: tasks is not an array');
        return [];
      }

      // Filter: only tasks with priority field (enforce invariant on restore)
      const filtered = payload.tasks.filter((task: unknown) => {
        const t = task as Record<string, unknown>;
        return t && typeof t === 'object' && t.priority;
      });

      // Cap: max 8 tasks
      return filtered.slice(0, 8) as Task[];
    } catch (error) {
      console.error(`Failed to load tasks from sessionStorage (key: ${this.storageKey}):`, error);
      return [];
    }
  }

  /**
   * Asynchronously persist tasks to sessionStorage.
   *
   * - Serializes tasks to StoragePayload (version, timestamp, tasks)
   * - Caps at 8 tasks before save (safeguard)
   * - Throws on serialization or quota errors for hook to catch
   * - Logs warnings on quota exceeded
   *
   * @param tasks - Tasks to persist
   * @throws Error if storage fails (quota, serialization)
   */
  async save(tasks: Task[]): Promise<void> {
    try {
      const payload: StoragePayload = {
        version: '1.0',
        timestamp: Date.now(),
        tasks: tasks.slice(0, 8), // Safeguard: cap at 8
      };

      const serialized = JSON.stringify(payload);
      sessionStorage.setItem(this.storageKey, serialized);
    } catch (error) {
      // Detect quota exceeded (different across browsers)
      if (
        error instanceof DOMException &&
        (error.code === 22 || // QuotaExceededError
          error.code === 1014 || // NS_ERROR_DOM_QUOTA_REACHED (Firefox)
          error.name === 'QuotaExceededError' ||
          error.name === 'NS_ERROR_DOM_QUOTA_REACHED')
      ) {
        console.warn(`sessionStorage quota exceeded (key: ${this.storageKey}); tasks persisted in memory only`);
      } else {
        console.error(`Failed to save tasks to sessionStorage (key: ${this.storageKey}):`, error);
      }
      throw new Error('Storage save failed');
    }
  }

  /**
   * Check if adding a new task would exceed the 8-task limit.
   *
   * @param currentCount - Current number of tasks
   * @returns true if currentCount < 8 (room for another task), false otherwise
   */
  hasCapacity(currentCount: number): boolean {
    return currentCount < 8;
  }

  /**
   * Clear all persisted tasks from sessionStorage.
   *
   * Catches and logs errors; never throws.
   */
  clear(): void {
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch (error) {
      console.error(`Failed to clear sessionStorage (key: ${this.storageKey}):`, error);
    }
  }
}

/**
 * Singleton instance for use throughout the app.
 * All modules should import and use this instance to ensure single source of truth.
 */
export const storageAdapter = new SessionStorageAdapter('taskBoardData');
