import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readRaw, writeRaw } from './browserStorage';

describe('browserStorage', () => {
  beforeEach(() => {
    window.localStorage.clear();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('round-trips a value through a normal write then read', () => {
    const wrote = writeRaw('some-key', 'some-value');

    expect(wrote).toBe(true);
    expect(readRaw('some-key')).toBe('some-value');
  });

  it('returns null when reading a key that was never written', () => {
    expect(readRaw('missing-key')).toBeNull();
  });

  it('catches a throwing getItem and returns null instead of throwing (Verification Matrix row 10)', () => {
    // Spying on `Storage.prototype` (not the `window.localStorage` instance)
    // because jsdom implements `localStorage` as a legacy-platform-object
    // Proxy whose own-property trap does not accept `Object.defineProperty`
    // on the instance itself; the prototype method is a plain function.
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    expect(() => readRaw('any-key')).not.toThrow();
    expect(readRaw('any-key')).toBeNull();
  });

  it('catches a throwing setItem and returns false instead of throwing (Verification Matrix row 11)', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    expect(() => writeRaw('any-key', 'value')).not.toThrow();
    expect(writeRaw('any-key', 'value')).toBe(false);
  });

  it('emits no console output when a read fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
      throw new Error('storage disabled');
    });

    readRaw('any-key');

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });

  it('emits no console output when a write fails', () => {
    const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('quota exceeded');
    });

    writeRaw('any-key', 'value');

    expect(warnSpy).not.toHaveBeenCalled();
    expect(errorSpy).not.toHaveBeenCalled();
  });
});
