import type { BoxCollider, CircleCollider, Collider } from '../data/colliders';
import type { WorldBounds } from '../data/types';

export interface Position2 {
  x: number;
  z: number;
}

export interface ResolvedPosition extends Position2 {
  collided: boolean;
}

const EPSILON = 1e-6;

export function resolveCircle(
  position: Position2,
  radius: number,
  colliders: Collider[],
  bounds: WorldBounds,
  iterations = 3
): ResolvedPosition {
  let x = clamp(position.x, bounds.minX + radius, bounds.maxX - radius);
  let z = clamp(position.z, bounds.minZ + radius, bounds.maxZ - radius);
  let collided = false;

  for (let pass = 0; pass < iterations; pass++) {
    let moved = false;
    for (const collider of colliders) {
      if (collider.kind === 'circle') {
        const pushed = pushOutOfCircle(x, z, radius, collider);
        if (pushed) {
          x = pushed.x;
          z = pushed.z;
          moved = true;
          collided = true;
        }
      } else {
        const pushed = pushOutOfBox(x, z, radius, collider);
        if (pushed) {
          x = pushed.x;
          z = pushed.z;
          moved = true;
          collided = true;
        }
      }
    }
    x = clamp(x, bounds.minX + radius, bounds.maxX - radius);
    z = clamp(z, bounds.minZ + radius, bounds.maxZ - radius);
    if (!moved) break;
  }

  return { x, z, collided };
}

export function moveAndCollide(
  from: Position2,
  delta: Position2,
  radius: number,
  colliders: Collider[],
  bounds: WorldBounds
): ResolvedPosition {
  return resolveCircle(
    { x: from.x + delta.x, z: from.z + delta.z },
    radius,
    colliders,
    bounds
  );
}

function pushOutOfCircle(
  x: number,
  z: number,
  radius: number,
  collider: CircleCollider
): Position2 | null {
  const dx = x - collider.x;
  const dz = z - collider.z;
  const reach = radius + collider.r;
  const distSq = dx * dx + dz * dz;
  if (distSq >= reach * reach) return null;
  if (distSq <= EPSILON) return { x: collider.x + reach, z: collider.z };
  const dist = Math.sqrt(distSq);
  const scale = reach / dist;
  return { x: collider.x + dx * scale, z: collider.z + dz * scale };
}

function pushOutOfBox(
  x: number,
  z: number,
  radius: number,
  collider: BoxCollider
): Position2 | null {
  const minX = collider.x - collider.hw;
  const maxX = collider.x + collider.hw;
  const minZ = collider.z - collider.hd;
  const maxZ = collider.z + collider.hd;

  const nearestX = clamp(x, minX, maxX);
  const nearestZ = clamp(z, minZ, maxZ);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  const distSq = dx * dx + dz * dz;

  if (distSq >= radius * radius) return null;

  if (distSq > EPSILON) {
    const dist = Math.sqrt(distSq);
    const scale = radius / dist;
    return { x: nearestX + dx * scale, z: nearestZ + dz * scale };
  }

  /* The centre is inside the box: leave by the shortest axis. */
  const overlapX = collider.hw + radius - Math.abs(x - collider.x);
  const overlapZ = collider.hd + radius - Math.abs(z - collider.z);
  if (overlapX < overlapZ) {
    return { x: x < collider.x ? collider.x - collider.hw - radius : collider.x + collider.hw + radius, z };
  }
  return { x, z: z < collider.z ? collider.z - collider.hd - radius : collider.z + collider.hd + radius };
}

/* How far a camera can travel from an anchor before entering geometry.
   Two-dimensional on purpose: the camera is high enough to clear low props,
   and treating every building as full-height is the conservative choice. */
export function clearDistance(
  origin: Position2,
  direction: Position2,
  maxDistance: number,
  colliders: Collider[],
  padding = 0.35
): number {
  let nearest = maxDistance;

  for (const collider of colliders) {
    if (collider.kind === 'box') {
      const hit = rayBox(origin, direction, collider, padding);
      if (hit !== null && hit < nearest) nearest = hit;
    } else {
      const hit = rayCircle(origin, direction, collider, padding);
      if (hit !== null && hit < nearest) nearest = hit;
    }
  }

  return Math.max(0.9, nearest);
}

function rayBox(
  origin: Position2,
  direction: Position2,
  box: BoxCollider,
  padding: number
): number | null {
  const minX = box.x - box.hw - padding;
  const maxX = box.x + box.hw + padding;
  const minZ = box.z - box.hd - padding;
  const maxZ = box.z + box.hd + padding;

  let tMin = 0;
  let tMax = Infinity;

  const axis = (originValue: number, dir: number, min: number, max: number): boolean => {
    if (Math.abs(dir) < EPSILON) return originValue >= min && originValue <= max;
    let t1 = (min - originValue) / dir;
    let t2 = (max - originValue) / dir;
    if (t1 > t2) [t1, t2] = [t2, t1];
    tMin = Math.max(tMin, t1);
    tMax = Math.min(tMax, t2);
    return tMin <= tMax;
  };

  if (!axis(origin.x, direction.x, minX, maxX)) return null;
  if (!axis(origin.z, direction.z, minZ, maxZ)) return null;
  if (tMax < 0) return null;
  return tMin > 0 ? tMin : 0;
}

function rayCircle(
  origin: Position2,
  direction: Position2,
  circle: CircleCollider,
  padding: number
): number | null {
  const radius = circle.r + padding;
  const ox = origin.x - circle.x;
  const oz = origin.z - circle.z;
  const a = direction.x * direction.x + direction.z * direction.z;
  const b = 2 * (ox * direction.x + oz * direction.z);
  const c = ox * ox + oz * oz - radius * radius;
  const discriminant = b * b - 4 * a * c;
  if (discriminant < 0) return null;
  const root = Math.sqrt(discriminant);
  const t1 = (-b - root) / (2 * a);
  const t2 = (-b + root) / (2 * a);
  if (t2 < 0) return null;
  return t1 > 0 ? t1 : 0;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
