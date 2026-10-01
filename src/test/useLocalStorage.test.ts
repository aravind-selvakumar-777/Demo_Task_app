import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from '../useLocalStorage';

describe('useLocalStorage', () => {
  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  it('should return initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));
    
    expect(result.current[0]).toBe('initial-value');
  });

  it('should read existing value from localStorage', () => {
    localStorage.setItem('test-key', JSON.stringify('stored-value'));
    
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));
    
    expect(result.current[0]).toBe('stored-value');
  });

  it('should update localStorage when state changes', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 'initial-value'));
    
    act(() => {
      result.current[1]('new-value');
    });
    
    expect(result.current[0]).toBe('new-value');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('new-value'));
  });

  it('should handle complex objects', () => {
    const initialObject = { id: 1, name: 'Test' };
    const { result } = renderHook(() => useLocalStorage('test-key', initialObject));
    
    expect(result.current[0]).toEqual(initialObject);
    
    const newObject = { id: 2, name: 'Updated' };
    act(() => {
      result.current[1](newObject);
    });
    
    expect(result.current[0]).toEqual(newObject);
    expect(JSON.parse(localStorage.getItem('test-key') || '{}')).toEqual(newObject);
  });

  it('should handle arrays', () => {
    const initialArray = [1, 2, 3];
    const { result } = renderHook(() => useLocalStorage('test-key', initialArray));
    
    expect(result.current[0]).toEqual(initialArray);
    
    const newArray = [4, 5, 6];
    act(() => {
      result.current[1](newArray);
    });
    
    expect(result.current[0]).toEqual(newArray);
    expect(JSON.parse(localStorage.getItem('test-key') || '[]')).toEqual(newArray);
  });

  it('should handle corrupted JSON in localStorage gracefully', () => {
    localStorage.setItem('test-key', 'invalid-json{');
    
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useLocalStorage('test-key', 'fallback-value'));
    
    expect(result.current[0]).toBe('fallback-value');
    expect(consoleWarnSpy).toHaveBeenCalled();
    
    consoleWarnSpy.mockRestore();
  });

  it('should work with functional updates', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', 0));
    
    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    
    expect(result.current[0]).toBe(1);
    
    act(() => {
      result.current[1]((prev) => prev + 1);
    });
    
    expect(result.current[0]).toBe(2);
  });

  it('should handle null values', () => {
    const { result } = renderHook(() => useLocalStorage<string | null>('test-key', null));
    
    expect(result.current[0]).toBe(null);
    
    act(() => {
      result.current[1]('non-null-value');
    });
    
    expect(result.current[0]).toBe('non-null-value');
    expect(localStorage.getItem('test-key')).toBe(JSON.stringify('non-null-value'));
  });

  it('should handle boolean values', () => {
    const { result } = renderHook(() => useLocalStorage('test-key', false));
    
    expect(result.current[0]).toBe(false);
    
    act(() => {
      result.current[1](true);
    });
    
    expect(result.current[0]).toBe(true);
    expect(localStorage.getItem('test-key')).toBe('true');
  });

  it('should persist across multiple hook instances with same key', () => {
    const { result: result1 } = renderHook(() => useLocalStorage('shared-key', 'initial'));
    
    act(() => {
      result1.current[1]('updated-value');
    });
    
    const { result: result2 } = renderHook(() => useLocalStorage('shared-key', 'initial'));
    
    expect(result2.current[0]).toBe('updated-value');
  });
});
