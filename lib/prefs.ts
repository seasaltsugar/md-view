import { STORAGE_PREFIX } from './config';

/**
 * Tiny key-value wrapper around localStorage for application preferences only
 * (theme, sidebar state, support-reminder counters). It never stores file names,
 * file contents or anything about what was read.
 *
 * If localStorage is unavailable the app keeps working with in-memory values.
 */
export interface KeyValueStore {
  get(key: string): string | null;
  set(key: string, value: string): void;
  remove(key: string): void;
}

export function createMemoryStore(initial: Record<string, string> = {}): KeyValueStore {
  const data = new Map<string, string>(Object.entries(initial));
  return {
    get: (key) => data.get(key) ?? null,
    set: (key, value) => void data.set(key, value),
    remove: (key) => void data.delete(key),
  };
}

export function createLocalStore(prefix: string = STORAGE_PREFIX): KeyValueStore {
  const fallback = createMemoryStore();
  return {
    get(key) {
      try {
        return localStorage.getItem(prefix + key);
      } catch {
        return fallback.get(key);
      }
    },
    set(key, value) {
      try {
        localStorage.setItem(prefix + key, value);
      } catch {
        fallback.set(key, value);
      }
    },
    remove(key) {
      try {
        localStorage.removeItem(prefix + key);
      } catch {
        fallback.remove(key);
      }
    },
  };
}

export function getBoolean(store: KeyValueStore, key: string, fallback: boolean): boolean {
  const value = store.get(key);
  return value === null ? fallback : value === 'true';
}

export function setBoolean(store: KeyValueStore, key: string, value: boolean): void {
  store.set(key, String(value));
}
