import type { CollisionWorld, ResolvedPosition } from '../data/colliders';

export interface Position2 {
  x: number;
  z: number;
}

export type { ResolvedPosition };

export function resolveCircle(
  position: Position2,
  radius: number,
  world: CollisionWorld,
  iterations = 3
): ResolvedPosition {
  return world.resolve(position, radius, iterations);
}

export function moveAndCollide(
  from: Position2,
  delta: Position2,
  radius: number,
  world: CollisionWorld
): ResolvedPosition {
  return world.move(from, delta, radius);
}

export function clearDistance(
  origin: Position2,
  direction: Position2,
  maxDistance: number,
  world: CollisionWorld,
  padding = 0.35
): number {
  return world.clearDistance(origin, direction, maxDistance, padding);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
