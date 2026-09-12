import { FormEvent, useEffect, useState } from 'react';
import './App.css';
import { loadTasks, saveTasks } from './utils/storage';
import type { Task } from './utils/storage';
import { starterTasks } from './fixtures/starterTasks';

function getInitialTasks(): Task[] {
  const persistedTasks = loadTasks();
  return persistedTasks ?? starterTasks;
}

/**
 * Returns a task id guaranteed not to collide with any id already present in
 * `existingTasks`. `Date.now()` alone is not collision-safe: two tasks
 * created within the same millisecond (plausible under fast scripted use or
 * a double-submit) would receive the same id, and that collision would then
 * be persisted to and silently restored from Local Storage - see
 * review.md Finding #4.
 */
function getNextTaskId(existingTasks: Task[]): number {
  const maxExistingId = existingTasks.reduce((max, task) => Math.max(max, task.id), 0);
  return Math.max(Date.now(), maxExistingId + 1);
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(getInitialTasks);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [filter, setFilter] = useState<'all' | Task['status']>('all');

  const visibleTasks = tasks.filter((task) => filter === 'all' || task.status === filter);
  const completedCount = tasks.filter((task) => task.status === 'done').length;
  const openCount = tasks.length - completedCount;

  useEffect(() => {
    saveTasks(tasks);
  }, [tasks]);

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    setTasks((currentTasks) => [
      { id: getNextTaskId(currentTasks), title: trimmedTitle, status: 'open', priority },
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
