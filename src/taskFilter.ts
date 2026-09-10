export type TaskStatus = 'open' | 'done';

export type TaskPriority = 'Low' | 'Medium' | 'High';

export type Task = {
  id: number;
  title: string;
  status: TaskStatus;
  priority: TaskPriority;
};

export type TaskStatusFilter = 'all' | TaskStatus;

function normalizeSearchQuery(searchQuery: string): string {
  return searchQuery.trim().toLowerCase();
}

export function getVisibleTasks(
  tasks: Task[],
  statusFilter: TaskStatusFilter,
  searchQuery: string,
): Task[] {
  const normalizedQuery = normalizeSearchQuery(searchQuery);

  return tasks.filter((task) => {
    const matchesStatus = statusFilter === 'all' || task.status === statusFilter;
    const matchesSearch = !normalizedQuery ||
      task.title.toLowerCase().includes(normalizedQuery);
    return matchesStatus && matchesSearch;
  });
}
