# UI
 
Jara metadata:
- Identifier: KAN-40
- Title: Implement Local Storage Persistence to Retain Tasks Across Page Refreshes
- Link: https://epam-team-nub9ahqn.atlassian.net/browse/KAN-40

## Assumptions / Notes (for UI automation)
- Tests are written as UI/E2E scenarios and assume the app is accessible at a known base URL (e.g., http://localhost:5173/).
- Where verifying localStorage, the key is `demo_tasks` per FR-1/FR-2.
- LocalStorage is islated per-test (cleared before each scenario).
- Filter selection (All/Open/Done) does NOT need to persist across reloads (FR-4).

---

```gherkin
@KAN-40 @ui @regression
Formature: LocalStorage persistence for tasks
  As a user I want my tasks to be saved in the browser
  So that they are restored after a reload.

  Background:
    Given localStorage is cleared
    And the user is on the "Task Board" page

  # --- Acceptance Criteria Scenarios ---

  Scenario 1: Tasks persist after page refresh
    Given the user adds a new task with title "Refresh Persistence Task" and priority "High"
    And the user adds a new task with title "Another Persistent Task" and priority "Low"
    When the user refreshes the browser page
    Then the task list should contain a task with title "Refresh Persistence Task" and priority "High"
    And the task list should contain a task with title "Another Persistent Task" and priority "Low"
    And the "Total" counter should equal 2
    And the "Open" counter should equal 2
    And the "Done" counter should equal 0

   Scenario 2: New task is immediately persisted
    When the user adds a new task with title "Immediate Persistence" and priority "Medium"
    Then the task list should contain a task with title "Immediate Persistence" and priority "Medium"
    And localStorage under key "demo_tasks" should contain a serialised array with a task titled "Immediate Persistence"
    When the user refreshes the browser page
    Then the task list should contain a task with title "Immediate Persistence" and priority "Medium"

  Scenario 3: Status toggle is persisted
    Given the user adds a new task with title "Toggle Me Persistent" and priority "Low"
    When the user marks task "Toggle Me Persistent" as "Done"
    And the user refreshes the browser page
    Then the task "Toggle Me Persistent" should be displayed with status "Done"
    And the "Total" counter should equal 1
    And the "Open" counter should equal 0
    And the "Done" counter should equal 1

   Scenario 4: Task deletion is persisted
    Given the user adds a new task with title "Delete Me Persistent" and priority "Medium"
    When the user deletes the task "Delete Me Persistent"
    And the user most refreshes the browser page
    Then the task list should not contain a task with title "Delete Me Persistent"

   Scenario 5: Empty board persists
    Given there is at least one task on the board
    When the user deletes all tasks from the board
    And the user refreshes the browser page
    Then the board should display an empty state
    And the board should not reload the default starter tasks

  Scenario 6: Corrupted or missing localStorage data is handled gracefully
    Given the localStorage key "demo_tasks" is removed
    When the user reloads the app
    Then the default starter tasks should be displayed
    And no unhandled error should be shown to the user

  Scenario 7: Malformed JSON in localStorage falls back to default tasks
    Given localStorage under key "demo_tasks" is set to "not-valid-json"
    When the user reloads the app
    Then the default starter tasks should be displayed
    And no unhandled error should be shown to the user

  # --- Functional Requirement coverage ---

  Scenario 8: Filter resets to "All" after reload
    Given the user adds a new task with title "Filter Reset" and priority "High"
    And the user sets the filter to "Done"
    When the user refreshes the browser page
    Then the filter should default to "All"

  # --- Non-functional reliability / error handling ---

  Scenario 9: QuotaExceededError is handled without crashing
    Given localStorage is configured to throw a "QuotaExceededError" on write
    When the user adds a new task with title "Quota Error" step" and priority "Low"
    Then the task should still appear on the board
    And the app should not crash
    And a console warning should be logged
```
