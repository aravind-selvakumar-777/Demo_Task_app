# Implementation Plan: Demo Task Board Enhancements

## A. Overview

### Goal
Enhance the Demo Task Board application with five core features that transform it from a simple demo too into a production-ready task management application suitable for individual and team use.

### Scope
**In Scope:**
- Local storage persistence (core foundation)
- Task owner assignment (team collaboration)
- Due date tracking with overdue indicators (deadline management)
- Full-text search by task title (usability)
- Inline task editing for title and priority (flexibility)
- Unit test framework and coverage for all new features
- CI/CD pipeline with automated tests and build validation

**Non-Goals:**
- Backend API or database integration
- User authentication or multi-user support
- Cross-device or cloud synchronisation
- Advanced filtering (by owner, due date, priority)
- Calendar/Gantt views
- Production deployment configuration

### Assumptions
1. All development will be done on the `main` branch or through feature branches merged via PR.
2. Node.js 18+ and npm are available in the development environment.
3. The application will continue to run entirely client-side with no server dependencies.
4. Target browsers: Chrome, Firefox, Safari, Edge (latest 2 versions).
5. Accessibility compliance: WCAG 2.1 AA.

### Dependencies
- No external services or APIs required
- All functionality built using existing React/TypeScript/Vite stack
- Testing libraries will be added as new dev dependencies

### Constraints
- Must maintain backward compatibility with existing task data structure
- Must not break existing functionality (add, delete, toggle, filter)
- Must retain current UI/UX patterns and visual design
- Must support mobile and desktop responsive layouts

### Single Release Statement
This plan covers **one comprehensive release** that delivers all five features, testing infrastructure, and CI/CD pipeline in a single coordinated effort. The release will be delivered incrementally through feature branches, but all work is scoped for a single version bump (0.1.0 → 0.2.0).

---

## B. Current State Summary

### Tech Stack
- **Frontend**: React 19+ with TypeScript (strict mode)
- **Build Tool**: Vite 5.x with @itejs/plugin-react
- **Styling**: Plain CSS (App.css, index.css)
- **Package Manager**: npm
- **Type System**: TypeScript 5.x with strict configuration

### Project Structure
```
Demo_Task_app/
├── index.html                # Entry HTML
├── package.json              # NPM dependencies and scripts
├── tsconfig.json            # TypeScript config (root)
├── tsconfig.app.json        # App-specific TS config
├── tsconfig.node.json       # Node/Vite TS config
├── vite.config.ts           # Vite configuration
└── src/
    ├── App.tsx              # Main app component (all logic)
    ├── App.css              # App styles
    ├── main.tsx             # React entry point
    ├── index.css            # Global styles
    └── vite-env.d.ts        # Vite type definitions
```

### Key Components
1. **src/App.tsx** (150 lines)
   - Single monolithic component containing all state and logic
   - Task data model: `{ id: number, title: string, status: 'open' | 'done', priority: 'Low' | 'Medium' | 'High' }`
   - State management: `useState` for tasks, title, priority, filter
   - Core functions: `addTask`, `toggleTask`, `deleteTask`
   - UI: Task form, filter toolbar, task list, statistics dashboard

2. **src/App.css** (120 lines)
   - Responsive layout with flexbox/grid
   - Task card styling with status-based visual differentiation
   - Mobile-first responsive breakpoints

### Build/Run Workflow
**Development:**
```bash
npm install                # Install dependencies
npm run dev                # Start Vite dev server (http://localhost:5173)
```

**Production Build:**
```bash
npm run build             # TypeScript check + Vite build (output: dist/)
npm run preview           # Preview production build locally
```

**Current Limitations:**
- No testing framework or test scripts
- No linter (ESLint) or formatter (Prettier)
- No CI/CD pipeline
- No deployment configuration

### Existing Functionality
1. Add tasks with title and priority (Low/Medium/High)
2. Toggle task status (Open ⇄ Done)
3. Delete tasks
4. Filter tasks by status (All/Open/Done)
5. View live statistics (Total/Open/Done counts)
6. Responsive UI for mobile and desktop

