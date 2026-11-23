import { describe, expect, it } from 'vitest';
import {
  buildCityColliders,
  CollisionWorld,
  pointInPolygon,
  type BoxCollider,
  type CircleCollider,
  type PolygonCollider
} from '../src/data/colliders';
import { FIDENZA, FIDENZA_WORLD } from '../src/data/fidenza';
import { resolveCircle, moveAndCollide, clearDistance } from '../src/player/collision';

const colliders = buildCityColliders();
const world = new CollisionWorld(colliders);

describe('Fidenza polygon collision', () => {
  it('keeps the spawn point free', () => {
    expect(world.isFree(-312, 12, 0.34)).toBe(true);
  });

  it('pushes the player out of a real building footprint', () => {
    const duomo = FIDENZA.buildings.find((building) => building.landmark === 'duomo');
    expect(duomo).toBeDefined();
    if (!duomo) return;
    const collider = colliders.find(
      (c) => c.kind === 'polygon' && Math.abs(c.x - duomo.x) < 0.1 && Math.abs(c.z - duomo.z) < 0.1
    ) as PolygonCollider | undefined;
    expect(collider).toBeDefined();
    if (!collider) return;
    const result = resolveCircle({ x: duomo.x, z: duomo.z }, 0.34, new CollisionWorld([collider]));
    expect(result.collided).toBe(true);
    expect(pointInPolygon(result.x, result.z, collider.pts)).toBe(false);
  });

  it('slides along a box wall instead of stopping', () => {
    const wall: BoxCollider = { kind: 'box', x: 0, z: 0, hw: 3, hd: 0.3 };
    const worldSmall = new CollisionWorld([wall], { minX: -10, maxX: 10, minZ: -10, maxZ: 10 });
    const moved = moveAndCollide({ x: 0, z: 0.65 }, { x: 1.2, z: -0.5 }, 0.3, worldSmall);
    expect(moved.x).toBeGreaterThan(1);
    expect(moved.z).toBeGreaterThanOrEqual(0.59);
  });

  it('pushes out of a circular tree', () => {
    const tree: CircleCollider = { kind: 'circle', x: 0, z: 0, r: 0.5 };
    const worldSmall = new CollisionWorld([tree], { minX: -10, maxX: 10, minZ: -10, maxZ: 10 });
    const result = resolveCircle({ x: 0.1, z: 0 }, 0.34, worldSmall);
    expect(result.collided).toBe(true);
    expect(Math.hypot(result.x, result.z)).toBeGreaterThanOrEqual(0.84 - 1e-6);
  });

  it('never leaves the playable bounds', () => {
    const empty = new CollisionWorld([], FIDENZA_WORLD);
    const result = resolveCircle({ x: 9999, z: -9999 }, 0.34, empty);
    expect(result.x).toBeLessThanOrEqual(FIDENZA_WORLD.maxX - 0.34);
    expect(result.z).toBeGreaterThanOrEqual(FIDENZA_WORLD.minZ + 0.34);
  });

  it('shortens the camera boom before a façade', () => {
    const distance = clearDistance({ x: -312, z: 12 }, { x: 1, z: 0 }, 30, world, 0.4);
    expect(distance).toBeLessThan(24);
    expect(distance).toBeGreaterThan(0.9);
  });

  it('does not shorten the camera in an open street', () => {
    const distance = clearDistance({ x: -130, z: 10 }, { x: 1, z: 0 }, 18, world, 0.4);
    expect(distance).toBeGreaterThan(14);
    expect(distance).toBeLessThanOrEqual(18);
  });

  it('uses a spatial hash that returns nearby polygons only', () => {
    const nearby = world.near(-312, 12, 4);
    expect(nearby.length).toBeGreaterThan(0);
    expect(nearby.length).toBeLessThan(colliders.length / 3);
  });
});
