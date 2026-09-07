import { FormEvent, useState } from 'react';
import './App.css';
import { useTaskPersistence } from './hooks/useTaskPersistence';
import { Task } from './types/Task';

function App() {
  // Task state management and auto-persistence
  const { tasks, addTask, updateTask, deleteTask, storageError } = useTaskPersistence();

  // Local form state
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [filter, setFilter] = useState<'all' | Task['status']>('all');
  const [addError, setAddError] = useState<string | null>(null);

  const visibleTasks = tasks.filter((task) => filter === 'all' || task.status === filter);
  const completedCount = tasks.filter((task) => task.status === 'done').length;
  const openCount = tasks.length - completedCount;

  function handleAddTask(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setAddError(null);

    const trimmedTitle = title.trim();
    if (!trimmedTitle) {
      setAddError('Task title is required');
      return;
    }

    // Call hook's addTask with new task data
    const result = addTask({
      title: trimmedTitle,
      status: 'open',
      priority,
    });

    // Handle result codes from hook
    if (result === 'success') {
      // Clear form on successful creation
      setTitle('');
      setPriority('Medium');
    } else if (result === 'max_limit_exceeded') {
      setAddError('Maximum 8 tasks reached. Delete a task to add more.');
    } else if (result === 'priority_required') {
      setAddError('Priority is required');
    }
  }

  function toggleTask(taskId: number) {
    updateTask(taskId, { status: tasks.find(t => t.id === taskId)?.status === 'open' ? 'done' : 'open' });
  }

  return (
    <main className="app-shell">
      <section className="workspace-panel" aria-labelledby="app-title">
        {/* Storage error notification */}
        {storageError && (
          <div className="error-banner" role="alert">
            <span>⚠️ Persistence error: {storageError}</span>
            <span> Data is saved in memory only.</span>
          </div>
        )}

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

        <form className="task-form" onSubmit={handleAddTask}>
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

          {/* Form validation error */}
          {addError && <div className="form-error">{addError}</div>}
        </form>

        {/* Max tasks warning */}
        {tasks.length === 8 && (
          <div className="info-banner" role="status">
            ℹ️ Maximum 8 tasks reached. Delete a task to add more.
          </div>
        )}

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