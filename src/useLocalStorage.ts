/**
 * useLocalStorage.ts
 * Generic React hook that synchronises a state value with localStorage (KAN-42).
 *
 * Usage:
 *   const [tasks, setTasks] = useLocalStorage<Task[]>('key', defaultValue);
 *
 * - On mount the stored value is read; if absent or corrupted the initialValue
 *   is used and immediately persisted.
 * - Every setState call persists the new value automatically.
 * - KAN-42 review fix: verbose console warnings are gated behind DEV mode only.
 */

import { Dispatch, SetStateAction, useEffect, useState } from 'react';

export function useLocalStorage<T>(
  key: string,
  initialValue: T,
  validate?: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = localStorage.getItem(key);
      if (item === null) return initialValue;

      const parsed: unknown = JSON.parse(item);

      // If a validator is provided, run it; fall back on failure
      if (validate) {
        if (validate(parsed)) return parsed as T;
        if (import.meta.env.DEV) {
          console.warn(
            `[useLocalStorage] Stored value for key "${key}" is invalid. Using default.`,
          );
        }
        return initialValue;
      }

      return parsed as T;
    } catch {
      if (import.meta.env.DEV) {
        console.warn(
          `[useLocalStorage] Failed to read key "${key}" from localStorage. Using default.`,
        );
      }
      return initialValue;
    }
  });

  // Persist to localStorage whenever storedValue changes
  useEffect(() => {
    try {
      localStorage.setItem(key, JSON.stringify(storedValue));
    } catch (error) {
      if (import.meta.env.DEV) {
        console.warn(
          `[useLocalStorage] Could not persist key "${key}" to localStorage:`,
          String(error),
        );
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
