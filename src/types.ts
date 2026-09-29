export type TaskStatus = 'open' | 'done';
export type TaskPriority = 'Low' | 'Medium' | 'High';
export type FilterOption = 'all' | TaskStatus;

export type Task = {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
};
