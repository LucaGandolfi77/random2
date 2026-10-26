import type { Direction, Vec2 } from './types';

export const clamp = (value: number, min: number, max: number): number =>
  Math.max(min, Math.min(max, value));

export const distanceSq = (a: Vec2, b: Vec2): number => {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
};

export const distance = (a: Vec2, b: Vec2): number => Math.sqrt(distanceSq(a, b));

export const normalize = (x: number, y: number): Vec2 => {
  const length = Math.hypot(x, y);
  if (length === 0) return { x: 0, y: 0 };
  return { x: x / length, y: y / length };
};

export const directionFrom = (x: number, y: number, previous: Direction): Direction => {
  if (Math.abs(x) < 0.001 && Math.abs(y) < 0.001) return previous;
  if (Math.abs(x) > Math.abs(y)) return x > 0 ? 1 : 3;
  return y > 0 ? 2 : 0;
};

export const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

export const directionToVector = (direction: Direction): Vec2 => {
  switch (direction) {
    case 0:
      return { x: 0, y: -1 };
    case 1:
      return { x: 1, y: 0 };
    case 2:
      return { x: 0, y: 1 };
    case 3:
      return { x: -1, y: 0 };
  }
};

export const rectContainsPoint = (
  rect: { x: number; y: number; w: number; h: number },
  point: Vec2,
): boolean =>
  point.x >= rect.x &&
  point.x <= rect.x + rect.w &&
  point.y >= rect.y &&
  point.y <= rect.y + rect.h;

/** Small deterministic PRNG for authored variation. Never call in a loop that affects replay. */
export const mulberry32 = (seed: number): (() => number) => {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};
