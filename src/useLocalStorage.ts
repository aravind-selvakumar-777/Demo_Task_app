import { useState, useEffect, Dispatch, SetStateAction } from 'react';

/**
 * Custom React hook that syncs state with browser localStorage.
 * 
 * @param key - The localStorage key to use
 * @param initialValue - The initial/default value if localStorage is empty or corrupted
 * @returns A stateful value and a setter function, just like useState
 * 
 * Features:
 * - Reads from localStorage on mount
 * - Writes to localStorage whenever state changes
 * - Gracefully handles JSON parse errors
 * - Gracefully handles QuotaExceededError
 * - Falls back to initialValue on any error
 * - Logs diagnostic messages to console
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T
): [T, Dispatch<SetStateAction<T>>] {
  // Initialize state by reading from localStorage
  const [storedValue, setStoredValue] = useState<T>(() => {
    try {
      const item = window.localStorage.getItem(key);
      
      if (item === null) {
        console.info(`[useLocalStorage] No data found for key "${key}". Using initial value.`);
        return initialValue;
      }

      const parsed = JSON.parse(item) as T;
      console.info(`[useLocalStorage] Loaded data from localStorage for key "${key}".`);
      return parsed;
    } catch (error) {
      console.warn(
        `[useLocalStorage] Failed to read from localStorage for key "${key}". Using initial value.`,
        error
      );
      return initialValue;
    }
  });

  // Write to localStorage whenever the state changes
  useEffect(() => {
    try {
      const serialized = JSON.stringify(storedValue);
      window.localStorage.setItem(key, serialized);
      console.info(`[useLocalStorage] Saved data to localStorage for key "${key}".`);
    } catch (error) {
      if (error instanceof Error && error.name === 'QuotaExceededError') {
        console.warn(
          `[useLocalStorage] localStorage quota exceeded for key "${key}". Data not saved.`,
          error
        );
      } else {
        console.warn(
          `[useLocalStorage] Failed to write to localStorage for key "${key}".`,
          error
        );
      }
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
