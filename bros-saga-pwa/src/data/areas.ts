import type { AreaDef } from '../game/types';

export const AREAS: AreaDef[] = [
  {
    id: 'plains', name: 'SUNFIELD PLAINS', subtitle: 'Where the road begins', seed: 11, size: [46, 24],
    enemies: ['grubbo', 'flitta', 'snapper'], ground: '#5e9a52', wall: '#3b6b3a', accent: '#f4e08a', sky: '#8fd0f0'
  },
  {
    id: 'forest', name: 'MOSSWOOD FOREST', subtitle: 'The trees are listening', seed: 29, size: [52, 26],
    enemies: ['snapper', 'shroom', 'gusto'], ground: '#3f6b48', wall: '#24402f', accent: '#9fd88a', sky: '#5a8a76'
  },
  {
    id: 'town', name: 'COBBLE TOWN', subtitle: 'Everyone knows your name', seed: 47, size: [48, 24],
    enemies: ['mimicap', 'pebble', 'shroom'], ground: '#a89584', wall: '#6b5f58', accent: '#ffd9a8', sky: '#d8b890'
  },
  {
    id: 'cavern', name: 'EMBER CAVERN', subtitle: 'Warm. Too warm.', seed: 73, size: [54, 26],
    enemies: ['emberling', 'pebble', 'gusto'], boss: 'copper', ground: '#5a4038', wall: '#33241f', accent: '#ff9a5a', sky: '#20202c'
  },
  {
    id: 'harbour', name: 'CLOUD HARBOUR', subtitle: 'Ships that never sail', seed: 101, size: [56, 28],
    enemies: ['gusto', 'flitta', 'mimicap'], boss: 'vapor', ground: '#5a7890', wall: '#344a60', accent: '#c8e8ff', sky: '#7ab0d8'
  },
  {
    id: 'keep', name: 'STARLIGHT KEEP', subtitle: 'The last door', seed: 157, size: [50, 26],
    enemies: ['mimicap', 'gusto', 'emberling'], boss: 'starling', ground: '#6a6278', wall: '#3a3450', accent: '#ffe9a0', sky: '#3a3a6a'
  },
  {
    id: 'dune', name: 'DUNE BASIN', subtitle: 'The sand remembers everything', seed: 211, size: [56, 26],
    enemies: ['sandworm', 'grubbo', 'mimicap'], boss: 'duneking', ground: '#c2a066', wall: '#8a6c3c', accent: '#f6e0a8', sky: '#e8c98a'
  },
  {
    id: 'frost', name: 'FROST PEAK', subtitle: 'The cold never leaves', seed: 307, size: [58, 28],
    enemies: ['iceling', 'skyfin', 'gusto'], boss: 'frostwarden', ground: '#b8d4e4', wall: '#6a92ad', accent: '#ffffff', sky: '#a8c8e0'
  },
  {
    id: 'citadel', name: 'SKY CITADEL', subtitle: 'Above the storm', seed: 419, size: [60, 28],
    enemies: ['skyfin', 'iceling', 'mimicap'], boss: 'skytyrant', ground: '#8f80b8', wall: '#544480', accent: '#f0e8ff', sky: '#6a5aa8'
  }
];

export const AREA_BY_ID = Object.fromEntries(AREAS.map((a) => [a.id, a])) as Record<string, AreaDef>;

export interface AreaData {
  tiles: string[][];
  width: number;
  height: number;
  enemySpawns: { x: number; y: number; kind: string }[];
  chests: { x: number; y: number; opened: boolean }[];
  exits: { x: number; y: number; to: string; dir: 'left' | 'right' }[];
  spawn: { x: number; y: number };
}

function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/** Deterministic low-poly tilemap: walls at the edges, obstacles, doors and chests. */
export function generateArea(def: AreaDef): AreaData {
  const [w, h] = def.size;
  const rand = rng(def.seed);
  const tiles: string[][] = [];
  for (let y = 0; y < h; y++) {
    const row: string[] = [];
    for (let x = 0; x < w; x++) {
      const border = x === 0 || y === 0 || x === w - 1 || y === h - 1;
      row.push(border ? '#' : rand() < 0.07 ? '#' : '.');
    }
    tiles.push(row);
  }

  // clear a central corridor and the door lanes
  const mid = Math.floor(h / 2);
  for (let x = 2; x < w - 2; x++) {
    tiles[mid][x] = '.';
    tiles[mid - 1][x] = '.';
  }
  const spawn = { x: 3, y: mid };
  const exits: AreaData['exits'] = [];
  if (def.id !== AREAS[0].id) exits.push({ x: 1, y: mid, to: AREAS[AREAS.findIndex((a) => a.id === def.id) - 1].id, dir: 'left' });
  if (def.id !== AREAS[AREAS.length - 1].id) exits.push({ x: w - 2, y: mid, to: AREAS[AREAS.findIndex((a) => a.id === def.id) + 1].id, dir: 'right' });
  for (const e of exits) tiles[e.y][e.x] = 'D';

  const chests: AreaData['chests'] = [];
  for (let i = 0; i < 3; i++) {
    const x = 6 + Math.floor(rand() * (w - 12));
    const y = 2 + Math.floor(rand() * (h - 5));
    tiles[y][x] = 'C';
    chests.push({ x, y, opened: false });
  }

  const enemySpawns: AreaData['enemySpawns'] = [];
  for (let i = 0; i < 4 + Math.floor(rand() * 3); i++) {
    const x = 5 + Math.floor(rand() * (w - 10));
    const y = 2 + Math.floor(rand() * (h - 5));
    if (tiles[y][x] !== '.' || Math.abs(x - spawn.x) + Math.abs(y - spawn.y) < 5) continue;
    enemySpawns.push({ x, y, kind: def.enemies[i % def.enemies.length] });
  }
  return { tiles, width: w, height: h, enemySpawns, chests, exits, spawn };
}
