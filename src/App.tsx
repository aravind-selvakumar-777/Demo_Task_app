import { FormEvent } from 'react';
import './App.css';
import { useLocalStorageState } from './hooks/useLocalStorageState';

type Task = {
  id: number;
  title: string;
  status: 'open' | 'done';
  priority: 'Low' | 'Medium' | 'High';
};

type Filter = 'all' | Task['status'];

const STORAGE_KEYS = {
  tasks: 'demo-task-board-tasks',
  filter: 'demo-task-board-filter',
} as const;

const starterTasks: Task[] = [
  { id: 1, title: 'Review the landing copy', status: 'open', priority: 'High' },
  { id: 2, title: 'Prepare demo data', status: 'open', priority: 'Medium' },
  { id: 3, title: 'Send summary to the team', status: 'done', priority: 'Low' },
];

function isTask(value: unknown): value is Task {
  if (!value || typeof value !== 'object') {
    return false;
  }

  const task = value as Record<string, unknown>;
  return (
    typeof task.id === 'number' &&
    typeof task.title === 'string' &&
    (task.status === 'open' || task.status === 'done') &&
    (task.priority === 'Low' || task.priority === 'Medium' || task.priority === 'High')
  );
}

function isTaskArray(value: unknown): value is Task[] {
  return Array.isArray(value) && value.every(isTask);
}

function isFilter(value: unknown): value is Filter {
  return value === 'all' || value === 'open' || value === 'done';
}

function App() {
  const [tasks, setTasks] = useLocalStorageState<Task[]>(STORAGE_KEYS.tasks, starterTasks, {
    validate: isTaskArray,
  });

  const [title, setTitle] = useLocalStorageState<string>('demo-task-board-draft-title', '');
  const [priority, setPriority] = useLocalStorageState<Task['priority']>(
    'demo-task-board-draft-priority',
    'Medium',
    {
      validate: (value: unknown): value is Task['priority'] =>
        value === 'Low' || value === 'Medium' || value === 'High',
    },
  );

  const [filter, setFilter] = useLocalStorageState<Filter>(STORAGE_KEYS.filter, 'all', {
    validate: isFilter,
  });

  const visibleTasks = tasks.filter((task) => filter === 'all' || task.status === filter);
  const completedCount = tasks.filter((task) => task.status === 'done').length;
  const openCount = tasks.length - completedCount;

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    setTasks((currentTasks) => [
      { id: Date.now(), title: trimmedTitle, status: 'open', priority },
      ...currentTasks,
    ]);
    setTitle('');
    setPriority('Medium');
  }

  function toggleTask(taskId: number) {
    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === 'open' ? 'done' : 'open' }
          : task,
      ),
    );
  }

  function deleteTask(taskId: number) {
    setTasks((currentTasks) => currentTasks.filter((task) => task.id !== taskId));
  }

  return (
    <main className="app-shell">
      <section className="workspace-panel" aria-labelledby="app-title">
        <div className="hero-row">
          <div>
            <p className="eyebrow">Sample web app</p>
            <h1 id="app-title">Task Board</h1>
            <p className="subtitle">Capture a few work items, mark progress, and keep the list tidy.</p>
          </div>

          <div className="stats-grid" aria-label="Task statistics">
            <div>
              <span>{tasks.length}</span>
              <p>Total</p>
            </div>
            <div>
              <span>{openCount}</span>
              <p>Open</p>
            </div>
            <div>
              <span>{completedCount}</span>
              <p>Done</p>
            </div>
          </div>
        </div>

        <form className="task-form" onSubmit={addTask}>
          <label>
            <span>Task name</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="Add a task"
            />
          </label>

          <label>
            <span>Priority</span>
            <select value={priority} onChange={(event) => setPriority(event.target.value as Task['priority'])}>
              <option>Low</option>
              <option>Medium</option>
              <option>High</option>
            </select>
          </label>

          <button type="submit">Add task</button>
        </form>

        <div className="toolbar" aria-label="Task filters">
          {(['all', 'open', 'done'] as const).map((option) => (
            <button
              className={filter === option ? 'active' : ''}
              key={option}
              onClick={() => setFilter(option)}
              type="button"
            >
              {option}
            </button>
          ))}
        </div>

        <div className="task-list" aria-live="polite">
          {visibleTasks.length > 0 ? (
            visibleTasks.map((task) => (
              <article className={`task-card ${task.status}`} key={task.id}>
                <button
                  aria-label={`${task.status === 'done' ? 'Reopen' : 'Complete'} ${task.title}`}
                  className="status-toggle"
                  onClick={() => toggleTask(task.id)}
                  type="button"
                >
                  {task.status === 'done' ? 'Done' : 'Open'}
                </button>
                <div>
                  <h2>{task.title}</h2>
                  <p>{task.priority} priority</p>
                </div>
                <button className="delete-button" onClick={() => deleteTask(task.id)} type="button">
                  Delete
                </button>
              </article>
            ))
          ) : (
            <p className="empty-state">No tasks match this filter.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
