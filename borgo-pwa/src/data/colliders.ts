import { BUILDINGS, PROPS, WORLD } from './town';
import type { WorldBounds } from './types';

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

export type Collider = CircleCollider | BoxCollider;

export function buildColliders(): Collider[] {
  const colliders: Collider[] = BUILDINGS.map((b) => ({
    kind: 'box',
    x: b.x,
    z: b.z,
    hw: b.w / 2,
    hd: b.d / 2
  }));

  for (const prop of PROPS) {
    const scale = prop.scale ?? 1;
    switch (prop.kind) {
      case 'olive':
        colliders.push({ kind: 'circle', x: prop.x, z: prop.z, r: 0.5 * scale });
        break;
      case 'cypress':
        colliders.push({ kind: 'circle', x: prop.x, z: prop.z, r: 0.38 * scale });
        break;
      case 'telescope':
        colliders.push({ kind: 'circle', x: prop.x, z: prop.z, r: 0.35 });
        break;
      case 'fountain':
        colliders.push({ kind: 'circle', x: prop.x, z: prop.z, r: 2.2 });
        break;
      case 'table':
        colliders.push({
          kind: 'box',
          x: prop.x,
          z: prop.z,
          hw: (prop.w ?? 1.2) / 2,
          hd: (prop.d ?? 0.8) / 2
        });
        break;
      case 'bench': {
        const rotated = Math.abs(Math.sin(prop.rot ?? 0)) > 0.7;
        colliders.push({
          kind: 'box',
          x: prop.x,
          z: prop.z,
          hw: rotated ? 0.35 : 0.9,
          hd: rotated ? 0.9 : 0.35
        });
        break;
      }
      case 'cart':
        colliders.push({
          kind: 'box',
          x: prop.x,
          z: prop.z,
          hw: (prop.w ?? 2) / 2,
          hd: (prop.d ?? 1.2) / 2
        });
        break;
      case 'wall':
      case 'planter':
        colliders.push({
          kind: 'box',
          x: prop.x,
          z: prop.z,
          hw: (prop.w ?? 1) / 2,
          hd: (prop.d ?? 0.5) / 2
        });
        break;
      case 'arch': {
        const half = (prop.w ?? 4.4) / 2;
        colliders.push({ kind: 'box', x: prop.x, z: prop.z - half, hw: 0.45, hd: 0.45 });
        colliders.push({ kind: 'box', x: prop.x, z: prop.z + half, hw: 0.45, hd: 0.45 });
        break;
      }
      default:
        break;
    }
  }

  return colliders;
}

export const WORLD_BOUNDS: WorldBounds = WORLD;

export function isFreePoint(
  x: number,
  z: number,
  radius: number,
  colliders: Collider[],
  bounds: WorldBounds
): boolean {
  if (x - radius < bounds.minX || x + radius > bounds.maxX) return false;
  if (z - radius < bounds.minZ || z + radius > bounds.maxZ) return false;

  for (const c of colliders) {
    if (c.kind === 'circle') {
      const dx = x - c.x;
      const dz = z - c.z;
      const reach = c.r + radius;
      if (dx * dx + dz * dz < reach * reach) return false;
    } else {
      const nx = Math.max(c.x - c.hw, Math.min(x, c.x + c.hw));
      const nz = Math.max(c.z - c.hd, Math.min(z, c.z + c.hd));
      const dx = x - nx;
      const dz = z - nz;
      if (dx * dx + dz * dz < radius * radius) return false;
    }
  }

  return true;
}
