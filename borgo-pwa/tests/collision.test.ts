import { describe, expect, it } from 'vitest';
import { buildColliders, isFreePoint, WORLD_BOUNDS } from '../src/data/colliders';
import { TILES } from '../src/data/town';
import { resolveCircle, moveAndCollide, clearDistance } from '../src/player/collision';

const colliders = buildColliders();

describe('circle collision', () => {
  it('walks freely when nothing is near', () => {
    const result = resolveCircle({ x: 0, z: 13 }, 0.34, colliders, WORLD_BOUNDS);
    expect(result.collided).toBe(false);
    expect(result.x).toBe(0);
    expect(result.z).toBe(13);
  });

  it('pushes out of a circular tree', () => {
    const tree = colliders.find(
      (c) => c.kind === 'circle' && Math.abs(c.x - -26) < 0.01 && Math.abs(c.z - 26) < 0.01
    );
    expect(tree).toBeDefined();
    if (tree?.kind !== 'circle') throw new Error('tree missing');
    const result = resolveCircle({ x: tree.x + 0.1, z: tree.z }, 0.34, [tree], WORLD_BOUNDS);
    expect(result.collided).toBe(true);
    const distance = Math.hypot(result.x - tree.x, result.z - tree.z);
    expect(distance).toBeGreaterThanOrEqual(tree.r + 0.34 - 1e-6);
  });

  it('pushes out of a building wall', () => {
    const bakery = colliders.find(
      (c) => c.kind === 'box' && Math.abs(c.x - -22) < 0.01 && Math.abs(c.z - 1) < 0.01
    );
    expect(bakery).toBeDefined();
    if (bakery?.kind !== 'box') throw new Error('bakery missing');

    const result = resolveCircle(
      { x: bakery.x, z: bakery.z + bakery.hd + 0.1 },
      0.34,
      [bakery],
      WORLD_BOUNDS
    );
    expect(result.collided).toBe(true);
    expect(result.z).toBeGreaterThan(bakery.z + bakery.hd + 0.34 - 1e-6);
  });

  it('escapes a box when the centre is inside it', () => {
    const box = { kind: 'box' as const, x: 0, z: 0, hw: 2, hd: 1 };
    const result = resolveCircle({ x: 0.1, z: 0 }, 0.3, [box], WORLD_BOUNDS);
    expect(Math.abs(result.z)).toBeGreaterThanOrEqual(1.3 - 1e-6);
  });

  it('slides along a wall instead of stopping', () => {
    const wall = { kind: 'box' as const, x: 0, z: 0, hw: 3, hd: 0.3 };
    const from = { x: 0, z: 0.65 };
    const moved = moveAndCollide(from, { x: 1.2, z: -0.5 }, 0.3, [wall], WORLD_BOUNDS);
    expect(moved.x).toBeGreaterThan(1);
    expect(moved.z).toBeGreaterThanOrEqual(0.6 - 1e-6);
  });

  it('never leaves the world bounds', () => {
    const result = resolveCircle({ x: 999, z: -999 }, 0.34, [], WORLD_BOUNDS);
    expect(result.x).toBeLessThanOrEqual(WORLD_BOUNDS.maxX - 0.34);
    expect(result.z).toBeGreaterThanOrEqual(WORLD_BOUNDS.minZ + 0.34);
  });
});

describe('free points and camera clearance', () => {
  it('marks a point inside a building as occupied', () => {
    expect(isFreePoint(-22, 1, 0.34, colliders, WORLD_BOUNDS)).toBe(false);
  });

  it('keeps every collectible out of the geometry', () => {
    for (const tile of TILES) {
      expect(isFreePoint(tile.x, tile.z, 0.2, colliders, WORLD_BOUNDS), tile.id).toBe(true);
    }
  });

  it('shortens the camera boom before it enters a building', () => {
    const distance = clearDistance({ x: -22, z: 10 }, { x: 0, z: -1 }, 12, colliders);
    expect(distance).toBeLessThan(6);
    expect(distance).toBeGreaterThan(0.9);
  });

  it('does not shorten the camera in open ground', () => {
    const distance = clearDistance({ x: 0, z: 8 }, { x: 0, z: 1 }, 6, colliders);
    expect(distance).toBe(6);
  });
});
