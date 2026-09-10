# Demo Task Board

Demo Task Board is a compact sample web app built with Vite, React, and TypeScript. It demonstrates a small but complete task-management workflow: add tasks, assign priority, update task status, delete tasks, filter the list, and view live task counts.

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
- [Customization Guide](#customization-guide)
- [Build and Preview](#build-and-preview)
- [Troubleshooting](#troubleshooting)

## Overview

The application is intentionally limited in scope so it is easy to understand, run, and extend.

**Persistence:** tasks are stored in **`localStorage`**, so your task list (including edits) remains after a refresh.

## Features

- Add a task with a title and priority.
- Choose between `Low`, `Medium`, and `High` priority.
- Mark a task as `Open` or `Done`.
- Reopen completed tasks.
- Delete tasks from the board.
- Filter tasks by `all`, `open`, or `done`.
- View live counts for total, open, and completed tasks.
- **Inline edit** existing tasks:
  - Click **Edit** or double-click a task title to enter edit mode.
  - **Save** via the Save button or the **Enter** key.
  - **Cancel** via the Cancel button or the **Escape** key.
  - Title is validated (cannot be empty) and shows an inline error: **"Title cannot be empty"**.
  - Only one task can be edited at a time (switching to another task discards unsaved changes).

## Tech Stack

- Vite for fast local development and production builds.
- React for the user interface.
- TypeScript for static typing.
- CSS for responsive layout and visual styling.

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
└── src/
    ├── App.css
    ├── App.tsx
    ├── index.css
    ├── main.tsx
    ├── test/
    │   └── setup.ts
    └── vite-env.d.ts
```

Key files:

- `src/App.tsx` contains the task board UI, state, filters, and task actions.
- `src/App.css` contains the main application layout and component styling.
- `src/index.css` contains global page styles.
- `src/main.tsx` mounts the React app into the page.
- `vite.config.ts` configures Vite with the React plugin.

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
| `npm run test` | Runs unit tests with Vitest. |

## How to Use the App

1. Enter a task name in the `Task name` field.
2. Select a priority from the `Priority` dropdown.
3. Select `Add task` to add it to the board.
4. Select the `Open` button on a task to mark it done.
5. Select the `Done` button on a completed task to reopen it.
6. Use the `all`, `open`, and `done` filter buttons to change the visible list.
7. Select `Delete` to remove a task.
8. To edit a task inline:
   - Click **Edit** (or double-click the task title)
   - Update title and/or priority
   - Save with **Enter**/**Save**, or cancel with **Escape**/**Cancel**

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
- Task data (including edits) is persisted to `localStorage`.

## Customization Guide

Common changes are intentionally straightforward:

- Update starter tasks in `starterTasks` inside `src/App.tsx`.
- Add more priority options by extending the `Task['priority']` union type and the priority `<select>` options.
- Change the app title, subtitle, or labels in the JSX returned by `App`.
- Adjust colors, spacing, and responsive behavior in `src/App.css`.

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

## Notes

This app is designed for demonstration purposes. It does not include authentication, routing, backend storage, API integration, or production deployment configuration.
