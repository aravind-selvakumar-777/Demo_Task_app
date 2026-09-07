# Requirements: Persist Task Board Between Sessions

## User Story
As a Task Board user, I want my tasks (with priorities) to be saved automatically, so that I can refresh or reopen the application without losing my task data.

## Functional Requirements

### FR1: Task Persistence Storage
- Tasks shall be persisted using browser `sessionStorage` (clears when the browser tab/window closes)
- Maximum of 8 tasks shall be stored in sessionStorage
- Only tasks containing a priority field shall be persisted

### FR2: Auto-Save on Task Changes
- Tasks shall be automatically saved to sessionStorage whenever a task is created, updated, or deleted
- No explicit "Save" button required from the user

### FR3: Restore Tasks on Page Load
- On page load/refresh, all persisted tasks shall be restored from sessionStorage
- Restored tasks shall maintain their original:
  - Titles
  - Priorities
  - Statuses
  - Ordering

### FR4: Data Structure
- Persisted data shall include:
  - Task title
  - Task priority
  - Task status
  - Task ordering (sequence)

### FR5: Scope Limits
- Only the first 8 tasks shall be stored
- Once 8 tasks are stored, no new tasks shall be added until existing tasks are deleted

## Acceptance Criteria

### AC1: Page Refresh Persistence
**Given** tasks exist on the board with priorities  
**When** the page is refreshed  
**Then** all tasks (up to 8) are restored with their titles, priorities, statuses, and original ordering

### AC2: Browser Tab Close Persistence
**Given** tasks have been saved to sessionStorage  
**When** the browser tab is closed and reopened  
**Then** sessionStorage is cleared and no tasks are restored (sessionStorage scope behavior)

### AC3: Maximum Task Limit
**Given** 8 tasks already exist in sessionStorage  
**When** a user attempts to add a 9th task  
**Then** the task shall not be created, and a user notification shall indicate the maximum task limit has been reached

### AC4: Priority Field Required
**Given** a task is being created without a priority field  
**When** the task is saved  
**Then** the task shall not be persisted to sessionStorage (only tasks with priorities are stored)

## Non-Functional Requirements

### NFR1: Performance
- Task save operations shall complete in <100ms
- Page load with 8 tasks shall complete in <500ms
- No noticeable UI lag when tasks are automatically saved

### NFR2: Error Handling
- If sessionStorage is full or unavailable, the application shall:
  - Log an error to the browser console
  - Continue functioning with in-memory data (graceful degradation)
  - Inform the user that persistence is temporarily unavailable

### NFR3: Data Format
- Tasks shall be serialized to JSON format for storage
- Storage key shall be `taskBoardData`

## Out of Scope
- Server-side persistence or database storage
- Synchronization across multiple browser tabs/windows
- Task descriptions or additional metadata beyond title, priority, status, and ordering
- Advanced filtering or search persistence
- Task history or undo/redo functionality

## Implementation Notes
- Use `sessionStorage.setItem()` and `sessionStorage.getItem()` for persistence operations
- Implement auto-save on task creation, update, and deletion events
- Validate task limit before allowing task creation
- Handle JSON serialization/deserialization errors gracefully
