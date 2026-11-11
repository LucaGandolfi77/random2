import type { Vec3 } from '../data/types';

export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));
export const clamp01 = (v: number): number => clamp(v, 0, 1);
export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;
export const smoothstep = (t: number): number => {
  const x = clamp01(t);
  return x * x * (3 - 2 * x);
};
export const easeInOut = smoothstep;
export const easeOut = (t: number): number => 1 - Math.pow(1 - clamp01(t), 3);
export const easeIn = (t: number): number => Math.pow(clamp01(t), 3);

export function lerpVec3(a: Vec3, b: Vec3, t: number, out: Vec3 = [0, 0, 0]): Vec3 {
  out[0] = lerp(a[0], b[0], t);
  out[1] = lerp(a[1], b[1], t);
  out[2] = lerp(a[2], b[2], t);
  return out;
}

export function applyEase(name: string, t: number): number {
  const x = clamp01(t);
  switch (name) {
    case 'inOut':
      return easeInOut(x);
    case 'out':
      return easeOut(x);
    case 'in':
      return easeIn(x);
    default:
      return x;
  }
}

export function hash(n: number): number {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453123;
  return s - Math.floor(s);
}

export function noise1(x: number, seed = 0): number {
  const i = Math.floor(x);
  const f = x - i;
  const a = hash(i + seed * 13.17);
  const b = hash(i + 1 + seed * 13.17);
  const u = f * f * (3 - 2 * f);
  return lerp(a, b, u) * 2 - 1;
}

export function noise2(x: number, y: number, seed = 0): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash(xi + yi * 57.31 + seed * 17.13);
  const b = hash(xi + 1 + yi * 57.31 + seed * 17.13);
  const c = hash(xi + (yi + 1) * 57.31 + seed * 17.13);
  const d = hash(xi + 1 + (yi + 1) * 57.31 + seed * 17.13);
  return lerp(lerp(a, b, u), lerp(c, d, u), v) * 2 - 1;
}

export function wrapAngle(a: number): number {
  let x = a;
  while (x > Math.PI) x -= Math.PI * 2;
  while (x < -Math.PI) x += Math.PI * 2;
  return x;
}

export function shortestAngle(from: number, to: number): number {
  return wrapAngle(to - from);
}

export function formatTime(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const m = Math.floor(s / 60);
  const r = s % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}
