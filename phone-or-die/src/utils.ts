export const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export const clamp01 = (value: number): number => Math.max(0, Math.min(1, value));

export const percent = (value: number, max: number): number => {
  if (!Number.isFinite(value) || !Number.isFinite(max) || max <= 0) return 0;
  return Math.max(0, Math.min(100, (value / max) * 100));
};

export const formatSaveLabel = (slot: string): string =>
  slot === 'auto' ? 'Autosave' : `Chronicle ${slot.replace('slot', '')}`;

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

export const formatPlayTime = (seconds: number): string => {
  const safe = Math.max(0, Math.floor(seconds));
  const h = Math.floor(safe / 3600);
  const m = Math.floor((safe % 3600) / 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
};

export const sleep = (ms: number): Promise<void> => new Promise((resolve) => window.setTimeout(resolve, ms));

export const isInputElement = (target: EventTarget | null): boolean => {
  const element = target as HTMLElement | null;
  return Boolean(element && ['INPUT', 'TEXTAREA', 'SELECT'].includes(element.tagName));
};