**Critical Gap:** All tasks are stored in memory only (`starterTasks` array). Page refresh resets all data.

---

## C. Release Plan (Single Release)

### Release Milestones

The release is organised into **three sequential phases** to ensure dependency order and reduce integration risk:

#### Phase 1: Foundation (Week 1)
**Goal:** Establish core infrastructure that all other features depend on.

**Deliverables:**
1. Local storage persistence (KAN-9)
2. Testing framework setup (Vitest + React Testing Library)
3. CI/CD pipeline basics (GitHub Actions)

**Rationale:**
- Local storage is a hard dependency for all other features (owner, due date, editing).
- Testing infrastructure must be in place before developing new features.
- CI pipeline ensures all subsequent PRs are validated automatically.

#### Phase 2: Core Features (Week 2)
**Goal:** Deliver the three highest-value user-facing features.

**Deliverables:**
1. Task owner assignment (KAN-8)
2. Due date tracking (KAN-10)
3. Inline task editing (KAN-6)

**Rationale:**
- These features are independent of each other and can be developed in parallel.
- All three extend the `Task` data model and require localStorage (delivered in Phase 1).
- These features address the top user pain points: accountability, deadlines, and flexibility.

#### Phase 3: Usability & Polish (Week 3)
**Goal:** Improve user experience and ensure production readiness.

**Deliverables:**
1. Full-text search functionality (KAN-7)
2. Final integration testing and bug fixes
3. Updated README with new feature documentation
4. Performance optimisation (if needed)

**Rationale:**
- Search is independent and can be added after core features are stable.
- Final testing ensures all features work together coherently.
- Documentation updates are critical for user adoption.

---

### Per-Ticket Execution Plan

#### KAN-9: Implement Local Storage Persistence
**Phase:** 1 (Foundation)  
**Priority:** Medium (but critical path)  
**Dependencies:** None (first feature)

**What to Change:**
1. **src/App.tsx**:
   - Add `useEffect` hook to load tasks from `localStorage` on mount
   - Add `useEffect` hook to save tasks to `localStorage` whenever `tasks` state changes
   - Implement JSON parsing with error handling (fallback to `starterTasks`)
   - Use key: `demo_task_board_tasks`
   - Add console warning for invalid/corrupted data

2. **src/utils/storage.ts** (new file):
   - Create utility functions: `loadTasks()`, `saveTasks(tasks)`
   - Encapsulate localStorage logic for testability
   - Handle `QuotaExceededError` gracefully

**How:**
- Use native `localStorage.getItem()` and `localStorage.setItem()` APIs
- Serialise tasks using `JSON.stringify()` and `JSON.parse()`
- Validate parsed data structure before using (check for `Array.isArray()` and required fields)
- Wrap all localStorage operations in try-catch blocks

**Validation:**
- Manual: Add task, refresh page, verify task persists
- Manual: Toggle status, refresh, verify status persists
- Manual: Delete task, refresh, verify task gone
- Manual: Clear localStorage, refresh, verify default starter tasks load
- Unit tests: `loadTasks()`, `saveTasks()`, error handling

---

#### KAN-8: Add Task Owner Assignment
**Phase:** 2 (Core Features)  
**Priority:** Medium  
**Dependencies:** KAN-2�→ localStorage must be implemented first

**What to Change:**
1. **src/App.tsx**:
   - Update `Task` type: add `owner?: string` field
   - Add `owner` state: `useState<string>('')`
   - Add owner input field to task creation form
   - Update `addTask` function to include `trimmedOwner` in new task object
   - Reset owner field after task creation
   - Update task card JSX to display owner (with "Unassigned" fallback)

2. **src/App.css**:
   - Add styling for owner display on task card
   - Ensure long owner names are truncated with ellipsis (`max-width + text-overflow`)

