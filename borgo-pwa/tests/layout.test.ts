import { describe, expect, it } from 'vitest';
import { buildColliders, isFreePoint } from '../src/data/colliders';
import {
  BELL_SPOT,
  BUILDINGS,
  FESTIVAL_TABLE,
  FLOWERS,
  LETTERS,
  NPCS,
  PROPS,
  SPAWN,
  TILES,
  WORLD,
  ZONES
} from '../src/data/town';
import type { Spot } from '../src/data/types';

const colliders = buildColliders();
const RADIUS = 0.34;
const STEP = 0.5;

interface Reachable {
  cells: Uint8Array;
  cols: number;
  rows: number;
  startX: number;
  startZ: number;
}

function explore(): Reachable {
  const cols = Math.floor((WORLD.maxX - WORLD.minX) / STEP) + 1;
  const rows = Math.floor((WORLD.maxZ - WORLD.minZ) / STEP) + 1;
  const cells = new Uint8Array(cols * rows);
  const queue = new Int32Array(cols * rows);
  let head = 0;
  let tail = 0;

  const index = (cx: number, cz: number): number => cz * cols + cx;
  const startX = Math.round((SPAWN.x - WORLD.minX) / STEP);
  const startZ = Math.round((SPAWN.z - WORLD.minZ) / STEP);

  const start = index(startX, startZ);
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
      const next = index(nx, nz);
      if (cells[next]) continue;
      const x = WORLD.minX + nx * STEP;
      const z = WORLD.minZ + nz * STEP;
      if (!isFreePoint(x, z, RADIUS, colliders, WORLD)) continue;
      cells[next] = 1;
      queue[tail++] = next;
    }
  }

  return { cells, cols, rows, startX, startZ };
}

function distanceToNearestWalkable(reach: Reachable, point: Spot): number {
  const cx = Math.round((point.x - WORLD.minX) / STEP);
  const cz = Math.round((point.z - WORLD.minZ) / STEP);
  const span = 4;
  let best = Infinity;
  for (let dz = -span; dz <= span; dz++) {
    for (let dx = -span; dx <= span; dx++) {
      const nx = cx + dx;
      const nz = cz + dz;
      if (nx < 0 || nz < 0 || nx >= reach.cols || nz >= reach.rows) continue;
      if (reach.cells[nz * reach.cols + nx] !== 1) continue;
      const x = WORLD.minX + nx * STEP;
      const z = WORLD.minZ + nz * STEP;
      const distance = Math.hypot(x - point.x, z - point.z);
      if (distance < best) best = distance;
    }
  }
  return best;
}

describe('town data', () => {
  it('uses unique ids across every table', () => {
    const ids = [
      ...BUILDINGS.map((b) => b.id),
      ...PROPS.map((p) => p.id),
      ...TILES.map((t) => t.id),
      ...LETTERS.map((l) => l.id),
      ...FLOWERS.map((f) => f.id),
      ...NPCS.map((n) => n.id)
    ];
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('has the expected number of collectibles', () => {
    expect(TILES).toHaveLength(6);
    expect(LETTERS).toHaveLength(3);
    expect(FLOWERS).toHaveLength(5);
    expect(NPCS).toHaveLength(4);
  });

  it('keeps buildings inside the world bounds', () => {
    for (const building of BUILDINGS) {
      expect(building.x - building.w / 2, building.id).toBeGreaterThan(WORLD.minX);
      expect(building.x + building.w / 2, building.id).toBeLessThan(WORLD.maxX);
      expect(building.z - building.d / 2, building.id).toBeGreaterThan(WORLD.minZ);
      expect(building.z + building.d / 2, building.id).toBeLessThan(WORLD.maxZ);
    }
  });

  it('places the spawn and every NPC on free ground', () => {
    expect(isFreePoint(SPAWN.x, SPAWN.z, RADIUS, colliders, WORLD)).toBe(true);
    for (const npc of NPCS) {
      expect(isFreePoint(npc.x, npc.z, RADIUS, colliders, WORLD), npc.id).toBe(true);
    }
  });

  it('keeps the bell and the festival table approachable', () => {
    expect(isFreePoint(BELL_SPOT.x, BELL_SPOT.z, RADIUS, colliders, WORLD)).toBe(true);
    const nearTable = isFreePoint(
      FESTIVAL_TABLE.x,
      FESTIVAL_TABLE.z + 1.2,
      RADIUS,
      colliders,
      WORLD
    );
    expect(nearTable).toBe(true);
  });

  it('puts every collectible outside geometry', () => {
    for (const spot of [...TILES, ...LETTERS, ...FLOWERS]) {
      expect(isFreePoint(spot.x, spot.z, 0.18, colliders, WORLD), spot.id).toBe(true);
    }
  });

  it('has a zone for every named place', () => {
    expect(ZONES.map((z) => z.id).sort()).toEqual(
      ['belvedere', 'chiesa', 'fornai', 'giardino', 'oliveto', 'piazza', 'vicolo'].sort()
    );
    for (const zone of ZONES) {
      expect(isFreePoint(zone.x, zone.z, RADIUS, colliders, WORLD), zone.id).toBe(true);
    }
  });
});

describe('walkable route', () => {
  const reach = explore();

  it('can walk from the spawn to every NPC', () => {
    for (const npc of NPCS) {
      const distance = distanceToNearestWalkable(reach, npc);
      expect(distance, npc.id).toBeLessThan(1.2);
    }
  });

  it('can reach every collectible', () => {
    for (const spot of [...TILES, ...LETTERS, ...FLOWERS]) {
      const distance = distanceToNearestWalkable(reach, spot);
      expect(distance, spot.id).toBeLessThan(1.6);
    }
  });

  it('can reach the festival table and the bell rope', () => {
    expect(distanceToNearestWalkable(reach, { id: 'table', ...FESTIVAL_TABLE })).toBeLessThan(2);
    expect(distanceToNearestWalkable(reach, { id: 'bell', ...BELL_SPOT })).toBeLessThan(1.6);
  });

  it('can enter every zone', () => {
    for (const zone of ZONES) {
      const distance = distanceToNearestWalkable(reach, zone);
      expect(distance, zone.id).toBeLessThan(2);
    }
  });
});
