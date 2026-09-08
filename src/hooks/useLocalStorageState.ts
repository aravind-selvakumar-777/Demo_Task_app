import { Dispatch, SetStateAction, useEffect, useState } from 'react';

/**
 * A generic, reusable persistence primitive with the same call shape as
 * `useState`, backed by `window.localStorage`.
 *
 * - Reads happen exactly once, inside the lazy `useState` initializer, at
 *   first render. The full `window.localStorage.getItem(...)` access chain
 *   is wrapped in a single `try/catch` (property access itself can throw in
 *   restricted browsing modes, not just the method call). On a missing key,
 *   a thrown read/parse error, or a validator rejection, the caller-supplied
 *   `defaultValue` is used verbatim — malformed data is discarded wholesale,
 *   never partially repaired.
 * - `setState` is returned unwrapped, exactly as `useState` produced it, so
 *   callers retain full support for the functional-updater form
 *   (`setState((current) => next)`).
 * - Writes happen exclusively inside a `useEffect` keyed on `[key, state]`,
 *   after the state update has committed. The full
 *   `window.localStorage.setItem(...)` access chain is wrapped in its own
 *   `try/catch`; any write failure (quota exceeded, storage disabled,
 *   private-browsing restrictions, etc.) is swallowed silently and never
 *   surfaced to the UI.
 */
export function useLocalStorageState<T>(
  key: string,
  defaultValue: T,
  isValid: (value: unknown) => value is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [state, setState] = useState<T>(() => {
    try {
      const rawValue = window.localStorage.getItem(key);

      if (rawValue === null) {
        return defaultValue;
      }

      const parsedValue = JSON.parse(rawValue);
      return isValid(parsedValue) ? parsedValue : defaultValue;
    } catch {
      return defaultValue;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(key, JSON.stringify(state));
    } catch {
      // Write failures are expected in restricted environments (private
      // browsing, disabled storage, quota exceeded) and must degrade
      // silently — the app stays fully usable in memory for the session.
    }
  }, [key, state]);

  return [state, setState];
}
