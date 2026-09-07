/**
 * Task.ts - Core task domain types and storage schema
 *
 * Defines the Task type and storage payload format. Only tasks with a priority
 * field are persisted; priority is required at creation time.
 */

/**
 * Represents a single task in the task board.
 *
 * @property id - Unique identifier (e.g., Date.now()), used for updates and deletes
 * @property title - Non-empty task description (1-50 characters after trim)
 * @property status - Current task state: 'open' or 'done'
 * @property priority - Priority level; required for persistence. One of: 'Low', 'Medium', 'High'
 */
export type Task = {
  id: number;
  title: string;
  status: 'open' | 'done';
  priority: 'Low' | 'Medium' | 'High';
};

/**
 * Storage payload format for sessionStorage.
 *
 * Wraps tasks with metadata for versioning and debugging.
 * Allows for future schema evolution.
 *
 * @property version - Schema version string (e.g., "1.0")
 * @property timestamp - Unix timestamp (ms) when data was last saved
 * @property tasks - Array of up to 8 tasks
 */
export interface StoragePayload {
  version: string;
  timestamp: number;
  tasks: Task[];
}
