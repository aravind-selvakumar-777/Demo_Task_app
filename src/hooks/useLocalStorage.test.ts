import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useLocalStorage } from './useLocalStorage';

describe('useLocalStorage', () => {
  const TEST_KEY = 'test-key';
  const INITIAL_VALUE = [{ id: 1, name: 'Test Item' }];

  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Clear any mocks
    vi.clearAllMocks();
  });

  it('should initialize with the provided initial value when localStorage is empty', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    
    expect(result.current[0]).toEqual(INITIAL_VALUE);
  });

  it('should load persisted value from localStorage on mount', () => {
    const persistedValue = [{ id: 2, name: 'Persisted Item' }];
    localStorage.setItem(TEST_KEY, JSON.stringify(persistedValue));

    const { result } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    
    expect(result.current[0]).toEqual(persistedValue);
  });

  it('should write to localStorage when state changes', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    
    const newValue = [{ id: 3, name: 'New Item' }];
    
    act(() => {
      result.current[1](newValue);
    });

    expect(result.current[0]).toEqual(newValue);
    expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify(newValue));
  });

  it('should handle functional updates', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    
    act(() => {
      result.current[1]((prev) => [...prev, { id: 4, name: 'Added Item' }]);
    });

    expect(result.current[0]).toHaveLength(2);
    expect(result.current[0][1]).toEqual({ id: 4, name: 'Added Item' });
  });

  it('should use initial value when localStorage contains corrupt JSON', () => {
    localStorage.setItem(TEST_KEY, 'invalid-json-{{{');
    
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    
    expect(result.current[0]).toEqual(INITIAL_VALUE);
  });

  it('should use initial value when localStorage contains non-array data', () => {
    localStorage.setItem(TEST_KEY, JSON.stringify({ notAnArray: true }));
    
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    
    expect(result.current[0]).toEqual(INITIAL_VALUE);
  });

  it('should use initial value when localStorage contains null', () => {
    localStorage.setItem(TEST_KEY, 'null');
    
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    
    expect(result.current[0]).toEqual(INITIAL_VALUE);
  });

  it('should handle empty array as valid persisted state', () => {
    localStorage.setItem(TEST_KEY, JSON.stringify([]));
    
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    
    expect(result.current[0]).toEqual([]);
  });

  it('should support initializer function', () => {
    const initializerFn = vi.fn(() => INITIAL_VALUE);
    
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, initializerFn));
    
    expect(initializerFn).toHaveBeenCalledOnce();
    expect(result.current[0]).toEqual(INITIAL_VALUE);
  });

  it('should not crash when localStorage.setItem throws an error', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    
    // Mock setItem to throw (e.g., quota exceeded)
    const setItemSpy = vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => {
      act(() => {
        result.current[1]([{ id: 5, name: 'Should not crash' }]);
      });
    }).not.toThrow();

    setItemSpy.mockRestore();
  });

  it('should not crash when localStorage.getItem throws an error', () => {
    const getItemSpy = vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('SecurityError');
    });

    expect(() => {
      renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    }).not.toThrow();

    getItemSpy.mockRestore();
  });

  it('should persist state across multiple renders', () => {
    const { result, rerender } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    
    const newValue = [{ id: 6, name: 'Persistent Item' }];
    
    act(() => {
      result.current[1](newValue);
    });

    rerender();
    
    expect(result.current[0]).toEqual(newValue);
    expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify(newValue));
  });

  it('should synchronize multiple hook instances with the same key', () => {
    const { result: result1 } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    const { result: result2 } = renderHook(() => useLocalStorage(TEST_KEY, INITIAL_VALUE));
    
    const newValue = [{ id: 7, name: 'Shared Item' }];
    
    act(() => {
      result1.current[1](newValue);
    });

    // Both hooks should write to localStorage
    expect(localStorage.getItem(TEST_KEY)).toBe(JSON.stringify(newValue));
  });
});
