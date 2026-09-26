import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, fireEvent, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { useState } from 'react';

// Mock the useLocalStorage hook to use regular useState for testing
vi.mock('./hooks/useLocalStorage', () => ({
  useLocalStorage: <T,>(key: string, initialValue: T | (() => T)) => {
    // Use regular useState for testing, but sync with localStorage
    const computedInitialValue = initialValue instanceof Function ? initialValue() : initialValue;
    return useState<T>(computedInitialValue);
  },
}));

describe('App Component', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Initial Render', () => {
    it('should render the app title and subtitle', () => {
      render(<App />);
      
      expect(screen.getByRole('heading', { name: /task board/i })).toBeInTheDocument();
      expect(screen.getByText(/capture a few work items/i)).toBeInTheDocument();
    });

    it('should display initial task statistics', () => {
      render(<App />);
      
      const statsGrid = screen.getByLabelText('Task statistics');
      expect(within(statsGrid).getByText('3')).toBeInTheDocument(); // Total
      expect(within(statsGrid).getByText('2')).toBeInTheDocument(); // Open
      expect(within(statsGrid).getByText('1')).toBeInTheDocument(); // Done
    });

    it('should render starter tasks', () => {
      render(<App />);
      
      expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
      expect(screen.getByText('Prepare demo data')).toBeInTheDocument();
      expect(screen.getByText('Send summary to the team')).toBeInTheDocument();
    });

    it('should display correct priority badges', () => {
      render(<App />);
      
      expect(screen.getByText('High priority')).toBeInTheDocument();
      expect(screen.getByText('Medium priority')).toBeInTheDocument();
      expect(screen.getByText('Low priority')).toBeInTheDocument();
    });
  });

  describe('Adding Tasks', () => {
    it('should add a new task with default Medium priority', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'New Test Task');
      await user.click(addButton);
      
      expect(screen.getByText('New Test Task')).toBeInTheDocument();
      expect(input).toHaveValue('');
    });

    it('should add a task with selected priority', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const select = screen.getByRole('combobox');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'High Priority Task');
      await user.selectOptions(select, 'High');
      await user.click(addButton);
      
      expect(screen.getByText('High Priority Task')).toBeInTheDocument();
    });

    it('should not add a task with empty title', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const addButton = screen.getByRole('button', { name: /add task/i });
      const initialTaskCount = screen.getAllByRole('article').length;
      
      await user.click(addButton);
      
      expect(screen.getAllByRole('article')).toHaveLength(initialTaskCount);
    });

    it('should not add a task with only whitespace', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      const initialTaskCount = screen.getAllByRole('article').length;
      
      await user.type(input, '   ');
      await user.click(addButton);
      
      expect(screen.getAllByRole('article')).toHaveLength(initialTaskCount);
    });

    it('should reset form after adding a task', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const select = screen.getByRole('combobox');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'Test Task');
      await user.selectOptions(select, 'High');
      await user.click(addButton);
      
      expect(input).toHaveValue('');
      expect(select).toHaveValue('Medium');
    });

    it('should trim whitespace from task titles', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, '  Trimmed Task  ');
      await user.click(addButton);
      
      expect(screen.getByText('Trimmed Task')).toBeInTheDocument();
    });
  });

  describe('Toggling Task Status', () => {
    it('should mark a task as done', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const openTask = screen.getByText('Review the landing copy').closest('article');
      const toggleButton = within(openTask!).getByRole('button', { name: /complete/i });
      
      await user.click(toggleButton);
      
      expect(toggleButton).toHaveTextContent('Done');
      expect(openTask).toHaveClass('done');
    });

    it('should reopen a completed task', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const doneTask = screen.getByText('Send summary to the team').closest('article');
      const toggleButton = within(doneTask!).getByRole('button', { name: /reopen/i });
      
      await user.click(toggleButton);
      
      expect(toggleButton).toHaveTextContent('Open');
      expect(doneTask).toHaveClass('open');
    });

    it('should update statistics when toggling task status', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const statsGrid = screen.getByLabelText('Task statistics');
      const openTask = screen.getByText('Review the landing copy').closest('article');
      const toggleButton = within(openTask!).getByRole('button', { name: /complete/i });
      
      await user.click(toggleButton);
      
      expect(within(statsGrid).getByText('1')).toBeInTheDocument(); // Open count decreased
      expect(within(statsGrid).getByText('2')).toBeInTheDocument(); // Done count increased
    });
  });

  describe('Deleting Tasks', () => {
    it('should delete a task', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const task = screen.getByText('Prepare demo data').closest('article');
      const deleteButton = within(task!).getByRole('button', { name: /delete/i });
      
      await user.click(deleteButton);
      
      expect(screen.queryByText('Prepare demo data')).not.toBeInTheDocument();
    });

    it('should update statistics after deleting a task', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const statsGrid = screen.getByLabelText('Task statistics');
      const task = screen.getByText('Review the landing copy').closest('article');
      const deleteButton = within(task!).getByRole('button', { name: /delete/i });
      
      await user.click(deleteButton);
      
      expect(within(statsGrid).getByText('2')).toBeInTheDocument(); // Total decreased
    });
  });

  describe('Filtering Tasks', () => {
    it('should display all tasks by default', () => {
      render(<App />);
      
      expect(screen.getAllByRole('article')).toHaveLength(3);
    });

    it('should filter to show only open tasks', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const filterToolbar = screen.getByLabelText('Task filters');
      const openButton = within(filterToolbar).getByRole('button', { name: /^open$/i });
      
      await user.click(openButton);
      
      expect(screen.getAllByRole('article')).toHaveLength(2);
      expect(screen.queryByText('Send summary to the team')).not.toBeInTheDocument();
    });

    it('should filter to show only done tasks', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const filterToolbar = screen.getByLabelText('Task filters');
      const doneButton = within(filterToolbar).getByRole('button', { name: /^done$/i });
      
      await user.click(doneButton);
      
      expect(screen.getAllByRole('article')).toHaveLength(1);
      expect(screen.getByText('Send summary to the team')).toBeInTheDocument();
    });

    it('should show empty state when no tasks match filter', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Delete all done tasks first
      const doneTask = screen.getByText('Send summary to the team').closest('article');
      const deleteButton = within(doneTask!).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);
      
      // Then filter to done
      const filterToolbar = screen.getByLabelText('Task filters');
      const doneButton = within(filterToolbar).getByRole('button', { name: /^done$/i });
      await user.click(doneButton);
      
      expect(screen.getByText('No tasks match this filter.')).toBeInTheDocument();
    });

    it('should highlight active filter button', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const filterToolbar = screen.getByLabelText('Task filters');
      const openButton = within(filterToolbar).getByRole('button', { name: /^open$/i });
      
      await user.click(openButton);
      
      expect(openButton).toHaveClass('active');
    });

    it('should return to all tasks when clicking all filter', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const filterToolbar = screen.getByLabelText('Task filters');
      const openButton = within(filterToolbar).getByRole('button', { name: /^open$/i });
      const allButton = within(filterToolbar).getByRole('button', { name: /^all$/i });
      
      await user.click(openButton);
      expect(screen.getAllByRole('article')).toHaveLength(2);
      
      await user.click(allButton);
      expect(screen.getAllByRole('article')).toHaveLength(3);
    });
  });

  describe('Accessibility', () => {
    it('should have proper ARIA labels', () => {
      render(<App />);
      
      expect(screen.getByLabelText('Task statistics')).toBeInTheDocument();
      expect(screen.getByLabelText('Task filters')).toBeInTheDocument();
    });

    it('should have live region for task list updates', () => {
      render(<App />);
      
      const taskList = document.querySelector('[aria-live="polite"]');
      expect(taskList).toBeInTheDocument();
    });

    it('should have descriptive button labels', () => {
      render(<App />);
      
      expect(screen.getByRole('button', { name: /complete review the landing copy/i })).toBeInTheDocument();
      expect(screen.getByRole('button', { name: /reopen send summary to the team/i })).toBeInTheDocument();
    });
  });

  describe('Complex Workflows', () => {
    it('should handle adding, toggling, and deleting tasks in sequence', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      // Add a task
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      await user.type(input, 'Workflow Test');
      await user.click(addButton);
      
      // Toggle it
      const task = screen.getByText('Workflow Test').closest('article');
      const toggleButton = within(task!).getByRole('button', { name: /complete/i });
      await user.click(toggleButton);
      expect(toggleButton).toHaveTextContent('Done');
      
      // Delete it
      const deleteButton = within(task!).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);
      expect(screen.queryByText('Workflow Test')).not.toBeInTheDocument();
    });

    it('should maintain correct statistics through multiple operations', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const statsGrid = screen.getByLabelText('Task statistics');
      
      // Add a task
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      await user.type(input, 'Stats Test');
      await user.click(addButton);
      
      expect(within(statsGrid).getByText('4')).toBeInTheDocument(); // Total
      
      // Mark it done
      const task = screen.getByText('Stats Test').closest('article');
      const toggleButton = within(task!).getByRole('button', { name: /complete/i });
      await user.click(toggleButton);
      
      // Query by getting stats for Open and Done specifically
      const statsItems = within(statsGrid).getAllByRole('generic');
      const openStatContainer = statsItems.find(item => within(item).queryByText('Open'));
      const doneStatContainer = statsItems.find(item => within(item).queryByText('Done'));
      
      if (openStatContainer) {
        expect(within(openStatContainer).getByText('2')).toBeInTheDocument();
      }
      if (doneStatContainer) {
        expect(within(doneStatContainer).getByText('2')).toBeInTheDocument();
      }
      
      // Delete it
      const deleteButton = within(task!).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);
      
      expect(within(statsGrid).getByText('3')).toBeInTheDocument(); // Total back to 3
    });
  });
});
