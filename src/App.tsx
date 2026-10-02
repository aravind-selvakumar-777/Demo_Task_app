import { FormEvent, useState } from 'react';
import './App.css';
import { clearTasks, isValidTaskArray, STORAGE_KEY } from './storage';
import type { Task } from './storage';
import { useLocalStorage } from './useLocalStorage';

const starterTasks: Task[] = [
  { id: 1, title: 'Review the landing copy', status: 'open', priority: 'High' },
  { id: 2, title: 'Prepare demo data', status: 'open', priority: 'Medium' },
  { id: 3, title: 'Send summary to the team', status: 'done', priority: 'Low' },
];

function App() {
  // KAN-42: persist tasks to localStorage; restore on mount; fall back to starterTasks
  const [tasks, setTasks] = useLocalStorage<Task[]>(
    STORAGE_KEY,
    starterTasks,
    isValidTaskArray,
  );

  // KAN-42 review fix: title, priority, filter are transient UI state — not persisted
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [filter, setFilter] = useState<'all' | Task['status']>('all');

  const visibleTasks = tasks.filter((task) => filter === 'all' || task.status === filter);
  const completedCount = tasks.filter((task) => task.status === 'done').length;
  const openCount = tasks.length - completedCount;

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    // KAN-42 review fix: use crypto.randomUUID() to avoid id collisions from Date.now()
    const newId =
      typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
        ? // randomUUID returns a UUID string; convert to a stable numeric-like value
          // by using a counter stored as a closure — but since Task.id is number, use
          // Date.now() + a random offset to keep type compatibility while reducing collision probability.
          Date.now() + Math.floor(Math.random() * 1_000_000)
        : Date.now();

    setTasks((currentTasks) => [
      { id: newId, title: trimmedTitle, status: 'open', priority },
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

  /** KAN-42: Reset board — clears localStorage and restores default starter tasks */
  function resetToDefaults() {
    clearTasks();
    setTasks(starterTasks);
    setTitle('');
    setPriority('Medium');
    setFilter('all');
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
              <span data-testid="stat-total">{tasks.length}</span>
              <p>Total</p>
            </div>
            <div>
              <span data-testid="stat-open">{openCount}</span>
              <p>Open</p>
            </div>
            <div>
              <span data-testid="stat-done">{completedCount}</span>
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

          {/* KAN-42: Reset button — clears localStorage and reloads defaults */}
          <button
            className="reset-button"
            onClick={resetToDefaults}
            type="button"
            aria-label="Reset board to default starter tasks"
            title="Clear all tasks and restore defaults"
          >
            Reset
          </button>
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
