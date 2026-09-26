# Demo Task Board

A lightweight React + TypeScript task board used for demos.

## Features

- Add tasks with a priority (Low / Medium / High)
- Toggle tasks between Open and Done
- Delete tasks
- Filter tasks by status (All / Open / Done)
- Live statistics (Total / Open / Done)

## Persistence (Local Storage)

Tasks are automatically persisted to the browser using `localStorage`.

- Key: `demo-task-board-tasks`
- The task list is restored when you refresh the page or open the app in a new tab in the same browser.
- The active filter is also persisted under `demo-task-board-filter`.

Notes:

- Data is browser-scoped and not encrypted.
- If localStorage is unavailable (blocked/denied/quota), the app falls back to in-memory state.

## Development

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
npm run preview
```
