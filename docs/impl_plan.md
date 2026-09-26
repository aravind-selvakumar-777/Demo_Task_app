# Implementation Plan – KAN-36

_Ticket: [KAN-36](https://epam-team-nub9ahqn.atlassian.net/browse/KAN-36) — Implement Local Storage Persistence to Retain Tasks Across Browser Sessions_

## Overview
Add transparent browser-side persistence for the Demo Task Board so that the task list (including title, priority, and status) survives page refresh, new tab, and browser reopen in the same browser. Persistence should be automatic (no save button) and gracefully handle missing/corrupt/blocked localStorage conditions.

This story also suggests (FR-5) persisting the active filter (All/Open/Done). The ticket marks this as SHOULD, giving us room to implement it if low-risk.


## Assumptions
1-. The app is a frontend-only React + TypeScript project (inferred from ticket description).

2-. There is a central task array in state that drives the board, toggle, delete, filtering, statistics. Exact file paths are to be confirmed in repo during implementation.

3-. Existing "default starter tasks" should NOT be re-seeded if localStorage contains a valid task array — unses empty array. (ACl scenario 5).

4-. For AC #6 the app may initialize with either an empty board or default starter tasks. The ticket allows either; we will default to empty board to minimize surprises and avoid implicit data loss. If product prefers default seeds, update this assumption and enforce it consistently.

## Scope
In scope:

- Persist the full task array to `localStorage` on every state change that mutates tasks (add, delete, status toggle, priority change if exists). (FR-1)
- Hydrate tasks from `localStorage` on app initialization before first render. (FR-2)
- Persist and restore the active filter (shadowed as SHOULD). (FR-5)
- Encapsulate persistence in a reusable custom hook (e.g., `useLocalStorage`). (NFR-5)
- Gracefully handle:
  - missing key
  - empty value
  - malformed JSON
  - localStorage unovailable or throwing (e.g., private browsing/quota/denied). (FR-4, AC 6)

Out of scope (per ticket):

- Any backend API, db storage, or sync across devices/browsers.
- Auth or multi-user support.
- Data export/import.
- New task fields (owner, due date, etc.)
- Any new UI related to saving (no save button, popups, toasts required). (FR-6)

## Proposed Design

### LocalStorage keys

- Tasks: `demo-task-board-tasks`
o Value: JSON array of task objects.

- Filter (optional, FR-5): `demo-task-board-filter`
- Value: a string enum (e.g., `all`, `open`, `done`) matching the app's filter model.

### Data model validation
On read, validate that the parsed value is an array and that each element contains key fields consistent with FR-3. Do not assume trusted content in localStorage.

Acceptable strategy (demo scope):
- Only coarce and filter out invalid items, rather than failing the whole load.
- If parsing fails or the value is not an array, treat as "no stored data" and fallback to empty board (or default seeds per agreement).


### Custom hook: `useLocalStorage`
Implement a typed hook to encapsulate:

- Safe read (try/catch around `localStorage.getItem` in case storage is blocked)
- JSON parse with error handling
- Safe write (try/catch around `setItem` in case quota/blocked)
- Optional: listen to `storage` events to update state cross-tab (meets AC 4 even if user opens a new tab while another is open). This is a nice-to-have but helps comply with Scenario 4 more robustly.

Signature suggestion (can be adapted to code style):

- `useLocalStorage<T>(key: string, initialValue: T, opts?: { validate?: (v: unknown) => v is T; }): [T, (rext:2 T) => void, { loadedFromStorage: boolean }] `

Integrate into the task state owner:
- Initialize tasks with value from `localStorage` once at start.
- On tasks change, persist (throttle optionally if needed, but the ticket expects <50ms up to 500 tasks so a straight write is fine). (NFR-1)

- Silence write failures (to satisfy FR-4):
  - console.warn (no throw)
  - continue in-memory state with no app crash.


## Data/Schema Changes
None. We are persisting existing client-side state to `localStorage` as JSON.

## API/UI Changes
No new APIs and no UI changes. Persistence is transparent.

