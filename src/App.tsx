import { FormEvent, useEffect, useMemo, useState } from 'react';
import './App.css';

type Task = {
  id: number;
  title: string;
  status: 'open' | 'done';
  priority: 'Low' | 'Medium' | 'High';
};

type EditingState = {
  taskId: number;
  title: string;
  priority: Task['priority'];
  error?: string;
};

const STORAGE_KEY = 'demo_task_app.tasks';

const starterTasks: Task[] = [
  { id: 1, title: 'Review the landing copy', status: 'open', priority: 'High' },
  { id: 2, title: 'Prepare demo data', status: 'open', priority: 'Medium' },
  { id: 3, title: 'Send summary to the team', status: 'done', priority: 'Low' },
];

function loadTasksFromStorage(): Task[] | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return null;

    const isTask = (value: any): value is Task =>
      value &&
      typeof value.id === 'number' &&
      typeof value.title === 'string' &&
      (value.status === 'open' || value.status === 'done') &&
      (value.priority === 'Low' || value.priority === 'Medium' || value.priority === 'High');

    const tasks = parsed.filter(isTask);
    return tasks.length > 0 ? tasks : [];
  } catch {
    return null;
  }
}

function saveTasksToStorage(tasks: Task[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function App() {
  const [tasks, setTasks] = useState<Task[]>(() => loadTasksFromStorage() ?? starterTasks);
  const [title, setTitle] = useState('');
  const [priority, setPriority] = useState<Task['priority']>('Medium');
  const [filter, setFilter] = useState<'all' | Task['status']>('all');

  const [editing, setEditing] = useState<EditingState | null>(null);

  useEffect(() => {
    saveTasksToStorage(tasks);
  }, [tasks]);

  const visibleTasks = useMemo(
    () => tasks.filter((task) => filter === 'all' || task.status === filter),
    [tasks, filter],
  );

  const completedCount = useMemo(
    () => tasks.filter((task) => task.status === 'done').length,
    [tasks],
  );

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
    setEditing((current) => (current?.taskId === taskId ? null : current));
  }

  function beginEdit(task: Task) {
    // Only one task can be edited at a time. Switching discards unsaved changes.
    setEditing({ taskId: task.id, title: task.title, priority: task.priority });
  }

  function cancelEdit() {
    setEditing(null);
  }

  function validateEditingTitle(nextTitle: string): string | undefined {
    if (!nextTitle.trim()) return 'Title cannot be empty';
    return undefined;
  }

  function updateEditingTitle(nextTitle: string) {
    setEditing((current) => {
      if (!current) return current;
      return { ...current, title: nextTitle, error: undefined };
    });
  }

  function updateEditingPriority(nextPriority: Task['priority']) {
    setEditing((current) => {
      if (!current) return current;
      return { ...current, priority: nextPriority };
    });
  }

  function saveEdit() {
    if (!editing) return;

    const error = validateEditingTitle(editing.title);
    if (error) {
      setEditing((current) => (current ? { ...current, error } : current));
      return;
    }

    const trimmedTitle = editing.title.trim();

    setTasks((currentTasks) =>
      currentTasks.map((task) =>
        task.id === editing.taskId
          ? { ...task, title: trimmedTitle, priority: editing.priority }
          : task,
      ),
    );

    setEditing(null);
  }

  function onEditingKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      cancelEdit();
      return;
    }

    if (event.key === 'Enter') {
      event.preventDefault();
      saveEdit();
    }
  }

  return (
    <main className="app-shell">
      <section className="workspace-panel" aria-labelledby="app-title">
        <div className="hero-row">
          <div>
            <p className="eyebrow">Sample web app</p>
            <h1 id="app-title">Task Board</h1>
            <p className="subtitle">
              Capture a few work items, mark progress, and keep the list tidy.
            </p>
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
            <select
              value={priority}
              onChange={(event) =>
                setPriority(event.target.value as Task['priority'])
              }
            >
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
            visibleTasks.map((task) => {
              const isEditing = editing?.taskId === task.id;

              return (
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
                    {isEditing ? (
                      <div className="inline-editor" aria-label="Edit task">
                        <label>
                          <span className="sr-only">Title</span>
                          <input
                            aria-label="Edit title"
                            autoFocus
                            value={editing.title}
                            onChange={(e) => updateEditingTitle(e.target.value)}
                            onKeyDown={onEditingKeyDown}
                          />
                        </label>

                        {editing.error ? (
                          <p role="alert" className="inline-error">
                            {editing.error}
                          </p>
                        ) : null}

                        <label>
                          <span className="sr-only">Priority</span>
                          <select
                            aria-label="Edit priority"
                            value={editing.priority}
                            onChange={(e) =>
                              updateEditingPriority(
                                e.target.value as Task['priority'],
                              )
                            }
                            onKeyDown={onEditingKeyDown}
                          >
                            <option>Low</option>
                            <option>Medium</option>
                            <option>High</option>
                          </select>
                        </label>

                        <div className="inline-actions">
                          <button type="button" onClick={saveEdit}>
                            Save
                          </button>
                          <button type="button" onClick={cancelEdit}>
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h2
                          onDoubleClick={() => beginEdit(task)}
                          title="Double-click to edit"
                        >
                          {task.title}
                        </h2>
                        <p>{task.priority} priority</p>
                      </>
                    )}
                  </div>

                  <div className="card-actions">
                    {!isEditing ? (
                      <button
                        type="button"
                        onClick={() => beginEdit(task)}
                        aria-label={`Edit ${task.title}`}
                      >
                        Edit
                      </button>
                    ) : null}

                    <button
                      className="delete-button"
                      onClick={() => deleteTask(task.id)}
                      type="button"
                    >
                      Delete
                    </button>
                  </div>
                </article>
              );
            })
          ) : (
            <p className="empty-state">No tasks match this filter.</p>
          )}
        </div>
      </section>
    </main>
  );
}

export default App;
