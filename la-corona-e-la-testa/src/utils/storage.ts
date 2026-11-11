export type QualitySetting = 'auto' | 'high' | 'low';
export type SubtitleSize = 'small' | 'medium' | 'large';

export interface Settings {
  quality: QualitySetting;
  subtitles: boolean;
  subtitleSize: SubtitleSize;
  voices: boolean;
  volume: number;
  muted: boolean;
  speed: number;
  cinema: boolean;
}

export interface Progress {
  time: number;
  actId: string;
  completed: boolean;
  updatedAt: number;
}

const SETTINGS_KEY = 'lacoronaelatesta.v1.settings';
const PROGRESS_KEY = 'lacoronaelatesta.v1.progress';

export const DEFAULT_SETTINGS: Settings = {
  quality: 'auto',
  subtitles: true,
  subtitleSize: 'medium',
  voices: true,
  volume: 0.8,
  muted: false,
  speed: 1,
  cinema: false,
};

function readStore(key: string): string | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStore(key: string, value: string): void {
  try {
    if (typeof localStorage === 'undefined') return;
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private mode or sandboxed contexts.
  }
}

export function loadSettings(): Settings {
  const raw = readStore(SETTINGS_KEY);
  if (!raw) return { ...DEFAULT_SETTINGS };

  try {
    const parsed = JSON.parse(raw) as Partial<Settings>;
    const merged = { ...DEFAULT_SETTINGS, ...parsed };
    if (!['auto', 'high', 'low'].includes(merged.quality)) merged.quality = 'auto';
    if (!['small', 'medium', 'large'].includes(merged.subtitleSize)) merged.subtitleSize = 'medium';
    if (!['0.75', '1', '1.25', '1.5'].includes(String(merged.speed))) merged.speed = 1;
    merged.volume = Math.min(1, Math.max(0, Number(merged.volume) || 0));
    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(settings: Settings): void {
  writeStore(SETTINGS_KEY, JSON.stringify(settings));
}

export function loadProgress(): Progress | null {
  const raw = readStore(PROGRESS_KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as Partial<Progress>;
    if (typeof parsed.time !== 'number' || !Number.isFinite(parsed.time)) return null;
    return {
      time: Math.max(0, parsed.time),
      actId: typeof parsed.actId === 'string' ? parsed.actId : '',
      completed: Boolean(parsed.completed),
      updatedAt: typeof parsed.updatedAt === 'number' ? parsed.updatedAt : Date.now(),
    };
  } catch {
    return null;
  }
}

export function saveProgress(progress: Progress): void {
  writeStore(PROGRESS_KEY, JSON.stringify(progress));
}

export function clearProgress(): void {
  try {
    if (typeof localStorage !== 'undefined') localStorage.removeItem(PROGRESS_KEY);
  } catch {
    // Ignore unavailable storage.
  }
}

export function formatTime(seconds: number): string {
  const value = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(value / 60);
  const secs = value % 60;
  return `${String(minutes).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}
