# Demo Task Board

Demo Task Board is a compact sample web app built with Vite, React, and TypeScript. It demonstrates a small but complete task-management workflow: add tasks, assign priority, update task status, delete tasks, filter the list, and view live task counts. **Tasks are now automatically persisted to browser localStorage**, so your work is saved across page refreshes and browser sessions.

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
- [Local Storage Persistence](#local-storage-persistence)
- [Testing](#testing)
- [Customization Guide](#customization-guide)
- [Build and Preview](#build-and-preview)
- [Troubleshooting](#troubleshooting)

## Overview

The application is intentionally limited in scope so it is easy to understand, run, and extend. **As of KAN-39**, tasks are automatically persisted to browser `localStorage`, which means your task list survives page refreshes, tab closures, and browser restarts — no manual save required. This makes it suitable for daily use, demos, learning React state management, UI experimentation, or as a starting point for a larger app.

## Features

- Add a task with a title and priority.
- Choose between `Low`, `Medium`, and `High` priority.
- Mark a task as `Open` or `Done`.
- Reopen completed tasks.
- Delete tasks from the board.
- Filter tasks by `all`, `open`, or `done`.
- View live counts for total, open, and completed tasks.
- **Automatic localStorage persistence** — tasks survive page refresh, tab close, and browser restart.
- Responsive layout for desktop and mobile screens.

## Tech Stack

- Vite for fast local development and production builds.
- React for the user interface.
- TypeScript for static typing.
- CSS for responsive layout and visual styling.
- Vitest + jsdom for unit testing.
- Playwright for end-to-end browser automation testing.

## Project Structure

```text
Demo_Task_app/
├── index.html
├── package.json
├── README.md
├── tsconfig.json
├── tsconfig.app.json
├── tsconfig.node.json
├── vite.config.ts
├── playwright.config.ts
├── e2e/
│   └── localStorage-persistence.spec.ts
├── docs/
│   └── impl_plan.md
└── src/
    ├── App.css
    ├── App.tsx
    ├── index.css
    ├── main.tsx
    ├── vite-env.d.ts
    ├── hooks/
    │   ├── useLocalStorage.ts
    │   └── useLocalStorage.test.ts
    └── test/
        └── setup.ts
```

Key files:

- `src/App.tsx` contains the task board UI, state, filters, and task actions.
- `src/hooks/useLocalStorage.ts` implements the custom React hook for automatic localStorage persistence.
- `src/App.css` contains the main application layout and component styling.
- `src/index.css` contains global page styles.
- `src/main.tsx` mounts the React app into the page.
- `vite.config.ts` configures Vite with the React plugin and Vitest test runner.
- `playwright.config.ts` configures Playwright for end-to-end testing.
- `e2e/localStorage-persistence.spec.ts` contains comprehensive e2e tests for all acceptance criteria.

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
| `npm test` | Runs unit tests with Vitest. |
| `npm run test:watch` | Runs unit tests in watch mode. |
| `npm run test:e2e` | Runs end-to-end tests with Playwright. |
| `npm run test:e2e:ui` | Runs Playwright tests with interactive UI. |

## How to Use the App

1. Enter a task name in the `Task name` field.
2. Select a priority from the `Priority` dropdown.
3. Select `Add task` to add it to the board.
4. Select the `Open` button on a task to mark it done.
5. Select the `Done` button on a completed task to reopen it.
6. Use the `all`, `open`, and `done` filter buttons to change the visible list.
7. Select `Delete` to remove a task.
8. **Your tasks are automatically saved** — refresh the page or close the tab and your tasks will still be there when you return.

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
- **Tasks are automatically persisted to browser localStorage** using the key `demo_task_board_tasks`.
- On first load (or if localStorage is empty), the app initializes with three default starter tasks.
- If all tasks are deleted, the empty state persists — starter tasks will not reappear on reload.

## Local Storage Persistence

**Feature implemented in KAN-39**

### How it works

- Every time you add, update, complete, reopen, or delete a task, the entire task list is automatically saved to your browser's localStorage.
- When you reload the page, close the tab, or restart your browser, the app reads from localStorage and restores your exact task list.
- No manual "Save" button required — persistence is fully automatic.

### Storage key

Tasks are stored under the key: `demo_task_board_tasks`

### Edge cases handled

- **Corrupt data**: If localStorage contains malformed JSON, the app gracefully falls back to the default starter tasks without crashing.
- **Empty state**: If you delete all tasks, the empty board persists across reloads (starter tasks are not re-injected).
- **Storage unavailable**: In private/incognito mode or if localStorage is blocked, the app continues to function normally in-memory only (no crash).
- **Quota exceeded**: If you exceed the browser storage limit, write errors are caught silently and the app continues functioning.

### Clearing your tasks

To reset the app and clear all saved tasks:

1. Open your browser's developer tools (F12).
2. Go to the **Application** (Chrome) or **Storage** (Firefox) tab.
3. Find **Local Storage** → `http://localhost:5173` (or your domain).
4. Delete the `demo_task_board_tasks` key.
5. Refresh the page.

Alternatively, run this in the browser console:

```javascript
localStorage.removeItem('demo_task_board_tasks');
location.reload();
```

## Testing

### Unit Tests

Unit tests are written with **Vitest** and cover the `useLocalStorage` hook comprehensively:

- Read valid JSON from localStorage
- Fall back to defaults when localStorage is empty or corrupt
- Write to localStorage on state changes
- Handle storage quota errors gracefully
- Support functional state updates
- Validate array data types

Run unit tests:

```bash
npm test
```

Run tests in watch mode during development:

```bash
npm run test:watch
```

### End-to-End Tests

E2E tests are written with **Playwright** and validate all acceptance criteria from KAN-39:

- **AC1**: Tasks persist after page refresh
- **AC2**: Tasks persist after tab close and reopen
- **AC3**: Status changes persist
- **AC4**: Task deletion persists
- **AC5**: Empty board persists (no starter tasks re-injected)
- **AC6**: Corrupted localStorage is handled gracefully

Run e2e tests:

```bash
npm run test:e2e
```

Run e2e tests with interactive UI:

```bash
npm run test:e2e:ui
```

**Note**: E2E tests automatically start the dev server on port 5173. Ensure the port is available before running.

## Customization Guide

Common changes are intentionally straightforward:

- Update starter tasks in `starterTasks` inside `src/App.tsx`.
- Add more priority options by extending the `Task['priority']` union type and the priority `<select>` options.
- Change the app title, subtitle, or labels in the JSX returned by `App`.
- Adjust colors, spacing, and responsive behavior in `src/App.css`.
- Modify the localStorage key by updating the `STORAGE_KEY` constant in `src/App.tsx`.
- Add backend API persistence by replacing the `useLocalStorage` hook with an API-backed state management solution.

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

### Tasks are not persisting

1. Check that you are not in private/incognito mode (localStorage may be disabled or cleared on close).
2. Open browser DevTools → Application/Storage → Local Storage and verify the `demo_task_board_tasks` key exists.
3. Check the browser console for any errors related to localStorage.

### E2E tests fail

1. Ensure port 5173 is available (close any running dev servers).
2. Run `npx playwright install chromium` to ensure browsers are installed.
3. Check the Playwright HTML report: `npx playwright show-report`

## Notes

This app is designed for demonstration and learning purposes. It includes:

- ✅ Automatic browser localStorage persistence (KAN-39)
- ✅ Comprehensive unit tests (Vitest)
- ✅ End-to-end browser tests (Playwright)
- ✅ TypeScript type safety
- ✅ Production build pipeline

It does **not** include:

- ❌ User authentication
- ❌ Backend API or database
- ❌ Multi-user or cross-device synchronization
- ❌ Routing (single-page only)
- ❌ Production deployment configuration

For production use, you would typically replace localStorage with a backend API and add authentication, authorization, and multi-user features.
