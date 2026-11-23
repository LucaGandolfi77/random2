import { sanitizeState, type GameState } from './state';

export const SAVE_KEY = 'borgo.save.v4';
export const LEGACY_SAVE_KEY = 'borgo.save.v3';
export const OLDER_SAVE_KEY = 'borgo.save.v2';
export const OLD_SAVE_KEY = 'borgo.save.v1';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function saveGame(state: GameState, storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    const payload: GameState = { ...state, v: 4, savedAt: Date.now() };
    storage.setItem(SAVE_KEY, JSON.stringify(payload));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(storage: StorageLike | null = browserStorage()): GameState | null {
  if (!storage) return null;
  try {
    for (const key of [SAVE_KEY, LEGACY_SAVE_KEY, OLDER_SAVE_KEY, OLD_SAVE_KEY]) {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const state = sanitizeState(JSON.parse(raw));
      if (!state) continue;
      if (key !== SAVE_KEY) storage.setItem(SAVE_KEY, JSON.stringify(state));
      return state;
    }
    return null;
  } catch {
    return null;
  }
}

export function clearSave(storage: StorageLike | null = browserStorage()): void {
  if (!storage) return;
  try {
    storage.removeItem(SAVE_KEY);
    storage.removeItem(LEGACY_SAVE_KEY);
    storage.removeItem(OLDER_SAVE_KEY);
    storage.removeItem(OLD_SAVE_KEY);
  } catch {
    /* Storage can be disabled; not being able to clear is not fatal. */
  }
}

export function hasSave(storage: StorageLike | null = browserStorage()): boolean {
  if (!storage) return false;
  try {
    return (
      storage.getItem(SAVE_KEY) !== null ||
      storage.getItem(LEGACY_SAVE_KEY) !== null ||
      storage.getItem(OLDER_SAVE_KEY) !== null ||
      storage.getItem(OLD_SAVE_KEY) !== null
    );
  } catch {
    return false;
  }
}

function browserStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}
