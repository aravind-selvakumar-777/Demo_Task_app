/**
 * storage.ts
 * Utility functions for persisting tasks to browser localStorage (KAN-42).
 * All operations complete synchronously and within 50ms for UI responsiveness.
 */

export type Task = {
  id: number;
  title: string;
  status: 'open' | 'done';
  priority: 'Low' | 'Medium' | 'High';
};

export const STORAGE_KEY = 'demo_task_board_tasks';

const VALID_STATUSES = new Set<string>(['open', 'done']);
const VALID_PRIORITIES = new Set<string>(['Low', 'Medium', 'High']);

/**
 * Validate that a value is a well-formed Task array.
 * If corrupted, returns false so the caller can fall back to defaults.
 */
export function isValidTaskArray(value: unknown): value is Task[] {
  if (!Array.isArray(value)) return false;
  return value.every(
    (item) =>
      item !== null &&
      typeof item === 'object' &&
      typeof (item as Record<string, unknown>).id === 'number' &&
      typeof (item as Record<string, unknown>).title === 'string' &&
      VALID_STATUSES.has((item as Record<string, unknown>).status as string) &&
      VALID_PRIORITIES.has((item as Record<string, unknown>).priority as string),
  );
}

/**
 * Persist the task list to localStorage.
 * Silently no-ops if storage is unavailable (e.g. private/incognito mode with
 * quota exhausted) and logs a warning instead.
 */
export function saveTasks(tasks: Task[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch (error) {
    // Storage quota exceeded or unavailable (e.g. private browsing)
    console.warn('[TaskBoard] Could not save tasks to localStorage:', error);
  }
}

/**
 * Load tasks from localStorage.
 * Returns null when no data is stored or the stored data is corrupted,
 * in which case the caller should use the default starter tasks.
 */
export function loadTasks(): Task[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw === null) return null;

    const parsed: unknown = JSON.parse(raw);
    if (isValidTaskArray(parsed)) {
      return parsed;
    }

    // Corrupted data — warn and signal fallback
    console.warn(
      '[TaskBoard] Stored task data is corrupted. Falling back to default starter tasks.',
    );
    return null;
  } catch (error) {
    console.warn('[TaskBoard] Failed to read tasks from localStorage:', error);
    return null;
  }
}

/**
 * Remove all persisted task data from localStorage.
 * Used by the "Reset to defaults" feature.
 */
export function clearTasks(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (error) {
    console.warn('[TaskBoard] Could not clear tasks from localStorage:', error);
  }
}
