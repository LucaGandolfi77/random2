export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function invLerp(a: number, b: number, value: number): number {
  if (a === b) return 0;
  return clamp((value - a) / (b - a), 0, 1);
}

export function smoothstep(edge0: number, edge1: number, value: number): number {
  const t = invLerp(edge0, edge1, value);
  return t * t * (3 - 2 * t);
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function easeInCubic(t: number): number {
  return t * t * t;
}

/** Deterministic 32-bit PRNG. */
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(value: string): number {
  let h = 2166136261;
  for (let i = 0; i < value.length; i++) {
    h ^= value.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function seeded(seed: number | string): () => number {
  return mulberry32(typeof seed === 'string' ? hashString(seed) : seed);
}

/** Smooth 1D value noise in [-1, 1]. */
export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = pseudo(i, seed);
  const b = pseudo(i + 1, seed);
  const u = f * f * (3 - 2 * f);
  return lerp(a, b, u);
}

function pseudo(n: number, seed: number): number {
  const v = Math.sin(n * 127.1 + seed * 311.7) * 43758.5453123;
  return (v - Math.floor(v)) * 2 - 1;
}

export function mod(value: number, divisor: number): number {
  return ((value % divisor) + divisor) % divisor;
}

/** Draws text with manual letter spacing. Returns the drawn width. */
export function drawSpacedText(
  ctx: CanvasRenderingContext2D,
  text: string,
  x: number,
  y: number,
  spacing: number,
  align: 'left' | 'center' | 'right' = 'left',
): number {
  const chars = [...text];
  const widths = chars.map((ch) => ctx.measureText(ch).width);
  const total = widths.reduce((sum, w) => sum + w, 0) + spacing * Math.max(0, chars.length - 1);
  let cursor = x;
  if (align === 'center') cursor -= total / 2;
  if (align === 'right') cursor -= total;
  const previous = ctx.textAlign;
  ctx.textAlign = 'left';
  for (let i = 0; i < chars.length; i++) {
    ctx.fillText(chars[i]!, cursor, y);
    cursor += widths[i]! + spacing;
  }
  ctx.textAlign = previous;
  return total;
}

/** Builds a closed organic blob path. */
export function blobPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  radius: number,
  time: number,
  seed: number,
  lobes = 7,
  wobble = 0.18,
  squash = 1,
): void {
  const points: Array<[number, number]> = [];
  const count = Math.max(8, lobes * 2);
  for (let i = 0; i < count; i++) {
    const a = (i / count) * TAU;
    const n =
      Math.sin(a * lobes + time * 0.55 + seed) * 0.55 +
      Math.sin(a * (lobes + 2) - time * 0.37 + seed * 2.1) * 0.3 +
      Math.sin(a * 3 + time * 0.2 + seed * 3.7) * 0.15;
    const r = radius * (1 + n * wobble);
    points.push([cx + Math.cos(a) * r, cy + Math.sin(a) * r * squash]);
  }
  smoothClosedPath(ctx, points);
}

export function smoothClosedPath(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
): void {
  if (points.length < 3) return;
  const last = points[points.length - 1]!;
  const first = points[0]!;
  ctx.beginPath();
  ctx.moveTo((last[0] + first[0]) / 2, (last[1] + first[1]) / 2);
  for (let i = 0; i < points.length; i++) {
    const current = points[i]!;
    const next = points[(i + 1) % points.length]!;
    ctx.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
  }
  ctx.closePath();
}

export function smoothOpenPath(
  ctx: CanvasRenderingContext2D,
  points: Array<[number, number]>,
): void {
  if (points.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(points[0]![0], points[0]![1]);
  for (let i = 1; i < points.length - 1; i++) {
    const current = points[i]!;
    const next = points[i + 1]!;
    ctx.quadraticCurveTo(current[0], current[1], (current[0] + next[0]) / 2, (current[1] + next[1]) / 2);
  }
  const last = points[points.length - 1]!;
  ctx.lineTo(last[0], last[1]);
}

export function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const value = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const n = Number.parseInt(value, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

export function rgba(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${clamp(alpha, 0, 1)})`;
}

export function mixColor(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  const p = clamp(t, 0, 1);
  return `rgb(${Math.round(lerp(ar, br, p))}, ${Math.round(lerp(ag, bg, p))}, ${Math.round(lerp(ab, bb, p))})`;
}

export function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  return [
    Math.round(lerp(a[0], b[0], t)),
    Math.round(lerp(a[1], b[1], t)),
    Math.round(lerp(a[2], b[2], t)),
  ];
}
