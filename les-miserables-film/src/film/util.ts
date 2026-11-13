export const TAU = Math.PI * 2;

export function clamp(value: number, min = 0, max = 1): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function smooth(t: number): number {
  const x = clamp(t);
  return x * x * (3 - 2 * x);
}

export function easeOut(t: number): number {
  const x = clamp(t);
  return 1 - Math.pow(1 - x, 3);
}

export function easeIn(t: number): number {
  const x = clamp(t);
  return x * x * x;
}

export function mod(value: number, n: number): number {
  return ((value % n) + n) % n;
}

/** Deterministic hash in [0,1). */
export function hash(n: number): number {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return x - Math.floor(x);
}

export function hash2(x: number, y: number): number {
  return hash(x * 57.31 + y * 19.77);
}

/** Smooth deterministic 1D value noise in [0,1]. */
export function noise1(x: number): number {
  const i = Math.floor(x);
  const f = x - i;
  const u = f * f * (3 - 2 * f);
  return lerp(hash(i), hash(i + 1), u);
}

export function seeded(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state * 1664525 + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

export function rangeProgress(t: number, start: number, end: number): number {
  return clamp((t - start) / Math.max(0.001, end - start));
}

export function inRange(t: number, start: number, end: number): boolean {
  return t >= start && t < end;
}

export function mixColor(a: string, b: string, t: number): string {
  const ca = parseHex(a);
  const cb = parseHex(b);
  const p = clamp(t);
  return `rgb(${Math.round(lerp(ca[0], cb[0], p))}, ${Math.round(
    lerp(ca[1], cb[1], p),
  )}, ${Math.round(lerp(ca[2], cb[2], p))})`;
}

export function parseHex(hex: string): [number, number, number] {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.split('').map((c) => c + c).join('');
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = parseHex(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha)})`;
}

export function alphaColor(hex: string, alpha: number): string {
  return rgba(hex, alpha);
}

/** Fade-in over the first `inDur` seconds and out over the last `outDur`. */
export function windowFade(t: number, start: number, end: number, inDur = 0.6, outDur = 0.6): number {
  if (t <= start || t >= end) return 0;
  const a = clamp((t - start) / Math.max(0.001, inDur));
  const b = clamp((end - t) / Math.max(0.001, outDur));
  return smooth(Math.min(a, b));
}

export function diamond(ctx: CanvasRenderingContext2D, x: number, y: number, r: number): void {
  ctx.beginPath();
  ctx.moveTo(x, y - r);
  ctx.lineTo(x + r, y);
  ctx.lineTo(x, y + r);
  ctx.lineTo(x - r, y);
  ctx.closePath();
}

export function formatClock(seconds: number): string {
  const total = Math.max(0, Math.round(seconds));
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function cssVar(name: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim() || fallback;
}
