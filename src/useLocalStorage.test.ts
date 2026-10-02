/**
 * useLocalStorage.test.ts
 * Unit tests for the useLocalStorage React hook (KAN-42).
 */

import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useLocalStorage } from './useLocalStorage';

const TEST_KEY = 'test_hook_key';

beforeEach(() => {
  localStorage.clear();
});

afterEach(() => {
  localStorage.clear();
  vi.restoreAllMocks();
});

describe('useLocalStorage', () => {
  it('returns the initialValue when nothing is stored', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'hello'));
    expect(result.current[0]).toBe('hello');
  });

  it('persists the initial value to localStorage on mount', () => {
    renderHook(() => useLocalStorage(TEST_KEY, 42));
    expect(JSON.parse(localStorage.getItem(TEST_KEY)!)).toBe(42);
  });

  it('reads an existing value from localStorage on mount', () => {
    localStorage.setItem(TEST_KEY, JSON.stringify('stored_value'));
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'default'));
    expect(result.current[0]).toBe('stored_value');
  });

  it('updates state and persists when setter is called', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 0));
    act(() => {
      result.current[1](99);
    });
    expect(result.current[0]).toBe(99);
    expect(JSON.parse(localStorage.getItem(TEST_KEY)!)).toBe(99);
  });

  it('supports functional updater form', () => {
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 10));
    act(() => {
      result.current[1]((prev) => prev + 5);
    });
    expect(result.current[0]).toBe(15);
    expect(JSON.parse(localStorage.getItem(TEST_KEY)!)).toBe(15);
  });

  it('falls back to initialValue and warns when stored JSON is invalid', () => {
    localStorage.setItem(TEST_KEY, 'INVALID{{JSON');
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'fallback'));
    expect(result.current[0]).toBe('fallback');
    expect(warnSpy).toHaveBeenCalled();
  });

  it('uses the validator and falls back when validation fails', () => {
    localStorage.setItem(TEST_KEY, JSON.stringify({ not: 'an array' }));
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const isArray = (v: unknown): v is string[] => Array.isArray(v);
    const { result } = renderHook(() =>
      useLocalStorage<string[]>(TEST_KEY, [], isArray),
    );
    expect(result.current[0]).toEqual([]);
    expect(warnSpy).toHaveBeenCalled();
  });

  it('uses the validator and accepts a valid stored value', () => {
    localStorage.setItem(TEST_KEY, JSON.stringify(['a', 'b']));
    const isArray = (v: unknown): v is string[] => Array.isArray(v);
    const { result } = renderHook(() =>
      useLocalStorage<string[]>(TEST_KEY, [], isArray),
    );
    expect(result.current[0]).toEqual(['a', 'b']);
  });

  it('does not throw when localStorage.setItem throws (quota exceeded)', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new DOMException('QuotaExceededError');
    });
    const { result } = renderHook(() => useLocalStorage(TEST_KEY, 'x'));
    expect(() =>
      act(() => {
        result.current[1]('y');
      }),
    ).not.toThrow();
    expect(warnSpy).toHaveBeenCalled();
  });
});
