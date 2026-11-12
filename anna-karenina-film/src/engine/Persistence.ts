import type { SavedProgress } from '../data/types';
import { FILM, sceneAtTime } from '../data/film';

const KEY = 'neve-ferro-progress-v1';
const PREFS_KEY = 'neve-ferro-preferences-v1';

export interface Preferences {
  subtitles: boolean;
  volume: number;
  muted: boolean;
}

export function loadPreferences(): Preferences {
  const fallback: Preferences = { subtitles: true, volume: 0.8, muted: false };
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw) as Partial<Preferences>;
    return {
      subtitles: parsed.subtitles !== false,
      volume: typeof parsed.volume === 'number' ? Math.max(0, Math.min(1, parsed.volume)) : fallback.volume,
      muted: Boolean(parsed.muted)
    };
  } catch {
    return fallback;
  }
}

export function savePreferences(prefs: Preferences): void {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // Ignore.
  }
}

function storage(): Storage | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage;
  } catch {
    return null;
  }
}

export function loadProgress(): SavedProgress | null {
  const store = storage();
  if (!store) return null;
  try {
    const raw = store.getItem(KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<SavedProgress>;
    if (parsed.version !== 1 || typeof parsed.time !== 'number' || !Number.isFinite(parsed.time)) {
      return null;
    }
    const time = Math.max(0, Math.min(FILM.duration, parsed.time));
    const scene = sceneAtTime(time).scene;
    return {
      version: 1,
      time,
      sceneId: typeof parsed.sceneId === 'string' ? parsed.sceneId : scene.id,
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
      completed: Boolean(parsed.completed)
    };
  } catch {
    return null;
  }
}

export function saveProgress(time: number, completed = false): SavedProgress {
  const safeTime = Math.max(0, Math.min(FILM.duration, time));
  const scene = sceneAtTime(safeTime).scene;
  const progress: SavedProgress = {
    version: 1,
    time: safeTime,
    sceneId: scene.id,
    updatedAt: Date.now(),
    completed
  };
  try {
    storage()?.setItem(KEY, JSON.stringify(progress));
  } catch {
    // Storage may be unavailable or full; the film still works.
  }
  return progress;
}

export function clearProgress(): void {
  try {
    storage()?.removeItem(KEY);
  } catch {
    // Ignore.
  }
}

export function isResumable(progress: SavedProgress | null): boolean {
  return Boolean(
    progress &&
      !progress.completed &&
      progress.time > 5 &&
      progress.time < FILM.duration - 5
  );
}

export function formatTime(seconds: number): string {
  const safe = Math.max(0, Math.floor(seconds));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}
