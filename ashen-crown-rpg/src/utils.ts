export const cx = (...values: Array<string | false | null | undefined>): string =>
  values.filter(Boolean).join(' ');

export const formatPlayTime = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
};

export const formatDate = (timestamp: number): string => {
  try {
    return new Intl.DateTimeFormat('en', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(timestamp));
  } catch {
    return 'Unknown';
  }
};

export const titleCase = (value: string): string =>
  value.replace(/(^|\s|_)([a-z])/g, (_match, prefix: string, letter: string) => `${prefix}${letter.toUpperCase()}`)
    .replace(/_/g, ' ');

export const signed = (value: number): string => (value >= 0 ? `+${value}` : `${value}`);

export const shortName = (name: string): string => {
  const trimmed = name.trim();
  if (!trimmed) return 'Unwritten';
  if (/^the\s+/i.test(trimmed)) return trimmed.replace(/^the\s+/i, '');
  return trimmed.split(/\s+/)[0];
};

export const abilityTone = (tone?: string): string => {
  if (!tone) return 'neutral';
  return tone;
};

export const percent = (value: number, max: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
};

export const isTouchDevice = (): boolean => {
  if (typeof window === 'undefined') return false;
  return window.matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window;
};

export const safeStorageGet = (key: string): string | null => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

export const safeStorageSet = (key: string, value: string): void => {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Storage can be unavailable in private modes; the game remains playable.
  }
};
