export type Task = {
  id: number;
  title: string;
  status: 'open' | 'done';
  priority: 'Low' | 'Medium' | 'High';
};

// Align key with KAN-35 test plan placeholder and keep it stable.
const STORAGE_KEY = 'demo_task_board_tasks';
const STORAGE_VERSION = 1 as const;

type TasksStorageEnvelope = {
  v: typeof STORAGE_VERSION;
  tasks: Task[];
};

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') return false;
  const task = value as Record<string, unknown>;

  return (
    typeof task.id === 'number' &&
    typeof task.title === 'string' &&
    (task.status === 'open' || task.status === 'done') &&
    (task.priority === 'Low' || task.priority === 'Medium' || task.priority === 'High')
  );
}

function isEnvelope(value: unknown): value is TasksStorageEnvelope {
  if (!value || typeof value !== 'object') return false;
  const obj = value as Record<string, unknown>;

  if (obj.v !== STORAGE_VERSION) return false;
  if (!Array.isArray(obj.tasks)) return false;
  return obj.tasks.every(isTask);
}

export function readTasksFromStorage(): Task[] | null {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;

    const parsed: unknown = JSON.parse(raw);
    if (!isEnvelope(parsed)) return null;

    return parsed.tasks;
  } catch {
    return null;
  }
}

export function writeTasksToStorage(tasks: Task[]): void {
  const envelope: TasksStorageEnvelope = { v: STORAGE_VERSION, tasks };

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(envelope));
  } catch {
    // Swallow all storage errors (quota exceeded / private mode / disabled storage)
  }
}

export function clearTasksStorage(): void {
  try {
    window.localStorage.removeItem(STORAGE_KEY);
  } catch {
    // ignore
  }
}

export const __tasksStorageInternals = {
  STORAGE_KEY,
  STORAGE_VERSION,
};
