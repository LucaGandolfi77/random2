export const clamp = (value: number, min = 0, max = 100): number => Math.min(max, Math.max(min, value));

export const round = (value: number): number => Math.round(value);

export const average = (values: number[]): number => {
  if (values.length === 0) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const pct = (value: number, total: number): number => (total <= 0 ? 0 : (value / total) * 100);
