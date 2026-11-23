import { FIDENZA, FIDENZA_WORLD } from './fidenza';
import type { PropSpec, WorldBounds } from './types';

export interface CircleCollider {
  kind: 'circle';
  x: number;
  z: number;
  r: number;
}

export interface BoxCollider {
  kind: 'box';
  x: number;
  z: number;
  hw: number;
  hd: number;
}

export interface PolygonCollider {
  kind: 'polygon';
  x: number;
  z: number;
  /** Flat [x,z,x,z,…] ring. */
  pts: number[];
  minX: number;
  maxX: number;
  minZ: number;
  maxZ: number;
  /** Signed area sign tells which side is outside. */
  ccw: boolean;
}

export type Collider = CircleCollider | BoxCollider | PolygonCollider;

export interface ResolvedPosition {
  x: number;
  z: number;
  collided: boolean;
}

const EPSILON = 1e-6;
const GRID = 8;

export function polygonBBox(pts: number[]): { minX: number; maxX: number; minZ: number; maxZ: number } {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (let i = 0; i < pts.length; i += 2) {
    const x = pts[i];
    const z = pts[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

export function signedArea(pts: number[]): number {
  let area = 0;
  const count = pts.length / 2;
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    area += pts[i * 2] * pts[j * 2 + 1] - pts[j * 2] * pts[i * 2 + 1];
  }
  return area / 2;
}

export function buildCityColliders(extra: Collider[] = []): Collider[] {
  const colliders: Collider[] = [];

  for (const building of FIDENZA.buildings) {
    if (building.poly.length < 6) continue;
    const bbox = polygonBBox(building.poly);
    if (
      bbox.maxX < FIDENZA_WORLD.minX - 10 ||
      bbox.minX > FIDENZA_WORLD.maxX + 10 ||
      bbox.maxZ < FIDENZA_WORLD.minZ - 10 ||
      bbox.minZ > FIDENZA_WORLD.maxZ + 10
    ) {
      continue;
    }
    if (building.landmark === 'porta') {
      /* A gate, not a solid block: leave the passage open. */
      const inset = Math.min(1.6, (bbox.maxZ - bbox.minZ) / 2);
      colliders.push(
        { kind: 'box', x: building.x, z: bbox.minZ + inset, hw: 1.6, hd: inset },
        { kind: 'box', x: building.x, z: bbox.maxZ - inset, hw: 1.6, hd: inset }
      );
      continue;
    }
    colliders.push({
      kind: 'polygon',
      x: building.x,
      z: building.z,
      pts: building.poly,
      ...bbox,
      ccw: signedArea(building.poly) > 0
    });
  }

  for (const tree of FIDENZA.trees) {
    colliders.push({ kind: 'circle', x: tree.x, z: tree.z, r: 0.42 });
  }

  for (const item of FIDENZA.furniture) {
    if (item.type === 'fountain') {
      colliders.push({ kind: 'circle', x: item.x, z: item.z, r: 1.1 });
    } else if (item.type === 'bench' || item.type === 'memorial' || item.type === 'monument') {
      colliders.push({ kind: 'box', x: item.x, z: item.z, hw: 0.9, hd: 0.45 });
    }
  }

  colliders.push(...extra);
  return colliders;
}

/** Extra colliders for props that are added by the world builder. */
export function propCollider(prop: PropSpec): Collider | null {
  const scale = prop.scale ?? 1;
  switch (prop.kind) {
    case 'olive':
      return { kind: 'circle', x: prop.x, z: prop.z, r: 0.5 * scale };
    case 'plane':
      return { kind: 'circle', x: prop.x, z: prop.z, r: 0.55 * scale };
    case 'cypress':
      return { kind: 'circle', x: prop.x, z: prop.z, r: 0.38 * scale };
    case 'telescope':
      return { kind: 'circle', x: prop.x, z: prop.z, r: 0.35 };
    case 'fountain':
      return { kind: 'circle', x: prop.x, z: prop.z, r: 2.2 * scale };
    case 'table':
    case 'cart':
    case 'wall':
    case 'planter':
      return {
        kind: 'box',
        x: prop.x,
        z: prop.z,
        hw: (prop.w ?? 1.2) / 2,
        hd: (prop.d ?? 0.8) / 2
      };
    case 'bench':
      return { kind: 'box', x: prop.x, z: prop.z, hw: 0.9, hd: 0.35 };
    case 'arch':
      return { kind: 'box', x: prop.x, z: prop.z, hw: 0.45, hd: 0.45 };
    default:
      return null;
  }
}

export class CollisionWorld {
  readonly bounds: WorldBounds;
  readonly colliders: Collider[];
  private grid = new Map<string, Collider[]>();
  private dynamicColliders: Collider[] = [];

  constructor(colliders: Collider[], bounds: WorldBounds = FIDENZA_WORLD) {
    this.bounds = bounds;
    this.colliders = colliders;
    for (const collider of colliders) {
      const box = colliderBounds(collider);
      const minX = Math.floor(box.minX / GRID);
      const maxX = Math.floor(box.maxX / GRID);
      const minZ = Math.floor(box.minZ / GRID);
      const maxZ = Math.floor(box.maxZ / GRID);
      for (let ix = minX; ix <= maxX; ix++) {
        for (let iz = minZ; iz <= maxZ; iz++) {
          const key = `${ix},${iz}`;
          const bucket = this.grid.get(key);
          if (bucket) bucket.push(collider);
          else this.grid.set(key, [collider]);
        }
      }
    }
  }

  /** Parked vehicles and other moving obstacles. They are few, so a linear scan is cheap. */
  setDynamic(colliders: Collider[]): void {
    this.dynamicColliders = colliders;
  }

  near(x: number, z: number, radius: number): Collider[] {
    const minX = Math.floor((x - radius) / GRID);
    const maxX = Math.floor((x + radius) / GRID);
    const minZ = Math.floor((z - radius) / GRID);
    const maxZ = Math.floor((z + radius) / GRID);
    const found = new Set<Collider>();
    for (let ix = minX; ix <= maxX; ix++) {
      for (let iz = minZ; iz <= maxZ; iz++) {
        for (const collider of this.grid.get(`${ix},${iz}`) ?? []) found.add(collider);
      }
    }
    for (const collider of this.dynamicColliders) {
      const box = colliderBounds(collider);
      if (
        box.maxX >= x - radius &&
        box.minX <= x + radius &&
        box.maxZ >= z - radius &&
        box.minZ <= z + radius
      ) {
        found.add(collider);
      }
    }
    return [...found];
  }

  isFree(x: number, z: number, radius: number): boolean {
    if (
      x - radius < this.bounds.minX ||
      x + radius > this.bounds.maxX ||
      z - radius < this.bounds.minZ ||
      z + radius > this.bounds.maxZ
    ) {
      return false;
    }
    for (const collider of this.near(x, z, radius + 0.1)) {
      if (overlapsCircle(x, z, radius, collider)) return false;
    }
    return true;
  }

  resolve(position: { x: number; z: number }, radius: number, iterations = 3): ResolvedPosition {
    let x = clamp(position.x, this.bounds.minX + radius, this.bounds.maxX - radius);
    let z = clamp(position.z, this.bounds.minZ + radius, this.bounds.maxZ - radius);
    let collided = false;

    for (let pass = 0; pass < iterations; pass++) {
      let moved = false;
      for (const collider of this.near(x, z, radius + 0.1)) {
        const pushed = pushOut(x, z, radius, collider);
        if (pushed) {
          x = pushed.x;
          z = pushed.z;
          moved = true;
          collided = true;
        }
      }
      x = clamp(x, this.bounds.minX + radius, this.bounds.maxX - radius);
      z = clamp(z, this.bounds.minZ + radius, this.bounds.maxZ - radius);
      if (!moved) break;
    }
    return { x, z, collided };
  }

  move(from: { x: number; z: number }, delta: { x: number; z: number }, radius: number): ResolvedPosition {
    return this.resolve({ x: from.x + delta.x, z: from.z + delta.z }, radius);
  }

  clearDistance(
    origin: { x: number; z: number },
    direction: { x: number; z: number },
    maxDistance: number,
    padding = 0.35
  ): number {
    const end = {
      x: origin.x + direction.x * maxDistance,
      z: origin.z + direction.z * maxDistance
    };
    const minX = Math.floor((Math.min(origin.x, end.x) - padding) / GRID);
    const maxX = Math.floor((Math.max(origin.x, end.x) + padding) / GRID);
    const minZ = Math.floor((Math.min(origin.z, end.z) - padding) / GRID);
    const maxZ = Math.floor((Math.max(origin.z, end.z) + padding) / GRID);
    const found = new Set<Collider>();
    for (let ix = minX; ix <= maxX; ix++) {
      for (let iz = minZ; iz <= maxZ; iz++) {
        for (const collider of this.grid.get(`${ix},${iz}`) ?? []) found.add(collider);
      }
    }

    for (const collider of this.dynamicColliders) found.add(collider);

    let nearest = maxDistance;
    for (const collider of found) {
      const hit = rayHit(origin, direction, collider, padding);
      if (hit !== null && hit > 0 && hit < nearest) nearest = hit;
    }
    return Math.max(0.9, nearest);
  }
}

function colliderBounds(collider: Collider): { minX: number; maxX: number; minZ: number; maxZ: number } {
  if (collider.kind === 'polygon') {
    return { minX: collider.minX, maxX: collider.maxX, minZ: collider.minZ, maxZ: collider.maxZ };
  }
  if (collider.kind === 'box') {
    return {
      minX: collider.x - collider.hw,
      maxX: collider.x + collider.hw,
      minZ: collider.z - collider.hd,
      maxZ: collider.z + collider.hd
    };
  }
  return {
    minX: collider.x - collider.r,
    maxX: collider.x + collider.r,
    minZ: collider.z - collider.r,
    maxZ: collider.z + collider.r
  };
}

function overlapsCircle(x: number, z: number, radius: number, collider: Collider): boolean {
  return pushOut(x, z, radius, collider) !== null;
}

function pushOut(x: number, z: number, radius: number, collider: Collider): { x: number; z: number } | null {
  if (collider.kind === 'circle') return pushOutOfCircle(x, z, radius, collider);
  if (collider.kind === 'box') return pushOutOfBox(x, z, radius, collider);
  return pushOutOfPolygon(x, z, radius, collider);
}

function pushOutOfCircle(
  x: number,
  z: number,
  radius: number,
  collider: CircleCollider
): { x: number; z: number } | null {
  const dx = x - collider.x;
  const dz = z - collider.z;
  const reach = radius + collider.r;
  const distanceSq = dx * dx + dz * dz;
  if (distanceSq >= reach * reach) return null;
  if (distanceSq <= EPSILON) return { x: collider.x + reach, z: collider.z };
  const distance = Math.sqrt(distanceSq);
  const scale = reach / distance;
  return { x: collider.x + dx * scale, z: collider.z + dz * scale };
}

function pushOutOfBox(
  x: number,
  z: number,
  radius: number,
  collider: BoxCollider
): { x: number; z: number } | null {
  const minX = collider.x - collider.hw;
  const maxX = collider.x + collider.hw;
  const minZ = collider.z - collider.hd;
  const maxZ = collider.z + collider.hd;
  const nearestX = clamp(x, minX, maxX);
  const nearestZ = clamp(z, minZ, maxZ);
  const dx = x - nearestX;
  const dz = z - nearestZ;
  const distanceSq = dx * dx + dz * dz;
  if (distanceSq >= radius * radius) return null;
  if (distanceSq > EPSILON) {
    const distance = Math.sqrt(distanceSq);
    const scale = radius / distance;
    return { x: nearestX + dx * scale, z: nearestZ + dz * scale };
  }
  const overlapX = collider.hw + radius - Math.abs(x - collider.x);
  const overlapZ = collider.hd + radius - Math.abs(z - collider.z);
  if (overlapX < overlapZ) {
    return {
      x: x < collider.x ? collider.x - collider.hw - radius : collider.x + collider.hw + radius,
      z
    };
  }
  return {
    x,
    z: z < collider.z ? collider.z - collider.hd - radius : collider.z + collider.hd + radius
  };
}

function pushOutOfPolygon(
  x: number,
  z: number,
  radius: number,
  collider: PolygonCollider
): { x: number; z: number } | null {
  const inside = pointInPolygon(x, z, collider.pts);
  let nearestX = 0;
  let nearestZ = 0;
  let nearestSq = Infinity;
  let edgeX = 0;
  let edgeZ = 0;
  let nearestIndex = -1;
  const count = collider.pts.length / 2;

  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    const ax = collider.pts[i * 2];
    const az = collider.pts[i * 2 + 1];
    const bx = collider.pts[j * 2];
    const bz = collider.pts[j * 2 + 1];
    const abx = bx - ax;
    const abz = bz - az;
    const lengthSq = abx * abx + abz * abz;
    let t = lengthSq > EPSILON ? ((x - ax) * abx + (z - az) * abz) / lengthSq : 0;
    t = clamp(t, 0, 1);
    const px = ax + abx * t;
    const pz = az + abz * t;
    const dx = x - px;
    const dz = z - pz;
    const distanceSq = dx * dx + dz * dz;
    if (distanceSq < nearestSq) {
      nearestSq = distanceSq;
      nearestX = px;
      nearestZ = pz;
      edgeX = abx;
      edgeZ = abz;
      nearestIndex = i;
    }
  }

  if (!inside && nearestSq >= radius * radius) return null;
  if (nearestIndex < 0) return null;

  if (inside) {
    const edgeLength = Math.hypot(edgeX, edgeZ) || 1;
    let nx = edgeZ / edgeLength;
    let nz = -edgeX / edgeLength;
    if (!collider.ccw) {
      nx = -nx;
      nz = -nz;
    }
    return { x: nearestX + nx * radius, z: nearestZ + nz * radius };
  }

  const distance = Math.sqrt(nearestSq);
  if (distance <= EPSILON) {
    return { x: nearestX + radius, z: nearestZ };
  }
  const scale = radius / distance;
  return { x: nearestX + (x - nearestX) * scale, z: nearestZ + (z - nearestZ) * scale };
}

export function pointInPolygon(x: number, z: number, pts: number[]): boolean {
  let inside = false;
  const count = pts.length / 2;
  for (let i = 0, j = count - 1; i < count; j = i++) {
    const xi = pts[i * 2];
    const zi = pts[i * 2 + 1];
    const xj = pts[j * 2];
    const zj = pts[j * 2 + 1];
    if (zi > z !== zj > z && x < ((xj - xi) * (z - zi)) / (zj - zi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}

function rayHit(
  origin: { x: number; z: number },
  direction: { x: number; z: number },
  collider: Collider,
  padding: number
): number | null {
  if (collider.kind === 'circle') {
    const radius = collider.r + padding;
    const ox = origin.x - collider.x;
    const oz = origin.z - collider.z;
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

  if (collider.kind === 'box') {
    return rayBox(origin, direction, collider, padding);
  }

  let nearest: number | null = null;
  const count = collider.pts.length / 2;
  for (let i = 0; i < count; i++) {
    const j = (i + 1) % count;
    const hit = raySegment(
      origin,
      direction,
      { x: collider.pts[i * 2], z: collider.pts[i * 2 + 1] },
      { x: collider.pts[j * 2], z: collider.pts[j * 2 + 1] }
    );
    if (hit !== null && (nearest === null || hit < nearest)) nearest = hit;
  }
  return nearest;
}

function rayBox(
  origin: { x: number; z: number },
  direction: { x: number; z: number },
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

function raySegment(
  origin: { x: number; z: number },
  direction: { x: number; z: number },
  a: { x: number; z: number },
  b: { x: number; z: number }
): number | null {
  const ex = b.x - a.x;
  const ez = b.z - a.z;
  const denominator = direction.x * ez - direction.z * ex;
  if (Math.abs(denominator) < EPSILON) return null;
  const ox = a.x - origin.x;
  const oz = a.z - origin.z;
  const t = (ox * ez - oz * ex) / denominator;
  const u = (ox * direction.z - oz * direction.x) / denominator;
  if (t < 0 || u < 0 || u > 1) return null;
  return t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

/** Convenience for callers that only need a free point. */
export function isFreePoint(x: number, z: number, radius: number, world: CollisionWorld): boolean {
  return world.isFree(x, z, radius);
}
