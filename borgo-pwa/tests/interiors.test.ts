import { describe, expect, it } from 'vitest';
import { buildCityColliders, CollisionWorld } from '../src/data/colliders';
import { INTERIORS } from '../src/data/interiors';
import { STAMPS } from '../src/data/stamps';
import { DISCOVERIES, WORLD } from '../src/data/town';

const world = new CollisionWorld(buildCityColliders());

describe('enterable interiors', () => {
  it('has nine unique remote rooms', () => {
    expect(INTERIORS).toHaveLength(9);
    expect(new Set(INTERIORS.map((interior) => interior.id)).size).toBe(INTERIORS.length);
    expect(new Set(INTERIORS.map((interior) => interior.room.x)).size).toBe(INTERIORS.length);
    for (const interior of INTERIORS) {
      expect(interior.room.x).toBeGreaterThan(WORLD.maxX + 1000);
    }
  });

  it('puts every portal on free city ground', () => {
    for (const interior of INTERIORS) {
      const { x, z } = interior.exterior;
      expect(x).toBeGreaterThanOrEqual(WORLD.minX);
      expect(x).toBeLessThanOrEqual(WORLD.maxX);
      expect(z).toBeGreaterThanOrEqual(WORLD.minZ);
      expect(z).toBeLessThanOrEqual(WORLD.maxZ);
      expect(world.isFree(x, z, 0.34), interior.id).toBe(true);
    }
    for (const [index, interior] of INTERIORS.entries()) {
      for (const other of INTERIORS.slice(index + 1)) {
        expect(Math.hypot(interior.exterior.x - other.exterior.x, interior.exterior.z - other.exterior.z)).toBeGreaterThan(2.8);
      }
    }
  });

  it('keeps spawns, exits and discoveries inside their rooms', () => {
    for (const interior of INTERIORS) {
      const { x, z, w, d } = interior.room;
      const margin = 0.55;
      const inside = (point: { x: number; z: number }): boolean =>
        point.x >= x - w / 2 + margin &&
        point.x <= x + w / 2 - margin &&
        point.z >= z - d / 2 + margin &&
        point.z <= z + d / 2 - margin;
      expect(inside(interior.spawn), `${interior.id} spawn`).toBe(true);
      expect(inside(interior.exit), `${interior.id} exit`).toBe(true);
      const discovery = DISCOVERIES.find((place) => place.id === interior.discoveryId);
      expect(discovery, `${interior.id} discovery`).toBeDefined();
      expect(inside(discovery!), `${interior.id} discovery point`).toBe(true);
      expect(discovery!.interior).toBe(interior.id);
      const exitDistance = Math.hypot(
        interior.exit.x - interior.spawn.x,
        interior.exit.z - interior.spawn.z
      );
      expect(exitDistance, `${interior.id} does not open at the door`).toBeGreaterThan(interior.exit.radius);
    }
  });

  it('links every interior to one stamp', () => {
    for (const interior of INTERIORS) {
      expect(STAMPS.some((stamp) => stamp.placeIds.includes(interior.discoveryId)), interior.id).toBe(true);
    }
  });
});
