import { renderHook, act } from '@testing-library/react';
import { describe, expect, it, vi, beforeEach } from 'vitest';
import { useLocalStorageState } from './useLocalStorageState';

type DemoState = { count: number };

describe('useLocalStorageState', () => {
  beforeEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('hydrates from localStorage when valid JSON is present', () => {
    window.localStorage.setItem('demo', JSON.stringify({ count: 5 } satisfies DemoState));

    const { result } = renderHook(() =>
      useLocalStorageState<DemoState>('demo', { count: 0 }, {
        validate: (v: unknown): v is DemoState =>
          typeof v === 'object' && v !== null && 'count' in v && typeof (v as any).count === 'number'
      })
    );

    expect(result.current[0]).toEqual({ count: 5 });
  });

  it('falls back to initialValue when localStorage contains invalid JSON (and overwrites on mount)', () => {
    window.localStorage.setItem('bad', '{not-json');

    const { result } = renderHook(() => useLocalStorageState('bad', { count: 1 }));

    expect(result.current[0]).toEqual({ count: 1 });
    // hook removes invalid value but then persists the initialValue
    expect(window.localStorage.getItem('bad')).toBe(JSON.stringify({ count: 1 }));
  });

  it('writes to localStorage when state changes', () => {
    const { result } = renderHook(() => useLocalStorageState('k', { count: 0 }));

    act(() => {
      result.current[1]({ count: 2 });
    });

    expect(window.localStorage.getItem('k')).toBe(JSON.stringify({ count: 2 }));
  });

  it('resets to initialValue when storage event clears the key', () => {
    window.localStorage.setItem('k', JSON.stringify({ count: 9 }));
    const { result } = renderHook(() => useLocalStorageState('k', { count: 0 }));

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'k',
          newValue: null,
          oldValue: JSON.stringify({ count: 9 }),
          storageArea: window.localStorage
        })
      );
    });

    expect(result.current[0]).toEqual({ count: 0 });
  });

  it('ignores storage events when syncAcrossTabs is false', () => {
    window.localStorage.setItem('k', JSON.stringify({ count: 1 }));
    const { result } = renderHook(() =>
      useLocalStorageState('k', { count: 1 }, { syncAcrossTabs: false })
    );

    act(() => {
      window.dispatchEvent(
        new StorageEvent('storage', {
          key: 'k',
          newValue: JSON.stringify({ count: 999 }),
          oldValue: JSON.stringify({ count: 1 }),
          storageArea: window.localStorage
        })
      );
    });

    expect(result.current[0]).toEqual({ count: 1 });
  });
});
