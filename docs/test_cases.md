# UI
 
- **Jira ID:** KAN-35
- **Title:** Implement Local Storage Persistence to Retain Tasks Across Page Refreshes
- **Link:** https://epam-team-nub9ahqn.atlassian.net/browse/KAN-35

## Assumptions / Notes (uI automation)

- Tests are written as UI E2hBDD scenarios; some steps verify Local Storage via browser automation (e.g., Cypress `cypress.window().its('localStorage')` or Playwright's `context.storageState` and eval in page context).
 - The Local Storage key is not explicitly confirmed in this Jira; tests refer to a configured key variable `<TasksStorageKey>`. *(If the key known is `demo_task_board_tasks`, update step definitions accordingly.)*
- Filter persistence is **optional** tested as specified in FR-6: default behavior resets to "All" on reload.

---

## Gherkin (UI, automatable)

```gherkin
@KAN-35 @ui
Feature: Local Storage persistence for Task Board
  To avoid data loss, the task board persists tasks in browser Local Storage and restores them on app load.

  Background:
    Given the Task Board app is open
    And the browser Local Storage is cleared for the app origin

  # ------------------------------------------------------------
  @smoke
  Scenario SC-01: Tasks are restored after page refresh (added task)
    When I add a new task with title "Pay Invoice 123" and priority "High"
    And I toggle the task status to "Done" for title "Pay Invoice 123"
    And I refresh the browser page
    Then I see a task with title "Pay Invoice 123"
    And the task shows priority "High"
    And the task shows status "Done"

  @regression
  Scenario SC-02: New task is written to Local Storage on Add Task
    When I add a new task with title "Standup notes" and priority "Low"
    Then the Local Storage entry for key "<TasksStorageKey>" contains a task with:
      | title         | Standup notes |
      | priority     | Low            |
      and the entry is valid JSON

  @smoke @regression
  Scenario SC-03: Tasks still persist when app is reloaded (simulate new session)
    When I add a new task with title "Book room" and priority "Medium"
    And I then close and reopen the app in the same browser context
    Then I see a task with title "Book room"

  @regression
  Scenario SC-04: Status toggle is persisted after refresh (Open -> Done)
    When I add a new task with title "Review PR" and priority "Medium"
    And I toggle the task status to "Done" for title "Review PR"
    And I refresh the browser page
    Then the task with title "Review PR" shows status "Done"

  @regression
  Scenario SC-05: Status toggle is persisted after refresh (Done -> Open)
    When I add a new task with title "Fix flaky test" and priority "High"
    And I toggle the task status to "Done" for title "Fix flaky test"
    And I toggle the task status to "Open" for title "Fix flaky test"
    And I refresh the browser page
    Then the task with title "Fix flaky test" shows status "Open"

  @regression
  Scenario SC-06: Deleted task is not restored after refresh
    When I add a new task with title "Temp task" index" and priority "Low"
    And I delete the task with title "Temp task" index"
    And I refresh the browser page
    Then I do not see a task with title "Temp task index"

  @regression
  Scenario SC-07: Empty board persists (no starter tasks re-injected)
    When I delete all tasks from the board
    And I refresh the browser page
    Then the task list is empty
    And an empty state message is visible

  @negative @regression
  Scenario NG-08: Missing Local Storage entry falls back to default starter tasks on load
    Given the Local Storage entry for key "<TasksStorageKey>" does not exist
    When I refresh the browser page
    Then the board shows the default starter tasks
    And the app does not display an error or crash

  @negative @regression
  Scenario NG-09: Corrupted Local Storage JSON falls back to default starter tasks on load
    Given I set the Local Storage entry for key "<TasksStorageKey>" to the value "{"
    When I refresh the browser page
    Then the board shows the default starter tasks
    And the app does not display an error or crash

  @negative @regression
  Scenario NG-10: Empty Local Storage value falls back to default starter tasks on load
    Given I set the Local Storage entry for key "<TasksStorageKey>" to the value ""
    When I refresh the browser page
    Then the board shows the default starter tasks
    And the app does not display an error or crash

  # FR-6 - filter persistence is optional; this scenario assumes the default behavior: reset to "All" on reload
  @regression
  Scenario SC-11: Active filter resets to "All" after reload (if filter is not persisted)
    When I select the filter "Done" on the board
    And I refresh the browser page
    Then the filter "selected" value is "All"
```
