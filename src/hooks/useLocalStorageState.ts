import { useEffect, useRef, useState } from 'react';

type Options<T> = {
  validate?: (value: unknown) => value is T;
  syncAcrossTabs?: boolean;
};

function readFromStorage<T>(key: string): unknown {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeToStorage(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch (error) {
    console.warn(`[useLocalStorageState] Failed to write to localStorage for key "${key}"`, error);
  }
}

function removeFromStorage(key: string) {
  try {
    window.localStorage.removeItem(key);
  } catch {
    // ignore
  }
}

export function useLocalStorageState<T>(
  key: string,
  initialValue: T,
  options?: Options<T>,
): [T, React.Dispatch<React.SetStateAction<T>>] {
  const { validate, syncAcrossTabs = true } = options ?? {};
  const hasHydratedRef = useRef(false);

  const [state, setState] = useState<T>(() => {
    if (typeof window === 'undefined') {
      return initialValue;
    }

    const raw = readFromStorage<T>(key);
    if (typeof raw !== 'string' || raw.length === 0) {
      hasHydratedRef.current = true;
      return initialValue;
    }

    try {
      const parsed: unknown = JSON.parse(raw);
      if (validate && !validate(parsed)) {
        hasHydratedRef.current = true;
        return initialValue;
      }
      hasHydratedRef.current = true;
      return parsed as T;
    } catch {
      removeFromStorage(key);
      hasHydratedRef.current = true;
      return initialValue;
    }
  });

  useEffect(() => {
    if (!hasHydratedRef.current) {
      return;
    }

    try {
      const serialized = JSON.stringify(state);
      writeToStorage(key, serialized);
    } catch (error) {
      console.warn(`[useLocalStorageState] Failed to serialize state for key "${key}"`, error);
    }
  }, [key, state]);

  useEffect(() => {
    if (!syncAcrossTabs) {
      return;
    }

    function onStorage(event: StorageEvent) {
      if (event.storageArea !== window.localStorage) {
        return;
      }

      if (event.key !== key) {
        return;
      }

      if (event.newValue == null || event.newValue.length === 0) {
        setState(initialValue);
        return;
      }

      try {
        const parsed: unknown = JSON.parse(event.newValue);
        if (validate && !validate(parsed)) {
          return;
        }
        setState(parsed as T);
      } catch {
        // ignore invalid JSON
      }
    }

    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, [initialValue, key, syncAcrossTabs, validate]);

  return [state, setState];
}
