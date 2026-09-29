import type { FilterOption, Task, TaskPriority, TaskStatus } from '../types';
import { readRaw, writeRaw } from './browserStorage';

export const TASKS_STORAGE_KEY = 'task-board:tasks';
export const FILTER_STORAGE_KEY = 'task-board:filter';

const TASK_STATUSES: readonly TaskStatus[] = ['open', 'done'];
const TASK_PRIORITIES: readonly TaskPriority[] = ['Low', 'Medium', 'High'];
const FILTER_OPTIONS: readonly FilterOption[] = ['all', 'open', 'done'];

/**
 * True only if `value` is a well-formed `Task`: all four required fields
 * present, correctly typed, and (for `status`/`priority`) within their
 * supported enumerations. Per FR-008.
 */
export function isValidTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'number' &&
    Number.isFinite(candidate.id) &&
    typeof candidate.title === 'string' &&
    typeof candidate.status === 'string' &&
    TASK_STATUSES.includes(candidate.status as TaskStatus) &&
    typeof candidate.priority === 'string' &&
    TASK_PRIORITIES.includes(candidate.priority as TaskPriority)
  );
}

/**
 * True only if `value` is an array where every entry passes `isValidTask`
 * AND every `id` in the array is unique. Validation is all-or-nothing per
 * collection (FR-008/FR-009): a single bad entry, or any duplicate `id`,
 * invalidates the whole array rather than yielding a partially repaired
 * list (design-review Finding 1).
 */
export function isValidTaskArray(value: unknown): value is Task[] {
  if (!Array.isArray(value)) {
    return false;
  }

  if (!value.every((item) => isValidTask(item))) {
    return false;
  }

  const tasks = value as Task[];
  const seenIds = new Set<number>();
  for (const task of tasks) {
    if (seenIds.has(task.id)) {
      return false;
    }
    seenIds.add(task.id);
  }

  return true;
}

/** True only if `value` is one of the supported filter values. Per FR-008. */
export function isValidFilter(value: unknown): value is FilterOption {
  return typeof value === 'string' && FILTER_OPTIONS.includes(value as FilterOption);
}

/**
 * Reads and validates the persisted task list. Returns `[]` on any failure:
 * missing key, unparseable JSON, non-array shape, an invalid entry, or a
 * duplicate `id` (FR-007/FR-008/FR-009).
 */
export function loadTasks(): Task[] {
  const raw = readRaw(TASKS_STORAGE_KEY);

  if (raw === null) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return isValidTaskArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/** Persists the given task list. Failures are swallowed silently (FR-010). */
export function saveTasks(tasks: Task[]): void {
  writeRaw(TASKS_STORAGE_KEY, JSON.stringify(tasks));
}

/**
 * Reads and validates the persisted filter value. Returns `'all'` on any
 * failure (FR-006/FR-008/FR-009).
 */
export function loadFilter(): FilterOption {
  const raw = readRaw(FILTER_STORAGE_KEY);

  if (raw === null) {
    return 'all';
  }

  try {
    const parsed = JSON.parse(raw);
    return isValidFilter(parsed) ? parsed : 'all';
  } catch {
    return 'all';
  }
}

/** Persists the given filter value. Failures are swallowed silently (FR-010). */
export function saveFilter(filter: FilterOption): void {
  writeRaw(FILTER_STORAGE_KEY, JSON.stringify(filter));
}
