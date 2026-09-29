/**
 * The sole wrapper around `window.localStorage` access in this application.
 *
 * Every call is wrapped in try/catch so that a disabled, unavailable, full,
 * or otherwise failing `localStorage` never throws out to a caller. Callers
 * treat `null` (read) / `false` (write) as "no data" / "not persisted this
 * time" and continue operating purely in memory, per FR-010/AC-006.
 *
 * No console output is emitted on failure, by design (see design-review.md
 * Decision 2): BR-003 only requires no *user-facing* message, but full
 * silence keeps this wrapper's behavior uniform.
 */

export interface SafeStorage {
  readRaw(key: string): string | null;
  writeRaw(key: string, value: string): boolean;
}

export function readRaw(key: string): string | null {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function writeRaw(key: string, value: string): boolean {
  try {
    window.localStorage.setItem(key, value);
    return true;
  } catch {
    return false;
  }
}
