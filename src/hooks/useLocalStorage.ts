import { useState, useEffect } from 'react';

/**
 * Custom hook that syncs React state with localStorage.
 * Automatically persists state changes to localStorage and initializes from it.
 * 
 * @param key - The localStorage key to use
 * @param initialValue - The default value if no stored value exists
 * @returns A stateful value and a function to update it, just like useState
 */
export function useLocalStorage<T>(
  key: string,
  initialValue: T | (() => T)
): [T, React.Dispatch<React.SetStateAction<T>>] {
  // Initialize state synchronously from localStorage or fallback to initialValue
  const [storedValue, setStoredValue] = useState<T>(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return initialValue instanceof Function ? initialValue() : initialValue;
    }

    try {
      // Try to read from localStorage
      const item = window.localStorage.getItem(key);
      
      // If no item exists, use the initial value
      if (item === null) {
        return initialValue instanceof Function ? initialValue() : initialValue;
      }

      // Parse stored JSON
      const parsed = JSON.parse(item);
      
      // Validate that parsed value is an array (for our use case)
      if (!Array.isArray(parsed)) {
        console.warn(`[useLocalStorage] Stored value for key "${key}" is not an array. Using initial value.`);
        return initialValue instanceof Function ? initialValue() : initialValue;
      }

      return parsed as T;
    } catch (error) {
      // If any error occurs (corrupt JSON, parse error, etc.), fall back to initial value
      console.warn(`[useLocalStorage] Error reading from localStorage for key "${key}":`, error);
      return initialValue instanceof Function ? initialValue() : initialValue;
    }
  });

  // Write to localStorage whenever the value changes
  useEffect(() => {
    // Check if we're in a browser environment
    if (typeof window === 'undefined') {
      return;
    }

    try {
      // Serialize and save to localStorage
      const valueToStore = JSON.stringify(storedValue);
      window.localStorage.setItem(key, valueToStore);
    } catch (error) {
      // If write fails (quota exceeded, private mode, etc.), log but don't crash
      console.warn(`[useLocalStorage] Error writing to localStorage for key "${key}":`, error);
    }
  }, [key, storedValue]);

  return [storedValue, setStoredValue];
}
