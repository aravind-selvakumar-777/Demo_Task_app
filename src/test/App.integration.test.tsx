import { describe, it, expect, beforeEach } from 'vitest';
import { render, screen, cleanup, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from '../App';

describe('App Integration - LocalStorage Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    cleanup();
  });

  describe('Task Persistence', () => {
    it('should persist newly added tasks across remounts', async () => {
      const user = userEvent.setup();
      
      // First mount: add a task
      const { unmount } = render(<App />);
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'Persistent task');
      await user.click(addButton);
      
      expect(screen.getByText('Persistent task')).toBeInTheDocument();
      unmount();
      
      // Second mount: verify task persists
      render(<App />);
      expect(screen.getByText('Persistent task')).toBeInTheDocument();
    });

    it('should persist multiple added tasks across remounts', async () => {
      const user = userEvent.setup();
      
      // First mount: add multiple tasks
      const { unmount } = render(<App />);
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'Task 1');
      await user.click(addButton);
      await user.type(input, 'Task 2');
      await user.click(addButton);
      await user.type(input, 'Task 3');
      await user.click(addButton);
      
      unmount();
      
      // Second mount: verify all tasks persist
      render(<App />);
      expect(screen.getByText('Task 1')).toBeInTheDocument();
      expect(screen.getByText('Task 2')).toBeInTheDocument();
      expect(screen.getByText('Task 3')).toBeInTheDocument();
    });

    it('should persist task status changes across remounts', async () => {
      const user = userEvent.setup();
      
      // First mount: toggle a task to done
      const { unmount } = render(<App />);
      const toggleButton = screen.getAllByRole('button', { name: /complete/i })[0];
      
      await user.click(toggleButton);
      unmount();
      
      // Second mount: verify status persists
      render(<App />);
      expect(screen.getByRole('button', { name: /reopen review the landing copy/i })).toBeInTheDocument();
    });

    it('should persist task deletions across remounts', async () => {
      const user = userEvent.setup();
      
      // First mount: delete a task
      const { unmount } = render(<App />);
      const taskTitle = 'Review the landing copy';
      expect(screen.getByText(taskTitle)).toBeInTheDocument();
      
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      await user.click(deleteButtons[0]);
      
      expect(screen.queryByText(taskTitle)).not.toBeInTheDocument();
      unmount();
      
      // Second mount: verify deletion persists
      render(<App />);
      expect(screen.queryByText(taskTitle)).not.toBeInTheDocument();
    });

    it('should persist empty task list across remounts', async () => {
      const user = userEvent.setup();
      
      // First mount: delete all tasks
      const { unmount } = render(<App />);
      const deleteButtons = screen.getAllByRole('button', { name: /delete/i });
      
      for (const button of deleteButtons) {
        await user.click(button);
      }
      
      expect(screen.getByText('No tasks match this filter.')).toBeInTheDocument();
      unmount();
      
      // Second mount: verify empty state persists
      render(<App />);
      expect(screen.getByText('No tasks match this filter.')).toBeInTheDocument();
    });

    it('should persist task priority across remounts', async () => {
      const user = userEvent.setup();
      
      // First mount: add task with High priority
      const { unmount } = render(<App />);
      const input = screen.getByPlaceholderText('Add a task');
      const prioritySelect = screen.getByRole('combobox');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'My test high priority task');
      await user.selectOptions(prioritySelect, 'High');
      await user.click(addButton);
      
      const newTask = screen.getByText('My test high priority task');
      expect(newTask).toBeInTheDocument();
      unmount();
      
      // Second mount: verify priority persists
      render(<App />);
      const persistedTask = screen.getByText('My test high priority task');
      expect(persistedTask).toBeInTheDocument();
      
      // Check priority within the task card
      const taskCard = persistedTask.closest('article');
      const priorityElement = within(taskCard!).getByText(/^High priority$/i);
      expect(priorityElement).toBeInTheDocument();
    });

    it('should persist statistics across remounts', async () => {
      const user = userEvent.setup();
      
      // First mount: modify tasks
      const { unmount } = render(<App />);
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'New task 1');
      await user.click(addButton);
      await user.type(input, 'New task 2');
      await user.click(addButton);
      
      // Total should be 5 (3 starter + 2 new)
      let statsGrid = screen.getByLabelText('Task statistics');
      expect(within(statsGrid).getByText('5')).toBeInTheDocument();
      unmount();
      
      // Second mount: verify statistics persist
      render(<App />);
      statsGrid = screen.getByLabelText('Task statistics');
      expect(within(statsGrid).getByText('5')).toBeInTheDocument();
    });

    it('should maintain task order across remounts', async () => {
      const user = userEvent.setup();
      
      // First mount: add tasks
      const { unmount } = render(<App />);
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'First added');
      await user.click(addButton);
      await user.type(input, 'Second added');
      await user.click(addButton);
      
      const articles = screen.getAllByRole('article');
      const firstTaskTitle = articles[0].querySelector('h2')?.textContent;
      expect(firstTaskTitle).toBe('Second added'); // Newest first
      unmount();
      
      // Second mount: verify order persists
      render(<App />);
      const remountedArticles = screen.getAllByRole('article');
      const remountedFirstTaskTitle = remountedArticles[0].querySelector('h2')?.textContent;
      expect(remountedFirstTaskTitle).toBe('Second added');
    });
  });

  describe('LocalStorage Data Integrity', () => {
    it('should load starter tasks on first visit when localStorage is empty', () => {
      render(<App />);
      
      expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
      expect(screen.getByText('Prepare demo data')).toBeInTheDocument();
      expect(screen.getByText('Send summary to the team')).toBeInTheDocument();
    });

    it('should handle corrupted localStorage data gracefully', () => {
      // Manually corrupt the localStorage
      localStorage.setItem('demo_tasks', 'invalid-json{');
      
      // Should fall back to starter tasks without crashing
      render(<App />);
      
      expect(screen.getByText('Review the landing copy')).toBeInTheDocument();
      expect(screen.getByText('Prepare demo data')).toBeInTheDocument();
      expect(screen.getByText('Send summary to the team')).toBeInTheDocument();
    });

    it('should overwrite corrupted data with valid data after user interaction', async () => {
      const user = userEvent.setup();
      
      // Start with corrupted data
      localStorage.setItem('demo_tasks', 'invalid-json{');
      
      const { unmount } = render(<App />);
      
      // Add a new task - this should save valid data
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'Recovery task');
      await user.click(addButton);
      
      unmount();
      
      // Verify localStorage now has valid data
      const storedData = localStorage.getItem('demo_tasks');
      expect(storedData).toBeTruthy();
      expect(() => JSON.parse(storedData!)).not.toThrow();
      
      // Verify data persists correctly on remount
      render(<App />);
      expect(screen.getByText('Recovery task')).toBeInTheDocument();
    });

    it('should store data in correct JSON format', async () => {
      const user = userEvent.setup();
      render(<App />);
      
      const input = screen.getByPlaceholderText('Add a task');
      const prioritySelect = screen.getByRole('combobox');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'Test task');
      await user.selectOptions(prioritySelect, 'High');
      await user.click(addButton);
      
      const storedData = localStorage.getItem('demo_tasks');
      expect(storedData).toBeTruthy();
      
      const parsedData = JSON.parse(storedData!);
      expect(Array.isArray(parsedData)).toBe(true);
      
      const addedTask = parsedData.find((task: any) => task.title === 'Test task');
      expect(addedTask).toBeDefined();
      expect(addedTask.priority).toBe('High');
      expect(addedTask.status).toBe('open');
      expect(addedTask.id).toBeDefined();
    });
  });

  describe('Complex User Workflows', () => {
    it('should persist complex user workflow across multiple remounts', async () => {
      const user = userEvent.setup();
      
      // Session 1: Add tasks
      let { unmount } = render(<App />);
      let input = screen.getByPlaceholderText('Add a task');
      let addButton = screen.getByRole('button', { name: /add task/i });
      
      await user.type(input, 'Workflow task 1');
      await user.click(addButton);
      await user.type(input, 'Workflow task 2');
      await user.click(addButton);
      unmount();
      
      // Session 2: Mark one as done
      ({ unmount } = render(<App />));
      const toggleButtons = screen.getAllByRole('button', { name: /complete workflow task/i });
      await user.click(toggleButtons[0]); // Click the first workflow task
      unmount();
      
      // Session 3: Add another task
      ({ unmount } = render(<App />));
      input = screen.getByPlaceholderText('Add a task');
      addButton = screen.getByRole('button', { name: /add task/i });
      await user.type(input, 'Workflow task 3');
      await user.click(addButton);
      unmount();
      
      // Session 4: Delete the first workflow task (which should be done now)
      ({ unmount } = render(<App />));
      // Find "Workflow task 2" which should be marked as done
      const workflowTask2 = screen.getByText('Workflow task 2');
      const taskCard = workflowTask2.closest('article');
      const deleteButton = within(taskCard!).getByRole('button', { name: /delete/i });
      await user.click(deleteButton);
      unmount();
      
      // Final verification
      render(<App />);
      expect(screen.queryByText('Workflow task 2')).not.toBeInTheDocument();
      expect(screen.getByText('Workflow task 1')).toBeInTheDocument();
      expect(screen.getByText('Workflow task 3')).toBeInTheDocument();
      
      // Verify total count is correct (3 starter + 3 added - 1 deleted = 5)
      const statsGrid = screen.getByLabelText('Task statistics');
      expect(within(statsGrid).getByText('5')).toBeInTheDocument();
    });

    it('should handle rapid state changes and persist correctly', async () => {
      const user = userEvent.setup();
      
      const { unmount } = render(<App />);
      const input = screen.getByPlaceholderText('Add a task');
      const addButton = screen.getByRole('button', { name: /add task/i });
      
      // Rapid additions
      for (let i = 1; i <= 5; i++) {
        await user.type(input, `Rapid task ${i}`);
        await user.click(addButton);
      }
      
      unmount();
      
      // Verify all rapid tasks persisted
      render(<App />);
      for (let i = 1; i <= 5; i++) {
        expect(screen.getByText(`Rapid task ${i}`)).toBeInTheDocument();
      }
    });
  });

  describe('Filter State (Not Persisted)', () => {
    it('should not persist filter state across remounts', async () => {
      const user = userEvent.setup();
      
      // First mount: apply filter
      const { unmount } = render(<App />);
      const openFilterButton = screen.getByRole('button', { name: /^open$/i });
      await user.click(openFilterButton);
      
      expect(openFilterButton).toHaveClass('active');
      unmount();
      
      // Second mount: filter should reset to 'all'
      render(<App />);
      const allFilterButton = screen.getByRole('button', { name: /^all$/i });
      expect(allFilterButton).toHaveClass('active');
    });
  });
});
