# test_cases.md

## Jira: KAN-30 — Implement Local Storage Persistence for Task Board
- Jira link: https://epam-team-nub9ahqn.atlassian.net/browse/KAN-30
- Repository: https://github.com/aravind-selvakumar-777/Demo_Task_app
- Branch: feature/KAN-30

## Feature Description
Implement browser Local Storage persistence for Demo Task Board so that create/update/delete operations are saved and the board state (including task statistics) is restored on page reload.

## Assumptions / Notes
- The Local Storage key name is not specified in KAN-30; scenarios refer to “persisted board data” generically. UI automation may clear/set Local Storage via browser script evaluation.
- “Starter tasks” means the default demo tasks displayed when no persisted data exists.
- Fallback for corrupted/invalid persisted data is not explicitly defined in AC; scenarios assert the minimum safe behavior: app loads without an uncaught error and displays starter tasks with consistent counters.

```gherkin
@KAN-30 @ui
Feature: Implement Local Storage Persistence for Task Board
  As a user
  I want tasks and task statistics to persist using browser Local Storage
  So that refreshing the page does not reset my board state

  Background: Open app with a clean persistence state
    Given I open the Task Board app
    And I clear the app's browser Local Storage
    And I reload the page

  Scenario 1: Default behavior on empty/missing Local Storage shows starter tasks
    Given Local Storage does not contain persisted board data
    When the app loads
    Then the default starter tasks are displayed
    And the task statistics show non-negative integer counts for Total, Open, and Done

  Scenario Outline 2: Happy path - created tasks persist after page reload
    Given I am on the Task Board page
    When I create a new task with title "<title>" and priority "<priority>"
    And I verify the task with title "<title>" appears on the board
    And I reload the page
    Then the task with title "<title>" is still displayed
    And the task with title "<title>" shows priority "<priority>"
    And the task with title "<title>" shows status "Open"

    Examples:
      | title              | priority |
      | Write test plan    | High     |
      | Regression task #1 | Low      |

  Scenario Outline 3: Happy path - status updates persist after page reload (Done and Reopen)
    Given I create a new task with title "<title>" and priority "<priority>"
    When I mark the task with title "<title>" as Done
    And I reload the page
    Then the task with title "<title>" is displayed with status "Done"
    When I reopen the task with title "<title>" to Open
    And I reload the page
    Then the task with title "<title>" is displayed with status "Open"

    Examples:
      | title                 | priority |
      | Persist status toggle | Medium   |

  Scenario Outline 4: Happy path - deleted tasks do not reappear after page reload
    Given I create a new task with title "<title>" and priority "<priority>"
    And I verify the task with title "<title>" appears on the board
    When I delete the task with title "<title>"
    And I reload the page
    Then the task with title "<title>" is not displayed on the board

    Examples:
      | title          | priority |
      | Temp to delete | Low      |

  Scenario 5: Restores full board state after reload with mixed create/update/delete operations
    Given I am on the Task Board page
    When I create a new task with title "Task A" and priority "High"
    And I create a new task with title "Task B" and priority "Medium"
    And I mark the task with title "Task B" as Done
    And I delete the task with title "Task A"
    And I reload the page
    Then the task with title "Task B" is displayed
    And the task with title "Task B" shows status "Done"
    And the task with title "Task A" is not displayed

  Scenario Outline 6: Consistency of stats/counters after reload
    Given I record the current task statistics as baseline
    When I create <createCount> new tasks with priority "Low"
    And I mark <doneCount> of the newly created tasks as Done
    And I reload the page
    Then the Total task count equals baseline Total plus <createCount>
    And the Done task count equals baseline Done plus <doneCount>
    And the Open task count equals baseline Open plus <createCount - doneCount>

    Examples:
      | createCount | doneCount |
      | 2           | 1         |

  Scenario Outline 7: Fallback behavior when Local Storage data is corrupted/invalid
    Given I set persisted board data in Local Storage to <invalidValue>
    When I reload the page
    Then the app loads without an uncaught error
    And the default starter tasks are displayed
    And the task statistics (Total, Open, Done) are consistent with the displayed starter tasks

    Examples:
      | invalidValue |
      | NOT_JSON     |
      | ""          |
      | {}           |
      | [{ id: 1 }]  |

  Scenario 8: Persistence does not require backend API/auth/database changes (out of scope)
    Given the app does not prompt for login
    When I create a new task with title "Offline task" and priority "Medium"
    And I reload the page
    Then the task with title "Offline task" is still displayed
```