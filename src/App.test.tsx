import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import App from './App';

function getStoredTasks() {
  const raw = localStorage.getItem('demo_task_app.tasks');
  return raw ? JSON.parse(raw) : null;
}

describe('KAN-6 inline edit', () => {
  it('enters edit mode when clicking Edit button', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /edit review the landing copy/i }));

    expect(screen.getByLabelText(/edit title/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/edit priority/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  it('enters edit mode when double-clicking the title', () => {
    render(<App />);

    fireEvent.doubleClick(screen.getByText('Prepare demo data'));

    expect(screen.getByLabelText(/edit title/i)).toBeInTheDocument();
  });

  it('saves a valid edit (title) on Enter', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /edit prepare demo data/i }));

    const titleInput = screen.getByLabelText(/edit title/i);
    fireEvent.change(titleInput, { target: { value: 'Prepare updated demo data' } });
    fireEvent.keyDown(titleInput, { key: 'Enter' });

    expect(screen.queryByLabelText(/edit title/i)).not.toBeInTheDocument();
    expect(screen.getByText('Prepare updated demo data')).toBeInTheDocument();
  });

  it('cancels an edit on Escape and discards changes', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /edit prepare demo data/i }));

    const titleInput = screen.getByLabelText(/edit title/i);
    fireEvent.change(titleInput, { target: { value: 'Not saved' } });
    fireEvent.keyDown(titleInput, { key: 'Escape' });

    expect(screen.queryByLabelText(/edit title/i)).not.toBeInTheDocument();
    expect(screen.getByText('Prepare demo data')).toBeInTheDocument();
    expect(screen.queryByText('Not saved')).not.toBeInTheDocument();
  });

  it('rejects empty title and shows validation message', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /edit review the landing copy/i }));

    const titleInput = screen.getByLabelText(/edit title/i);
    fireEvent.change(titleInput, { target: { value: '   ' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByRole('alert')).toHaveTextContent('Title cannot be empty');
    // still editing
    expect(screen.getByLabelText(/edit title/i)).toBeInTheDocument();
  });

  it('edits priority and saves', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /edit prepare demo data/i }));

    fireEvent.change(screen.getByLabelText(/edit priority/i), { target: { value: 'High' } });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    expect(screen.getByText(/high priority/i)).toBeInTheDocument();
  });

  it('only one task can be edited at a time (switching discards unsaved edits)', () => {
    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /edit prepare demo data/i }));

    const titleInput = screen.getByLabelText(/edit title/i);
    fireEvent.change(titleInput, { target: { value: 'Unsaved change' } });

    // Switch to another task edit
    fireEvent.click(screen.getByRole('button', { name: /edit review the landing copy/i }));

    // Now editing the other task
    expect(screen.getByDisplayValue('Review the landing copy')).toBeInTheDocument();

    // The previous task should still have original title (unsaved discarded)
    fireEvent.keyDown(screen.getByLabelText(/edit title/i), { key: 'Escape' });
    expect(screen.getByText('Prepare demo data')).toBeInTheDocument();
    expect(screen.queryByText('Unsaved change')).not.toBeInTheDocument();
  });

  it('persists edits to localStorage', () => {
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem');

    render(<App />);

    fireEvent.click(screen.getByRole('button', { name: /edit prepare demo data/i }));

    fireEvent.change(screen.getByLabelText(/edit title/i), {
      target: { value: 'Persisted title' },
    });
    fireEvent.change(screen.getByLabelText(/edit priority/i), {
      target: { value: 'Low' },
    });
    fireEvent.click(screen.getByRole('button', { name: /save/i }));

    // Saved => tasks state changed => effect saves to storage
    expect(setItemSpy).toHaveBeenCalled();

    const stored = getStoredTasks();
    expect(stored).not.toBeNull();

    const match = stored.find((t: any) => t.title === 'Persisted title');
    expect(match).toBeTruthy();
    expect(match.priority).toBe('Low');

    setItemSpy.mockRestore();
  });
});