**How:**
- Add a simple text input with `placeholder="Owner (e.g., John Smith)"`
- Trim whitespace from owner name before saving
- Store owner as a string or `null` if empty

- Display owner below task title in a subtle font (`font-size: 0.85rem`)
- Apply max character limit of 50 chars (HTML `maxlength` attribute)

**Validation:**
- Manual: Create task with owner, verify displayed on card
- Manual: Create task without owner, verify "Unassigned" shown
- Manual: Refresh page, verify owner persists
- Unit tests: task with owner, task without owner, persistence

---

#### KAN-10: Add Due Date Field
**Phase:** 2 (Core Features)  
**Priority:** Medium  
**Dependencies:** KAN-9 → localStorage must be implemented first

**What to Change:**
1. **src/App.tsx**:
   - Update `Task` type: add `dueDate?: string` field (ISO 8601 date string)
   - Add `dueDate` state: `useState<string>('')`
   - Add date input field to task creation form (`<input type="date" />`)
   - Update `addTask` function to include `dueDate` in new task object
   - Reset dueDate field after task creation
   - Add `isOverdue` helper function: `dueDate < today && status === 'open'`
   - Update task card JSX to display due date with formatting (`${day} ${month} ${year}`)
   - Apply `overdue` CSS class to overdue tasks

2. **src/App.css**:
   - Add `.overdue` class with red border/background tint
   - Style due date display (icon + date text)

3. **src/utils/date.ts** (new file):
   - Create `formatDate(string): string` function
   - Create `isOverdue(dueDate: string, status: string): boolean` function

**How:**
- Use native HTML5 `<input type="date" />` (no external datepicker library)
- Store due date in ISO 8601 format (YYYY-MM-DD) for consistency
- Compare dates using `new Date(dueDate) < new Date().setHours(0, 0, 0, 0)`
- Format display using `Intl.DateTimeFormat` for locale-friendly output

- Visual overdue indicator: red left border (4px) + light red background

**Validation:**
- Manual: Create task with future due date, verify displayed normally
- Manual: Create task with past due date (open status), verify red overdue indicator
- Manual: Mark overdue task as done, verify overdue indicator removed
- Manual: Create task without due date, verify no date shown
- Unit tests: `isOverdue()`, `formatDate()`, persistence

---

#### KAN-6: Enable Inline Task Editing
**Phase:** 2 (Core Features)  
**Priority:** Medium  
**Dependencies:** KAN-2�→ localStorage must be implemented first

**What to Change:**
1. **src/App.tsx**:
   - Add `editingTaskId` state: `useState<number | null>(null)`
   - Add `editFormData` state: `useState<{ title: string, priority: string }>`
   - Add `startEditing(taskId)` function to enter edit mode
   - Add `saveEdit()` function to validate and save changes
   - Add `cancelEdit()` function to discard changes
   - Update task card JSX to conditionally render edit form vs view mode
   - Add "Edit" button to each task card
   - Add "Save" and "Cancel" buttons in edit mode
   - Validate title is not empty before saving

2. **src/App.css**:
   - Add `.task-card.editing` class with distinct border/background
   - Style inline edit form inputs and buttons

**How:**
- When `Edit` button clicked, store task ID in `editingTaskId` state
- Pre-fill edit form inputs with current task values
- Render inline form instead of task title/details when `id === editingTaskId`
- On `Save`, update task in `tasks` state using `map()`
- On `Cancel` or `Escape` key, reset `editingTaskId` to `null`
- Enforce only one task in edit mode at a time (setting new ID auto-cancels previous)

**Validation:**
- Manual: Click Edit, verify inline form appears with current values
- Manual: Change title, click Save, verify update persists
- Manual: Click Cancel, verify changes discarded
- Manual: Clear title, click Save, verify validation error
- Manual: Edit two tasks simultaneously, verify only one in edit mode
- Unit tests: `saveEdit()`, `cancelEdit()`, empty title validation

---

