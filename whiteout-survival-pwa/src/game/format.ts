export function formatNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  const abs = Math.abs(value);
  if (abs >= 1_000_000) return `${(value / 1_000_000).toFixed(abs >= 10_000_000 ? 0 : 1)}M`;
  if (abs >= 10_000) return `${(value / 1_000).toFixed(0)}K`;
  if (abs >= 1_000) return `${(value / 1_000).toFixed(1)}K`;
  if (abs >= 100) return `${Math.floor(value)}`;
  if (abs >= 10) return `${Math.floor(value)}`;
  return `${Math.floor(value)}`;
}

export function formatRate(value: number): string {
  if (!Number.isFinite(value) || value <= 0) return '0/s';
  if (value < 0.01) return `${value.toFixed(3)}/s`;
  if (value < 0.1) return `${value.toFixed(2)}/s`;
  return `${value.toFixed(1)}/s`;
}

export function formatTemperature(value: number): string {
  return `${Math.round(value)}°`;
}

export function formatClock(clock: number): string {
  const minute = ((clock % 1440) + 1440) % 1440;
  const hours = Math.floor(minute / 60);
  const mins = Math.floor(minute % 60);
  return `${String(hours).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

export function formatCountdown(seconds: number): string {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const secs = safe % 60;
  return `${minutes}:${String(secs).padStart(2, '0')}`;
}

export function formatDuration(seconds: number): string {
  const safe = Math.max(0, Math.round(seconds));
  if (safe < 60) return `${safe}s`;
  const minutes = Math.floor(safe / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  const rest = minutes % 60;
  return `${hours}h ${rest}m`;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function clampNumber(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function cn(...values: Array<string | false | null | undefined>): string {
  return values.filter(Boolean).join(' ');
}
