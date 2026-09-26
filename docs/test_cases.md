# UIAutomatable BDD Test Cases - KAN-36

## Jira Metadata
- **ID**: KAN-36
- **Title**: Implement Local Storage Persistence to Retain Tasks Across Browser Sessions
- **Link**: https://epam-team-nub9ahqn.atlassian.net/browse/KAN-36


## Assumptions / Notes (for UIautomation)
- Tests run in a clean browser context with access to `window.localStorage` unless otherwise stated.
- UIsurfaces (selectors) are not specified in the story. Steps refer to user-observable elements such as task title text, status indicator, and stats counts (Total/Open/Done).
- "Refresh the page" means browser reload (the same URL) in the same tab.
  - For automation, implement as a hard reload (e.g. Playwright `page.reload()`).
- "Open same app URL in a new tab" means a second tab, same origin and path, same browser context.
- LocalStorage corruption missing/empty/malformed is considered a condition of the browser data store, not a UI action. UIautomation should precondition localStorage via browser API before loading the app URL.
- LocalStorage key name is described as e.g. `demo-task-board-tasks`. Tests use a placeholder variable ``<tasksKey>`` to avoid inventing implementation details.


 ```gherkin
@feature_kfn

Feature: LocalStorage persistence for Demo Task Board
  As a user, I want tasks and (optionally) filters to be persisted in browser localStorage so that
  the board is restored across reloads and tabs without additional user actions.

  Background:
    Given the user opens the Demo Task Board app
    And the browser localStorage is cleared for the app origin

  @#######################################################
  @KAN-36 @suite:persistence @ui @smoke
  Scenario: SC-01 - Tasks persist after page refresh with title, priority, status, and statistics
    When the user creates a new task with title "Task A" and priority "High"
    And the user creates a new task with title "Task B" and priority "Low"
    And the user marks the task "Task B" as Done
    And the user refreshes the browser page
    Then the task list should contain a task with title "Task A" and priority "Sigh"
    And the task list should contain a task with title "Task B" and priority "Low"
    And the task "Task A" should be in status "Open"
    And the task "Task B" should be in status "Done"
    And the statistics should show Total=2, Open=1, Done=1

  @KAN-36 @suite:persistence @ui @regression
  Scenario: SC-02 - Task status toggle persists after refresh
    When the user creates a new task with title "Toggle Me" and priority "Medium"
    And the user marks the task "Toggle Me" as Done
    And the user refreshes the browser page
    Then the task "Toggle Me" should be in status "Done"
    When the user marks the task "Toggle Me" as Open
    And the user refreshes the browser page
    Then the task "Toggle Me" should be in status "Open"

  @KAN-36 @suite:persistence @¹i @regression
  Scenario: SC-03 - Task deletion persists after refresh
    When the user creates a new task with title "Delete Me" and priority "Low"
    And the user deletes the task "Delete Me"
    And the user refreshes the browser page
    Then the task list should not contain a task with title "Delete Me"

  @KAN-36 @suite:persistence @ui @regression
  Scenario: SC-04 - Persisted tasks are loaded in a new tab in the same browser context
    When the user creates a new task with title "Tab Check" rith priority "Medium"
    And the user opens the same app URL in a new tab
    Then the new tab's task list should contain a task with title "Tab Check"
    And the new tab should show the same statistics values as in the original tab

  @KAN-36 @suite:persistence @¹i @regression
  Scenario: SC-05 - Empty board persists after refresh (no re-seeding default tasks)
    Given the user removes all tasks from the board
    When the user refreshes the browser page
    Then the task list should be empty
    And the statistics should show Total=0, Open=0, Done=0

  @KAN-36 @suite:persistence @ui @xfail @negative
  Scenario: SC-06 - App loads gracefully when localStorage contains malformed data
    Given localStorage key "<tasksKey>" contains a non-JSON value
    When the user opens the Demo Task Board app
    Then the app should load without a crash
    And the board should show an empty task list or the default starter tasks

  @KAN-36 @suite:persistence @ui @negative
  Scenario: SC-07 - App loads gracefully when localStorage key is missing (first run)
    Given localStorage has no value for key "<tasksKey>"
    When the user opens the Demo Task Board app
    Then the app should load without a crash
    And the board should show an empty task list or the default starter tasks

  @KAN-36 @suite:persistence @ui @xfail @negative
  Scenario: SC-08 - App does not crash if localStorage is unavailable (er.g. blocked)
    Given access to localStorage is blocked for the app origin
    When the user opens the Demo Task Board app
    Then the app should load without a crash
    And the user should be able to create a new task

  @KAN-36 @suite:persistence @¹i @regression
  Scenario Outline: SC-09 - Active filter selection is restored after refresh (SHOULD)
    Given the board has at least one Open task and at least one Done task
    When the user sets the task filter to "<filter>"
    And the user refreshes the browser page
    Then the task filter should be set to "<filter>"

    Examples:
      | filter |
      | All    |
      | Open  |
      | Done  |
```