#### KAN-7: Implement Full-Text Search
**Phase:** 3 (Usability & Polish)  
**Priority:** Medium  
**Dependencies:** None (independent feature)

**What to Change:**
1. **src/App.tsx**:
   - Add `searchQuery` state: `useState<string>('')`
   - Add search input field to toolbar (above or next to filter buttons)
   - Update `visibleTasks` filter logic to include search matching
   - Implement case-insensitive substring match: `task.title.toLowerCase().includes(searchQuery.toLowerCase())`
   - Add clear button (×) inside search input
   - Ensure statistics counters always reflect full task list (not search results)

2. **src/App.css**:
   - Style search input with search icon (optional)
   - Add clear button styling

**How:**
- Add `<input type="search" placeholder="Search tasks..." />`
- Filter tasks using `.filter()` with combined status and search conditions
- Escape special regex characters in search input (if using regex) or just use `.includes()`
- Treat whitespace-only search as empty (show all tasks)
- Search is transient UI state — do not persist to localStorage

**Validation:**
- Manual: Type search query, verify matching tasks shown in real time
- Manual: Search with no matches, verify empty state message
- Manual: Combine search with status filter, verify both applied
- Manual: Clear search, verify full list restored
- Manual: Verify statistics counters do not change when searching
- Unit tests: search match, no match, case-insensitivity, combined filter

---

#### Testing Framework Setup
**Phase:** 1 (Foundation)  
**Priority:** High (enables TDD for all features)

**What to Change:**
1. **package.json**:
   - Add dev dependencies: `vitest`, `@testing-library/react`, `@testing-library/jest-dom`, `jsdom`
   - Add test script: `"test": "vitest"`
   - Add coverage script: `"test:coverage": "vitest --coverage"`

2. **vite.config.ts**:
   - Add Vitest configuration:
     ```typescript
     test: {
       globals: true,
       environment: 'jsdom',
       setupFiles: './src/test/setup.ts'
     }
     ```

3. **src/test/setup.ts** (new file):
   - Import `@testing-library/jest-dom`/extend-expect`
   - Configure global test utilities

4. **src/__tests__/App.test.tsx** (new file):
   - Write initial tests for existing functionality:
     - Renders without crashing
     - Adds a task
     - Toggles task status
     - Deletes a task
     - Filters tasks by status

---

#### CI/CD Pipeline Setup
**Phase:** 1 (Foundation)  
**Priority:** High (automates quality gates)

**What to Change:**
1. **.github/workflows/ci.yml** (new file):
   - Trigger on push to `main` and all PRs
   - Jobs:
     - **Lint**: Run TypeScript compiler check (`tsc --noEmit`)
     - **Test**: Run `vitest` with coverage
     - **Build**: Run `npm run build` to verify production build succeeds
   - Upload coverage report as artifact
   - Fail PR if any job fails

2. **README.md**:
   - Add CI badge at top of file
   - Document `npm test` command

---

### Final Integration & Documentation
**Phase:** 3 (Usability & Polish)

**What to Change:**
1. **README.md**:
   - Update Features section with new capabilities:
     - Local storage persistence
     - Task owner assignment
     - Due date tracking with overdue indicators
     - Full-text search
     - Inline task editing
   - Add Testing section with `npm test` instructions
   - Update Application Behaviour section with new fields
   - Update Customisation Guide with new data model fields

2. **src/App.tsx comments**:
   - Add JSDoc comments to all new functions
   - Document updated `Task` type fields

3. **CHANGELOG.md** (new file):
   - Document version 0.2.0 release notes
   - List all new features and breaking changes (none expected)

4. **package.json**:
   - Bump version from 0.1.0 to 0.2.0

---

## D. Estimation (Story Points Derived from Hours)

### Conversion Rule
**1 Story Point (SP) = 4 Hours**

This conversion assumes:
- A full day of focused development = 6-6 hours = 1.5-2 SP
- A typical 2-week sprint = 80 hours = 20 SP
- Estimates include development, testing, code review, and documentation

### Per-Ticket Estimates

| Ticket | Description | Hours | Story Points | Notes |
|-------|------------|------|-------------|------|
| **KAN-9** | Local Storage Persistence | 8 | 2 | Core infrastructure, critical path |
| **KAN-8** | Task Owner Assignment | 6 | 1.5 | Simple field addition |
| **KAN-10** | Due Date Tracking | 12 | 3 | Date handling + overdue logic |
| **KAN-6** | Inline Task Editing | 10 | 2.5 | State management + validation |
| **KAN-7** | Full-Text Search | 6 | 1.5 | Simple filter logic |
| **Testing** | Framework Setup + Unit Tests | 16 | 4 | Vitest setup + tests for all features |
| **CI/CD** | GitHub Actions Pipeline | 4 | 1 | Basic lint/test/build pipeline |
| **Docs** | README + CHANGELOG Updates | 4 | 1 | Feature documentation |
| **Integration** | Final Testing & Bug Fixes | 8 | 2 | End-to-end testing |

**Totals:**
- **Total Hours:** 74 hours
- **Total Story Points:** 18.5 SP

### Capacity Assumption
- Single full-time developer: 74 hours = ±2.5 weeks (12-15 business days)
- Two developers (parallel work): 1.5-2 weeks (7-10 business days)
- Estimates include 20% buffer for unexpected complexity and code review iterations

---

## E. Engineering Practices

### Branching Strategy
1. **Main Branch**: `main` (default, always deployable)
2. **Feature Branches**: `feature/KAN-X-short-description`
   - Example: `feature/KAN-9-local-storage`
   - Created from `main`, merged back via PR
3. **Hotfix Branches**: `hotfix/description` (if needed)

### Commit Message Conventions
Follow Conventional Commits format:

```
<type>(<scope>): <subject>

