/**
 * Local Storage persistence utilities for the Task Board (KAN-30).
 *
 * Stores the full task list as a single, versioned JSON payload under the
 * key `task_board.tasks.v1`. All access is wrapped in try/catch so that a
 * missing, disabled, or corrupted Local Storage never crashes the app -
 * callers should fall back to default/in-memory data whenever these
 * functions signal "no usable data" (i.e. return `null`).
 */

export type TaskStatus = 'open' | 'done';
export type TaskPriority = 'Low' | 'Medium' | 'High';

export type Task = {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
};

export const TASKS_STORAGE_KEY = 'task_board.tasks.v1';
export const TASKS_SCHEMA_VERSION = 1;

type TasksPayload = {
  version: number;
  updatedAt: string;
  tasks: Task[];
};

const VALID_STATUSES: TaskStatus[] = ['open', 'done'];
const VALID_PRIORITIES: TaskPriority[] = ['Low', 'Medium', 'High'];

function isDevEnvironment(): boolean {
  try {
    return Boolean(import.meta.env?.DEV);
  } catch {
    return false;
  }
}

function logDiagnostic(message: string, details?: unknown): void {
  if (isDevEnvironment()) {
    // eslint-disable-next-line no-console
    console.warn(`[task_board/storage] ${message}`, details ?? '');
  }
}

function isValidTask(value: unknown): value is Task {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    typeof candidate.id === 'number' &&
    Number.isFinite(candidate.id) &&
    typeof candidate.title === 'string' &&
    candidate.title.trim().length > 0 &&
    typeof candidate.status === 'string' &&
    VALID_STATUSES.includes(candidate.status as TaskStatus) &&
    typeof candidate.priority === 'string' &&
    VALID_PRIORITIES.includes(candidate.priority as TaskPriority)
  );
}

function isValidPayload(value: unknown): value is TasksPayload {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const candidate = value as Record<string, unknown>;

  return (
    candidate.version === TASKS_SCHEMA_VERSION &&
    Array.isArray(candidate.tasks) &&
    candidate.tasks.every(isValidTask)
  );
}

function getStorage(): Storage | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) {
      return null;
    }

    // Probe for availability (private mode / disabled storage can throw).
    const probeKey = '__task_board_storage_probe__';
    window.localStorage.setItem(probeKey, '1');
    window.localStorage.removeItem(probeKey);

    return window.localStorage;
  } catch (error) {
    logDiagnostic('Local Storage is not available, falling back to defaults.', error);
    return null;
  }
}

/**
 * Loads persisted tasks from Local Storage.
 *
 * Returns `null` when:
 * - Local Storage is unavailable.
 * - No payload has been saved yet (AC3 - use defaults).
 * - The saved payload is corrupted JSON.
 * - The saved payload does not match the expected schema/version.
 */
export function loadTasks(): Task[] | null {
  const storage = getStorage();

  if (!storage) {
    return null;
  }

  const raw = storage.getItem(TASKS_STORAGE_KEY);

  if (raw === null) {
    logDiagnostic('No saved tasks found, using defaults.');
    return null;
  }

  let parsed: unknown;

  try {
    parsed = JSON.parse(raw);
  } catch (error) {
    logDiagnostic('Failed to parse saved tasks JSON, using defaults.', error);
    return null;
  }

  if (!isValidPayload(parsed)) {
    logDiagnostic('Saved tasks payload failed schema validation, using defaults.', parsed);
    return null;
  }

  logDiagnostic(`Loaded ${parsed.tasks.length} task(s) from Local Storage.`);
  return parsed.tasks;
}

/**
 * Persists the given task list to Local Storage as a versioned payload.
 * Silently no-ops (with a dev-only warning) if storage is unavailable or
 * the write fails (e.g. quota exceeded).
 */
export function saveTasks(tasks: Task[]): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  const payload: TasksPayload = {
    version: TASKS_SCHEMA_VERSION,
    updatedAt: new Date().toISOString(),
    tasks,
  };

  try {
    storage.setItem(TASKS_STORAGE_KEY, JSON.stringify(payload));
  } catch (error) {
    logDiagnostic('Failed to save tasks to Local Storage (e.g. quota exceeded).', error);
  }
}

/**
 * Removes any persisted task payload. Useful for dev/testing/reset flows.
 */
export function clearTasks(): void {
  const storage = getStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(TASKS_STORAGE_KEY);
  } catch (error) {
    logDiagnostic('Failed to clear tasks from Local Storage.', error);
  }
}
