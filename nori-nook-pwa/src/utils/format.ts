export const formatNumber = (value: number): string => {
  if (value >= 10000) return `${Math.round(value / 1000)}k`;
  return new Intl.NumberFormat('en-US').format(Math.round(value));
};

export const formatTime = (seconds: number): string => {
  const safe = Math.max(0, Math.ceil(seconds));
  const minutes = Math.floor(safe / 60);
  const rest = safe % 60;
  return `${minutes}:${String(rest).padStart(2, '0')}`;
};

export const titleCase = (value: string): string =>
  value
    .split(/[\s_-]+/)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');

export const plural = (count: number, singular: string, pluralForm?: string): string =>
  count === 1 ? singular : (pluralForm ?? `${singular}s`);

export const percent = (value: number, total: number): number =>
  total <= 0 ? 0 : Math.max(0, Math.min(100, Math.round((value / total) * 100)));

export const stars = (count: number): string => '★'.repeat(Math.max(0, count)) + '☆'.repeat(Math.max(0, 3 - count));
