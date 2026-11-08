export interface Vec2 {
  x: number;
  y: number;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function damp(current: number, target: number, smoothing: number, dt: number): number {
  return lerp(current, target, 1 - Math.exp(-smoothing * dt));
}

export function approach(current: number, target: number, delta: number): number {
  if (current < target) return Math.min(current + delta, target);
  return Math.max(current - delta, target);
}

export function sign(value: number): 1 | -1 {
  return value < 0 ? -1 : 1;
}

export function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

export function distanceSq(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return dx * dx + dy * dy;
}

export function circleOverlapsBox(
  cx: number,
  cy: number,
  radius: number,
  bx: number,
  by: number,
  halfWidth: number,
  halfHeight: number,
): boolean {
  const closestX = clamp(cx, bx - halfWidth, bx + halfWidth);
  const closestY = clamp(cy, by - halfHeight, by + halfHeight);
  return distanceSq(cx, cy, closestX, closestY) <= radius * radius;
}

export function formatPercent(value: number): string {
  return `${Math.round(value)}%`;
}

export function hashString(value: string): number {
  let hash = 2166136261;
  for (let i = 0; i < value.length; i++) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function roundTo(value: number, decimals = 3): number {
  const factor = 10 ** decimals;
  return Math.round(value * factor) / factor;
}
