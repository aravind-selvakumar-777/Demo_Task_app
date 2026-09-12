# Demo Task Board

Demo Task Board is a compact sample web app built with Vite, React, and TypeScript. It demonstrates a small but complete task-management workflow: add tasks, assign priority, update task status, delete tasks, filter the list, view live task counts, and persist the board across page reloads using the browser's Local Storage.

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Available Scripts](#available-scripts)
- [How to Use the App](#how-to-use-the-app)
- [Application Behavior](#application-behavior)
- [Data Persistence (Local Storage)](#data-persistence-local-storage)
- [Testing](#testing)
- [End-to-End Testing (Playwright)](#end-to-end-testing-playwright)
- [Customization Guide](#customization-guide)
- [Build and Preview](#build-and-preview)
- [Troubleshooting](#troubleshooting)

## Overview

The application is intentionally limited in scope so it is easy to understand, run, and extend. Tasks live in React component state and are automatically saved to the browser's Local Storage, so the board survives page reloads on the same browser/device. This makes it suitable for demos, learning React state management, UI experimentation, or as a starting point for a larger app.

## Features

- Add a task with a title and priority.
- Choose between `Low`, `Medium`, and `High` priority.
- Mark a task as `Open` or `Done`.
- Reopen completed tasks.
- Delete tasks from the board.
- Filter tasks by `all`, `open`, or `done`.
- View live counts for total, open, and completed tasks.
- Persist tasks to Local Storage so the board survives page reloads.
- Responsive layout for desktop and mobile screens.

## Tech Stack

- Vite for fast local development and production builds.
- React for the user interface.
- TypeScript for static typing.
- CSS for responsive layout and visual styling.
- Vitest, React Testing Library, and jsdom for unit and integration tests.

## Project Structure

```text
Demo_app/
├── index.html
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── vitest.config.ts
├── playwright.config.ts
├── e2e/
│   ├── fixtures.ts
│   ├── pages/
│   │   └── task-board.page.ts
│   ├── scenario-01-default-tasks-on-empty-storage.spec.ts
│   ├── scenario-02-created-tasks-persist-after-reload.spec.ts
│   ├── scenario-03-status-updates-persist-after-reload.spec.ts
│   ├── scenario-04-deleted-tasks-do-not-reappear.spec.ts
│   ├── scenario-05-mixed-operations-restore-state.spec.ts
│   ├── scenario-06-stats-consistency-after-reload.spec.ts
│   ├── scenario-07-corrupted-storage-fallback.spec.ts
│   └── scenario-08-no-backend-required.spec.ts
├── playwright-report/
└── src/
    ├── App.css
    ├── App.tsx
    ├── index.css
    ├── main.tsx
    ├── vite-env.d.ts
    ├── __tests__/
    │   └── App.test.tsx
    ├── test/
    │   └── setup.ts
    └── utils/
        ├── storage.ts
        └── __tests__/
            └── storage.test.ts
```

Key files:

- `src/App.tsx` contains the task board UI, state, filters, task actions, and Local Storage hydration/persistence wiring.
- `src/utils/storage.ts` contains the Local Storage persistence module (`loadTasks`, `saveTasks`, `clearTasks`).
- `src/App.css` contains the main application layout and component styling.
- `src/index.css` contains global page styles.
- `src/main.tsx` mounts the React app into the page.
- `vite.config.ts` configures Vite with the React plugin.
- `vitest.config.ts` configures the Vitest test runner (jsdom environment, test setup file).
- `src/test/setup.ts` registers `@testing-library/jest-dom` matchers for tests.
- `playwright.config.ts` configures the Playwright end-to-end suite (browser, base URL, web server, reporters).
- `e2e/pages/task-board.page.ts` is the Page Object Model used by every Playwright scenario.
- `e2e/fixtures.ts` extends the base Playwright test with a `taskBoard` fixture that performs the shared Background steps (open app, clear Local Storage, reload).
- `playwright-report/` contains the generated HTML and JSON reports from the last Playwright run.

## Prerequisites

Install the following before running the app:

- Node.js 18 or later.
- npm, which is included with Node.js.

Check your installed versions:

```bash
node --version
npm --version
```

## Getting Started

Install dependencies:

```bash
npm install
```

Start the development server:

```bash
npm run dev
```

Open the local URL printed by Vite. It is usually:

```text
http://localhost:5173/
```

If you want to bind the dev server to a specific local host, run Vite directly:

```bash
npx vite --host 127.0.0.1
```

## Available Scripts

| Script | Purpose |
| --- | --- |
| `npm run dev` | Starts the Vite development server. |
| `npm run build` | Runs TypeScript checks and creates a production build in `dist/`. |
| `npm run preview` | Serves the production build locally for preview. |
| `npm test` | Runs the unit and integration test suite once (Vitest). |
| `npm run test:watch` | Runs the test suite in watch mode. |
| `npm run test:coverage` | Runs the test suite and prints a coverage report. |
| `npm run test:e2e` | Runs the Playwright end-to-end suite against a production build. |
| `npm run test:e2e:ui` | Runs the Playwright suite in interactive UI mode. |
| `npm run test:e2e:report` | Opens the last generated Playwright HTML report. |

## How to Use the App

1. Enter a task name in the `Task name` field.
2. Select a priority from the `Priority` dropdown.
3. Select `Add task` to add it to the board.
4. Select the `Open` button on a task to mark it done.
5. Select the `Done` button on a completed task to reopen it.
6. Use the `all`, `open`, and `done` filter buttons to change the visible list.
7. Select `Delete` to remove a task.
8. Reload the page at any time — your tasks and stats are restored from Local Storage.

## Application Behavior

Tasks use this shape internally:

```ts
type Task = {
	id: number;
	title: string;
	status: 'open' | 'done';
	priority: 'Low' | 'Medium' | 'High';
};
```

Current behavior:

- New tasks are inserted at the top of the list.
- Empty task names are ignored.
- Newly added tasks start with `open` status.
- The priority field resets to `Medium` after adding a task.
- Task statistics update automatically after add, complete, reopen, or delete actions.
- The task list is saved to the browser's Local Storage after every create, status toggle, and delete, and is restored automatically the next time the app loads.

## Data Persistence (Local Storage)

The task board persists its full task list to the browser's Local Storage so that a reload does not lose in-progress work (Jira ticket KAN-30).

- **Storage key:** `task_board.tasks.v1`.
- **Payload shape:**
  ```json
  {
    "version": 1,
    "updatedAt": "2026-09-12T00:00:00.000Z",
    "tasks": [
      { "id": 1, "title": "Example task", "status": "open", "priority": "Medium" }
    ]
  }
  ```
- **On startup:** the app tries to load tasks from Local Storage. If a valid payload is found, those tasks become the initial state. Otherwise, the built-in starter tasks are shown.
- **On any change:** whenever a task is created, its status is toggled, or it is deleted, the updated task list is written back to Local Storage.
- **Stats:** Total/Open/Done counts are always derived from the current in-memory task list, so they stay consistent with whatever was restored or persisted.
- **Resilience:** all Local Storage access is wrapped in error handling. If storage is unavailable (e.g. private browsing), the saved data is corrupted JSON, or it fails schema validation, the app safely falls back to the in-memory starter tasks instead of crashing. Write failures (e.g. quota exceeded) are caught and logged as a warning in development builds without interrupting the UI.
- **Scope:** this feature is client-side only, no backend, API, database, or authentication changes are involved. See `docs/impl_plan.md` for the full design and acceptance criteria (KAN-30).

The persistence logic lives in `src/utils/storage.ts` and exposes:

- `loadTasks(): Task[] | null` reads and validates the saved payload, or returns `null` when nothing usable is stored.
- `saveTasks(tasks: Task[]): void` writes the current task list as a versioned JSON payload.
- `clearTasks(): void` removes the saved payload (useful for tests, QA, or a future reset-board action).

## Testing

The project uses [Vitest](https://vitest.dev/) with [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/) and jsdom.

Run the full test suite:

```bash
npm test
```

Run tests in watch mode while developing:

```bash
npm run test:watch
```

Generate a coverage report:

```bash
npm run test:coverage
```

Test coverage includes:

- `src/utils/__tests__/storage.test.ts` unit tests for `loadTasks`/`saveTasks`/`clearTasks`, covering the happy path, missing data, corrupted JSON, schema mismatches, and write failures.
- `src/__tests__/App.test.tsx` integration tests verifying default tasks appear when storage is empty, saved tasks are restored on load, stats stay consistent with the restored list, and create/toggle/delete actions persist to Local Storage.

## End-to-End Testing (Playwright)

The project uses [Playwright](https://playwright.dev/) with TypeScript to automate the 8 Local Storage persistence scenarios defined in `test_cases.md` (Jira KAN-30): defaults on empty storage, restore on reload, corrupted-storage fallback, and persistence of create/update/delete operations together with the Total/Open/Done statistics.

Install the Playwright browser binaries once (Chromium is used by default):

```bash
npx playwright install chromium
```

Run the full end-to-end suite (builds the app and serves it via `vite preview` automatically):

```bash
npm run test:e2e
```

Open the last generated HTML report:

```bash
npm run test:e2e:report
```

Test coverage includes (see `e2e/`):

- `scenario-01-default-tasks-on-empty-storage.spec.ts` - Scenario 1: starter tasks and non-negative stats when Local Storage is empty.
- `scenario-02-created-tasks-persist-after-reload.spec.ts` - Scenario Outline 2: created tasks (title, priority, `Open` status) survive a reload.
- `scenario-03-status-updates-persist-after-reload.spec.ts` - Scenario Outline 3: marking a task Done and reopening it both persist across reloads.
- `scenario-04-deleted-tasks-do-not-reappear.spec.ts` - Scenario Outline 4: deleted tasks stay deleted after a reload.
- `scenario-05-mixed-operations-restore-state.spec.ts` - Scenario 5: a mix of create/update/delete operations restores correctly after reload.
- `scenario-06-stats-consistency-after-reload.spec.ts` - Scenario Outline 6: Total/Open/Done counters stay consistent with baseline + deltas after reload.
- `scenario-07-corrupted-storage-fallback.spec.ts` - Scenario Outline 7: invalid/corrupted Local Storage values (`NOT_JSON`, empty string, `{}`, malformed array) fall back to starter tasks without an uncaught error.
- `scenario-08-no-backend-required.spec.ts` - Scenario 8: task creation and persistence work with no login prompt or backend dependency.

Generated reports (HTML at `playwright-report/html/index.html`, JSON at `playwright-report/results.json`) are committed alongside the automation code so the latest run's results are traceable from the repository.

## Customization Guide

Common changes are intentionally straightforward:

- Update starter tasks in `starterTasks` inside `src/App.tsx`.
- Add more priority options by extending the `Task['priority']` union type and the priority `<select>` options.
- Change the app title, subtitle, or labels in the JSX returned by `App`.
- Adjust colors, spacing, and responsive behavior in `src/App.css`.
- Change the Local Storage key or bump the schema `version` in `src/utils/storage.ts` if the persisted task shape ever changes.

## Build and Preview

Create a production build:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

The production files are generated in the `dist/` directory.

## Troubleshooting

### `npm install` fails

Make sure Node.js and npm are installed and available in your terminal:

```bash
node --version
npm --version
```

If dependencies are corrupted, delete `node_modules` and `package-lock.json`, then reinstall:

```bash
npm install
```

### The browser shows a blank page

Check the terminal where Vite is running and look for compilation errors. Also confirm you are opening the URL printed by Vite.

### CSS imports fail during TypeScript build

Confirm `src/vite-env.d.ts` exists and contains:

```ts
/// <reference types="vite/client" />
```

### Port 5173 is already in use

Vite will usually choose the next available port. Use the exact URL shown in the terminal output.

### The board doesn't remember my tasks after reload

- Confirm Local Storage is enabled in your browser (it is disabled in some private/incognito modes).
- Open the browser console; in development builds, the app logs a warning if it falls back to defaults because the saved data was missing, corrupted, or failed validation.
- Clearing the `task_board.tasks.v1` key from Local Storage (e.g. via DevTools -> Application -> Local Storage) resets the board to the default starter tasks on the next reload.

## Notes

This app is designed for demonstration purposes. It does not include authentication, routing, or backend/API/database storage. Client-side persistence is limited to the browser's Local Storage (see [Data Persistence (Local Storage)](#data-persistence-local-storage)), and the project does not include a production deployment configuration.
