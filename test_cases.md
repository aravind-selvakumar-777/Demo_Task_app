# test_cases.md

## Jira: KAN-30 — Implement Local Storage Persistence for Task Board

- Jira link: https://epam-team-nub9ahqn.atlassian.net/browse/KAN-40
- Repository: https://github.com/aravind-selvakumar-777/Demo_Task_app
- Branch: feature/KAN-30

## Feature Description
The Demo Task Board must persist tasks (ID, title, status, priority) in browser Local Storage on create/update/delete, and hydrate from Local Storage on app load so that a page refresh restores the board state and statistics.

## Assumptions / Notes

- Steps refer to "browser Local Storage" generically because the AC
does not specify the storage key. Automation can implement
steps to clear/set localStorage for either the whole origin or
the app's specific key.
- "Starter tasks" = the default tasks shown on first load when
no persisted data exists.