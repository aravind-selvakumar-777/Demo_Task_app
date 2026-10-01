import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('Initial Render', () => {
    it('should render the app title', () => {
      render(<App />);
      expect(screen.getByText('Task Board')).toBeInTheDocument();
    });

    it('should render the subtitle', () => {
      render(<App />);
      expect(screen.getByText('Capture a few work items, mark progress, and keep the list tidy.')).toBeInTheDocument();
    });

    it('should display starter tasks on first load', () => {
      render(<App />);
      expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
      expect(screen.getByText('Prepare demo data')).toBeInTheDocument();
      expect(screen.getByText('Send summary to the team')).toBeInTheDocument();
    });

    it('should display correct task statistics', () => {
      render(<App />);
      const statsGrid = screen.getByLabelText('Task statistics');
      expect(within(statsGrid).getByText('3')).toBeInTheDocument(); // Total
      expect(within(statsGrid).getByText('2')).toBeInTheDocument(); // Open
      expect(within(statsGrid).getByText('1')).toBeInTheDocument(); // Done
    });

    it('should render the task form', () => {
      render(<App />);
      expect(screen.getByPlaceholderText('Add a task')).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /add task/i })).toBeInTheDocument();
    });

    it('should render filter buttons', () => {
      render(<App />);
      expect(screen.getByRole('button', { name: /^all$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^open$/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /^done$/i })).toBeInTheDocument();
    });
  });

  describe('Adding Tasks', () => {
    it('should add a new task with default Medium priority', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'New test task');
      await user.click(addButton);
      
      const newTask = screen.getByText('New test task');
      expect(newTask).toBeInTheDocument();
      
      // Find the task card containing the new task and verify its priority
      const taskCard = newTask.closest('article');
      expect(taskCard).toBeInTheDocument();
      const priorityElement = within(taskCard!).getByText(/^Medium priority$/i);
      expect(priorityElement).toBeInTheDocument();
    });

    it('should add a task with High priority', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const prioritySelect = screen.getByRole('combobox');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'My unique high priority task');
      await user.selectOptions(prioritySelect, 'High');
      await user.click(addButton);
      
      const newTask = screen.getByText('My unique high priority task');
      expect(newTask).toBeInTheDocument();
      
      // Find the task card containing the new task and verify its priority
      const taskCard = newTask.closest('article');
      expect(taskCard).toBeInTheDocument();
      const priorityElement = within(taskCard!).getByText(/^High priority$/i);
      expect(priorityElement).toBeInTheDocument();
    });

    it('should add a task with Low priority', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const prioritySelect = screen.getByRole('combobox');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'My unique low priority task');
      await user.selectOptions(prioritySelect, 'Low');
      await user.click(addButton);
      
      const newTask = screen.getByText('My unique low priority task');
      expect(newTask).toBeInTheDocument();
      
      // Find the task card containing the new task and verify its priority
      const taskCard = newTask.closest('article');
      expect(taskCard).toBeInTheDocument();
      const priorityElement = within(taskCard!).getByText(/^Low priority$/i);
      expect(priorityElement).toBeInTheDocument();
    });

    it('should clear input after adding a task', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task') as HTMLInputElement;
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'Test task');
      await user.click(addButton);
      
      expect(input.value).toBe('');
    });

    it('should reset priority to Medium after adding a task', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const prioritySelect = screen.getByRole('combobox') as HTMLSelectElement;
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'Test task');
      await user.selectOptions(prioritySelect, 'High');
      await user.click(addButton);
      
      expect(prioritySelect.value).toBe('Medium');
    });

    it('should not add a task with empty title', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const addButton = screen.getByRole('button', { name: /add task/i });
      const initialTaskCount = screen.getAllByRole('article').length;
      
      await user.click(addButton);
      
      const finalTaskCount = screen.getAllByRole('article').length;
      expect(finalTaskCount).toBe(initialTaskCount);
    });

    it('should not add a task with only whitespace', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      const initialTaskCount = screen.getAllByRole('article').length;
      
      await user.type(input, '   ');
      await user.click(addButton);
      
      const finalTaskCount = screen.getAllByRole('article').length;
      expect(finalTaskCount).toBe(initialTaskCount);
    });

    it('should trim whitespace from task title', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, '  Trimmed task  ');
      await user.click(addButton);
      
      expect(screen.getByText('Trimmed task')).toBeInTheDocument();
    });

    it('should update task statistics after adding a task', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'New task');
      await user.click(addButton);
      
      // Total should increase to 4, Open should increase to 3
      const statsGrid = screen.getByLabelText('Task statistics');
      expect(within(statsGrid).getByText('4')).toBeInTheDocument();
      expect(within(statsGrid).getByText('3')).toBeInTheDocument();
    });
  });

  describe('Toggling Task Status', () => {
    it('should toggle a task from open to done', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const toggleButtons = screen.getAllByRole('button', { name: /complete/i });
      const firstToggleButton = toggleButtons[0];
      
      await user.click(firstToggleButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /reopen review the landing copy/i })).toBeInTheDocument();
      });
    });

    it('should toggle a task from done to open', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const reopenButton = screen.getByRole('button', { name: /reopen send summary to the team/i });
      
      await user.click(reopenButton);
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /complete send summary to the team/i })).toBeInTheDocument();
      });
    });

    it('should update task statistics after toggling status', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const toggleButtons = screen.getAllByRole('button', { name: /complete/i });
      await user.click(toggleButtons[0]);
      
      await waitFor(() => {
        // Open: 2 -> 1, Done: 1 -> 2
        const statsGrid = screen.getByLabelText('Task statistics');
        const statValues = within(statsGrid).getAllByText(/[0-9]+/);
        // Total=3, Open=1, Done=2
        expect(statValues[0]).toHaveTextContent('3'); // Total
        expect(statValues[1]).toHaveTextContent('1'); // Open
        expect(statValues[2]).toHaveTextContent('2'); // Done
      });
    });
  });

  describe('Deleting Tasks', () => {
    it('should delete a task', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const taskTitle = 'Review the landing copy';
      expect(screen.getByText(taskTitle)).toBeInTheDocument();
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);
      
      expect(screen.queryByText(taskTitle)).not.toBeInTheDocument();
    });

    it('should update task statistics after deleting a task', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);
      
      await waitFor(() => {
        // Total: 3 -> 2, Open: 2 -> 1
        const statsGrid = screen.getByLabelText('Task statistics');
        const statValues = within(statsGrid).getAllByText(/[0-9]+/);
        expect(statValues[0]).toHaveTextContent('2'); // Total
        expect(statValues[1]).toHaveTextContent('1'); // Open
        expect(statValues[2]).toHaveTextContent('1'); // Done
      });
    });

    it('should be able to delete all tasks', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      
      for (const button of deleteButtons) {
        await user.click(button);
      }
      
      await waitFor(() => {
        expect(screen.getByText('No tasks match this filter.')).toBeInTheDocument();
      });
    });
  });

  describe('Filtering Tasks', () => {
    it('should show all tasks by default', () => {
      render(<App />);
      expect(screen.getAllByRole('article').length).toBe(3);
    });

    it('should filter to show only open tasks', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const openFilterButton = screen.getByRole('button', { name: /^open$/i });
      await user.click(openFilterButton);
      
      expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
      expect(screen.getByText('Prepare demo data')).toBeInTheDocument();
      expect(screen.queryByText('Send summary to the team')).not.toBeInTheDocument();
    });

    it('should filter to show only done tasks', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const doneFilterButton = screen.getByRole('button', { name: /^done$/i });
      await user.click(doneFilterButton);
      
      expect(screen.queryByText('Review the landing copy')).not.toBeInTheDocument();
      expect(screen.queryByText('Prepare demo data')).not.toBeInTheDocument();
      expect(screen.getByText('Send summary to the team')).toBeInTheDocument();
    });

    it('should switch back to show all tasks', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const doneFilterButton = screen.getByRole('button', { name: /^done$/i });
      await user.click(doneFilterButton);
      
      const allFilterButton = screen.getByRole('button', { name: /^all$/i });
      await user.click(allFilterButton);
      
      expect(screen.getAllByRole('article').length).toBe(3);
    });

    it('should highlight active filter button', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const openFilterButton = screen.getByRole('button', { name: /^open$/i });
      await user.click(openFilterButton);
      
      expect(openFilterButton).toHaveClass('active');
    });

    it('should show empty state when filter has no matching tasks', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Delete all tasks first
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      for (const button of deleteButtons) {
        await user.click(button);
      }
      
      const openFilterButton = screen.getByRole('button', { name: /^open$/i });
      await user.click(openFilterButton);
      
      expect(screen.getByText('No tasks match this filter.')).toBeInTheDocument();
    });
  });

  describe('Task Statistics', () => {
    it('should show correct statistics for mixed task states', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Initial: Total=3, Open=2, Done=1
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'Task 1');
      await user.click(addButton);
      await user.type(input, 'Task 2');
      await user.click(addButton);
      
      // After adding 2: Total=5, Open=4, Done=1
      const statsGrid = screen.getByLabelText('Task statistics');
      const statValues = within(statsGrid).getAllByText(/[0-9]+/);
      expect(statValues[0]).toHaveTextContent('5'); // Total
      expect(statValues[1]).toHaveTextContent('4'); // Open
      expect(statValues[2]).toHaveTextContent('1'); // Done
    });

    it('should show zero statistics when all tasks are deleted', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      for (const button of deleteButtons) {
        await user.click(button);
      }
      
      await waitFor(() => {
        const statsGrid = screen.getByLabelText('Task statistics');
        const statValues = within(statsGrid).getAllByText(/[0-9]+/);
        expect(statValues[0]).toHaveTextContent('0'); // Total
        expect(statValues[1]).toHaveTextContent('0'); // Open
        expect(statValues[2]).toHaveTextContent('0'); // Done
      });
    });
  });

  describe('Form Submission', () => {
    it('should add task when pressing Enter in input field', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      
      await user.type(input, 'Task via Enter{Enter}');
      
      expect(screen.getByText('Task via Enter')).toBeInTheDocument();
    });

    it('should prevent page reload on form submission', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      
      await user.type(input, 'Test task{Enter}');
      
      // If we reach this point, the form didn't reload the page
      expect(screen.getByText('Test task')).toBeInTheDocument();
    });
  });
});
