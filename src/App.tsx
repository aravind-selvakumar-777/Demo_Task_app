import { FormEvent, useEffect, useState } from 'react';
import './App.css';
import { readTasksFromStorage, Task, writeTasksToStorage } from './storage/tasksStorage';

type TaskFilter = 'all' | Task['status'];

const starterTasks: Task[] = [
  { id: 1, title: 'Review the landing copy', status: 'open', priority: 'High' },
  { id: 2, title: 'Prepare demo data', status: 'open', priority: 'Medium' },
  { id: 3, title: 'Send summary to the team', status: 'done', priority: 'Low' },
];

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => readTasksFromStorage() ?? starterTasks);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [filter, setFilter] = useState<TaskFilter>('all');

  useEffect(() => {
    // Ensure default starter tasks are persisted once per fresh load.
    // This is required so that refresh restores the same list.
    writeTasksToStorage(tasks);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const visibleTasks = tasks.filter((task) => filter === 'all' || task.status === filter);
  const completedCount = tasks.filter((task) => task.status === 'done').length;
  const openCount = tasks.length - completedCount;

  function addTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmedTitle = title.trim();

    if (!trimmedTitle) {
      return;
    }

    setTasks((currentTasks) => {
      const nextTasks: Task[] = [
        { id: Date.now(), title: trimmedTitle, status: 'open', priority },
        ...currentTasks,
      ];
      writeTasksToStorage(nextTasks);
      return nextTasks;
    });

    setTitle('');
    setPriority('Medium');
  }

  function toggleTask(taskId: number) {
    setTasks((currentTasks) => {
      const nextTasks: Task[] = currentTasks.map((task) =>
        task.id === taskId
          ? { ...task, status: task.status === 'open' ? ('done' as const) : ('open' as const) }
          : task,
      );
      writeTasksToStorage(nextTasks);
      return nextTasks;
    });
  }

  function deleteTask(taskId: number) {
    setTasks((currentTasks) => {
      const nextTasks = currentTasks.filter((task) => task.id !== taskId);
      writeTasksToStorage(nextTasks);
      return nextTasks;
    });
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
            <input value={title} onChange={(event) => setTitle(event.target.value)} placeholder="Add a task" />
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