<body>

<footer>
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `refactor`: Code refactoring
- `chore`: Maintenance tasks (deps, config)

**Examples:**
```
feat(KAN-9): implement localStorage persistence for tasks

test(KAN-9): add unit tests for storage utilities

docs: update README with new features for v0.2.0
```

### Pull Request Process
1. **Create PR**: From feature branch to `main`
2. **PR Title**: `[KAN-X] Brief description`
3. **PR Description**:
   - Link to Jira ticket
   - Summary of changes
   - Testing performed (manual + automated)
   - Screenshots (if UI changes)
4. **CI Checks**: Must pass before merge:
   - TypeScript compilation
   - All unit tests pass
   - Production build succeeds
5. **Code Review**: At least 1 approval required
6. **Merge Strategy:** Squash and merge (single commit per feature)

### Testing Plan

#### Unit Tests (Vitest + React Testing Library)
**Coverage Goal:** > 80% line coverage for all new code

**Test Categories:**
1. **Component Tests** (`src/__tests__/App.test.tsx`):
   - Renders without crashing
   - Displays starter tasks on mount
   - Adds a new task with all fields
   - Toggles task status (Open ↔ Done)
   - Deletes a task
   - Filters tasks by status (All/Open/Done)
   - Searches tasks by title
   - Edits a task inline
   - Validates empty title on add/edit
   - Displays overdue indicator for past due dates

2. **Utility Tests**:
   - `src/__tests__/storage.test.ts`: `loadTasks()`, `saveTasks()`, error handling
   - `src/__tests__/date.test.ts`: `formatDate()`, `isOverdue()`

#### Manual Testing
Performed by developer before PR creation:
1. **Functional Testing**: Verify all acceptance criteria from Jira ticket
2. **Cross-Browser Testing**: Chrome, Firefox, Safari
3. **Responsive Testing**: Desktop (1920px), Tablet (768px), Mobile (375px)
4. **Accessibility Testing**: Keyboard navigation, screen reader (basic checks)
5. **Performance Testing**: Test with 500+ tasks, verify no perceptible lag

