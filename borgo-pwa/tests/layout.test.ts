import { describe, expect, it } from 'vitest';
import { buildCityColliders, CollisionWorld } from '../src/data/colliders';
import { FIDENZA, FIDENZA_WORLD } from '../src/data/fidenza';
import {
  BELL_SPOT,
  DELIVERIES,
  DISCOVERIES,
  FLOWERS,
  LETTERS,
  NPCS,
  SPAWN,
  TILES,
  VEHICLES,
  WORLD
} from '../src/data/town';

const world = new CollisionWorld(buildCityColliders());
const RADIUS = 0.34;
const STEP = 1;

interface Reachable {
  cells: Uint8Array;
  cols: number;
  rows: number;
}

function explore(): Reachable {
  const cols = Math.floor((WORLD.maxX - WORLD.minX) / STEP) + 1;
  const rows = Math.floor((WORLD.maxZ - WORLD.minZ) / STEP) + 1;
  const cells = new Uint8Array(cols * rows);
  const queue = new Int32Array(cols * rows);
  let head = 0;
  let tail = 0;
  const startX = Math.round((SPAWN.x - WORLD.minX) / STEP);
  const startZ = Math.round((SPAWN.z - WORLD.minZ) / STEP);
  const start = startZ * cols + startX;
  cells[start] = 1;
  queue[tail++] = start;

  while (head < tail) {
    const current = queue[head++];
    const cx = current % cols;
    const cz = Math.floor(current / cols);
    for (const [dx, dz] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1]
    ]) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= cols || nz >= rows) continue;
      const next = nz * cols + nx;
      if (cells[next]) continue;
      const x = WORLD.minX + nx * STEP;
      const z = WORLD.minZ + nz * STEP;
      if (!world.isFree(x, z, RADIUS)) continue;
      cells[next] = 1;
      queue[tail++] = next;
    }
  }
  return { cells, cols, rows };
}

function distanceToWalkable(reach: Reachable, point: { x: number; z: number }): number {
  const cx = Math.round((point.x - WORLD.minX) / STEP);
  const cz = Math.round((point.z - WORLD.minZ) / STEP);
  let best = Infinity;
  for (let dz = -30; dz <= 30; dz++) {
    for (let dx = -30; dx <= 30; dx++) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= reach.cols || nz >= reach.rows) continue;
      if (!reach.cells[nz * reach.cols + nx]) continue;
      const x = WORLD.minX + nx * STEP;
      const z = WORLD.minZ + nz * STEP;
      best = Math.min(best, Math.hypot(x - point.x, z - point.z));
    }
  }
  return best;
}

describe('Fidenza data', () => {
  it('contains the real centre, not a tiny mock-up', () => {
    expect(FIDENZA.buildings.length).toBeGreaterThan(700);
    expect(FIDENZA.roads.length).toBeGreaterThan(200);
    expect(FIDENZA.bounds.maxX - FIDENZA.bounds.minX).toBeGreaterThan(500);
    expect(FIDENZA.bounds.maxZ - FIDENZA.bounds.minZ).toBeGreaterThan(400);
  });

  it('carries the OpenStreetMap attribution required by ODbL', () => {
    expect(FIDENZA.meta.attribution).toContain('OpenStreetMap');
    expect(FIDENZA.meta.license).toBe('ODbL-1.0');
    expect(FIDENZA.meta.source).toContain('Overpass');
  });

  it('keeps every id unique', () => {
    expect(new Set(FIDENZA.buildings.map((b) => b.id)).size).toBe(FIDENZA.buildings.length);
    expect(new Set(FIDENZA.roads.map((r) => r.id)).size).toBe(FIDENZA.roads.length);
    expect(new Set(TILES.map((t) => t.id)).size).toBe(TILES.length);
  });

  it('has twelve memories and seven characters', () => {
    expect(TILES).toHaveLength(12);
    expect(LETTERS).toHaveLength(3);
    expect(FLOWERS).toHaveLength(5);
    expect(NPCS).toHaveLength(7);
    expect(DISCOVERIES).toHaveLength(8);
    expect(DELIVERIES).toHaveLength(4);
  });

  it('keeps every building inside the view or the playable buffer', () => {
    for (const building of FIDENZA.buildings) {
      expect(building.poly.length).toBeGreaterThanOrEqual(6);
      expect(building.area).toBeGreaterThan(7);
    }
  });

  it('places the spawn and every NPC on free ground', () => {
    expect(world.isFree(SPAWN.x, SPAWN.z, RADIUS)).toBe(true);
    for (const npc of NPCS) {
      expect(world.isFree(npc.x, npc.z, RADIUS), npc.id).toBe(true);
    }
  });

  it('parks every vehicle on free ground', () => {
    for (const vehicle of VEHICLES) {
      expect(world.isFree(vehicle.x, vehicle.z, 1.2), vehicle.id).toBe(true);
    }
  });

  it('places every collectible and delivery outside geometry', () => {
    for (const spot of [...TILES, ...LETTERS, ...FLOWERS]) {
      expect(world.isFree(spot.x, spot.z, 0.15), spot.id).toBe(true);
    }
    for (const delivery of DELIVERIES) {
      expect(world.isFree(delivery.x, delivery.z, RADIUS), delivery.id).toBe(true);
    }
    expect(world.isFree(BELL_SPOT.x, BELL_SPOT.z, RADIUS)).toBe(true);
  });

  it('uses the Fidenza playable bounds', () => {
    expect(WORLD).toEqual(FIDENZA_WORLD);
    expect(WORLD.maxX - WORLD.minX).toBe(680);
    expect(WORLD.maxZ - WORLD.minZ).toBe(500);
  });
});

describe('walkable route', () => {
  const reach = explore();

  it('can walk from Piazza Duomo to every character', () => {
    for (const npc of NPCS) {
      expect(distanceToWalkable(reach, npc), npc.id).toBeLessThan(2);
    }
  }, 30000);

  it('can reach every memory, letter and flower', () => {
    for (const spot of [...TILES, ...LETTERS, ...FLOWERS]) {
      expect(distanceToWalkable(reach, spot), spot.id).toBeLessThan(3);
    }
  }, 30000);

  it('can reach every delivery point and the bell', () => {
    for (const delivery of DELIVERIES) {
      expect(distanceToWalkable(reach, delivery), delivery.id).toBeLessThan(3);
    }
    expect(distanceToWalkable(reach, BELL_SPOT)).toBeLessThan(3);
  }, 30000);

  it('can approach every discoverable place', () => {
    for (const place of DISCOVERIES) {
      expect(distanceToWalkable(reach, place), place.id).toBeLessThan(Math.max(8, place.radius));
    }
  }, 30000);
});
