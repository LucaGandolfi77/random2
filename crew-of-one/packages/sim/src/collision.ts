import type { Rect, Vec2 } from './types';

export const circleRectOverlap = (
  cx: number,
  cy: number,
  radius: number,
  rect: Rect,
): boolean => {
  const nearestX = Math.max(rect.x, Math.min(cx, rect.x + rect.w));
  const nearestY = Math.max(rect.y, Math.min(cy, rect.y + rect.h));
  const dx = cx - nearestX;
  const dy = cy - nearestY;
  return dx * dx + dy * dy <= radius * radius;
};

export const pointInRect = (x: number, y: number, rect: Rect): boolean =>
  x >= rect.x && x <= rect.x + rect.w && y >= rect.y && y <= rect.y + rect.h;

/**
 * Moves a circle with axis-separated collision. Stable and deterministic:
 * move X, revert on collision, then move Y, revert on collision.
 */
export const moveCircle = (
  x: number,
  y: number,
  radius: number,
  dx: number,
  dy: number,
  walls: Rect[],
): Vec2 => {
  let nextX = x + dx;
  if (walls.some((wall) => circleRectOverlap(nextX, y, radius, wall))) {
    nextX = x;
  }

  let nextY = y + dy;
  if (walls.some((wall) => circleRectOverlap(nextX, nextY, radius, wall))) {
    nextY = y;
  }

  return { x: nextX, y: nextY };
};

export const distanceToSegment = (px: number, py: number, ax: number, ay: number, bx: number, by: number): number => {
  const abx = bx - ax;
  const aby = by - ay;
  const apx = px - ax;
  const apy = py - ay;
  const lengthSq = abx * abx + aby * aby;
  if (lengthSq === 0) return Math.hypot(apx, apy);
  const t = Math.max(0, Math.min(1, (apx * abx + apy * aby) / lengthSq));
  return Math.hypot(px - (ax + abx * t), py - (ay + aby * t));
};

export const segmentIntersectsRect = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  rect: Rect,
): boolean => {
  if (pointInRect(ax, ay, rect) || pointInRect(bx, by, rect)) return true;

  const left = { x: rect.x, y: rect.y };
  const right = { x: rect.x + rect.w, y: rect.y };
  const bottom = { x: rect.x, y: rect.y + rect.h };
  const top = { x: rect.x + rect.w, y: rect.y + rect.h };

  const segments: Array<[Vec2, Vec2]> = [
    [left, right],
    [right, top],
    [top, bottom],
    [bottom, left],
  ];

  return segments.some(([a, b]) => segmentsIntersect(ax, ay, bx, by, a.x, a.y, b.x, b.y));
};

const cross = (ax: number, ay: number, bx: number, by: number): number => ax * by - ay * bx;

const segmentsIntersect = (
  ax: number,
  ay: number,
  bx: number,
  by: number,
  cx: number,
  cy: number,
  dx: number,
  dy: number,
): boolean => {
  const r1 = cross(bx - ax, by - ay, cx - ax, cy - ay);
  const r2 = cross(bx - ax, by - ay, dx - ax, dy - ay);
  const r3 = cross(dx - cx, dy - cy, ax - cx, ay - cy);
  const r4 = cross(dx - cx, dy - cy, bx - cx, by - cy);
  return r1 * r2 < 0 && r3 * r4 < 0;
};
