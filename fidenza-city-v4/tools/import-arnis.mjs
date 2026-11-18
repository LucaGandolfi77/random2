#!/usr/bin/env node
/**
 * Fidenza da Giocare — import ArnisWorld3
 *
 * Legge il save Minecraft generato da Arnis in assets/ArnisWorld3 e produce
 * asset compatti per il gioco:
 *
 *   data/arnis/surface.png   mappa del blocco di superficie (1 px = 1 blocco)
 *   data/arnis/arnis.json    materiali reali per edifici, aree, strade, alberi
 *   data/arnis/audit.json    report di copertura e qualità
 *
 * Uso:
 *   node tools/import-arnis.mjs
 *   node tools/import-arnis.mjs --world assets/ArnisWorld3 --out data/arnis
 */

import fs from 'node:fs';
import path from 'node:path';
import { AnvilWorld, makeProjection, readMetadata } from './arnis-nbt.mjs';
import { encodeIndexedPng } from './arnis-png.mjs';
import {
  blockColor, blockKey, baseBlock, bump, dominant, isCropBlock, isDoorBlock,
  isGlassBlock, isLeafBlock, isLogBlock, isRoofBlock, isVegetationBlock,
  isTerrainBlock, speciesFromLeaves
} from '../js/block-palette.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const arg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};

const WORLD_ROOT = path.resolve(ROOT, arg('--world', 'assets/ArnisWorld3'));
const OUT_DIR = path.resolve(ROOT, arg('--out', 'data/arnis'));
const CITY_FILE = path.join(ROOT, 'data', 'city.json');
const MAP_FILE = path.join(ROOT, 'data', 'map.json');
const { WORLD } = await import('../js/config.js');

fs.mkdirSync(OUT_DIR, { recursive: true });

const city = JSON.parse(fs.readFileSync(CITY_FILE, 'utf8'));
const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
const metadata = readMetadata(WORLD_ROOT);
const projection = makeProjection(metadata, WORLD.origin);
const world = new AnvilWorld(WORLD_ROOT, { maxRegions: 5, maxChunks: 320 });

const GROUND_BLOCKS = new Set([
  'grass_block', 'dirt', 'coarse_dirt', 'podzol', 'farmland', 'dirt_path',
  'stone', 'cobblestone', 'gravel', 'sand', 'clay', 'moss_block', 'snow_block',
  'gray_concrete_powder', 'gray_concrete', 'white_concrete', 'light_gray_concrete',
  'cyan_terracotta', 'red_terracotta', 'red_concrete', 'smooth_stone',
  'water', 'short_grass', 'tall_grass', 'fern', 'dandelion', 'poppy',
  'cornflower', 'oxeye_daisy', 'sunflower'
]);

const rails = new Set(['rail', 'powered_rail', 'detector_rail', 'activator_rail']);

const WALL_FALLBACK = {
  historic: 'terracotta',
  civic: 'stone_bricks',
  urban: 'white_concrete',
  rural: 'terracotta',
  industrial: 'gray_concrete'
};

const AREA_FALLBACK = {
  park: 'grass_block',
  grass: 'grass_block',
  forest: 'grass_block',
  farmland: 'farmland',
  water: 'water',
  square: 'stone_bricks',
  sport: 'green_terracotta',
  parking: 'gray_concrete_powder',
  industrial: 'stone',
  cemetery: 'podzol',
  school: 'gray_concrete',
  hospital: 'gray_concrete',
  platform: 'smooth_stone'
};

const ROAD_FALLBACK = {
  primary: 'gray_concrete_powder',
  secondary: 'gray_concrete_powder',
  tertiary: 'gray_concrete_powder',
  residential: 'gray_concrete_powder',
  unclassified: 'gray_concrete_powder',
  service: 'gray_concrete',
  living_street: 'gray_concrete',
  pedestrian: 'granite',
  footway: 'gray_concrete',
  path: 'dirt_path',
  track: 'dirt_path',
  cycleway: 'red_terracotta',
  steps: 'smooth_stone'
};

const LANDMARK_FALLBACK = {
  duomo: { wall: 'terracotta', accent: 'end_stone_bricks', roof: 'granite_stairs', glass: 'light_blue_stained_glass' },
  stazione: { wall: 'stone_bricks', accent: 'white_terracotta', roof: 'bricks', glass: 'glass' },
  teatro: { wall: 'bricks', accent: 'white_terracotta', roof: 'brick_stairs', glass: 'glass' },
  comunale: { wall: 'terracotta', accent: 'white_terracotta', roof: 'granite_stairs', glass: 'glass' },
  santuario: { wall: 'white_concrete', accent: 'terracotta', roof: 'brick_stairs', glass: 'light_blue_stained_glass' },
  sanpietro: { wall: 'stone_bricks', accent: 'terracotta', roof: 'brick_stairs', glass: 'glass' },
  museo: { wall: 'terracotta', accent: 'stone_bricks', roof: 'granite_stairs', glass: 'glass' },
  porta: { wall: 'stone_bricks', accent: 'terracotta', roof: 'brick_stairs', glass: null },
  ponte: { wall: 'stone_bricks', accent: 'cobblestone', roof: 'stone_bricks', glass: null },
  'piazza-duomo': { wall: 'stone_bricks', accent: 'granite', roof: 'granite', glass: null },
  'piazza-garibaldi': { wall: 'stone_bricks', accent: 'granite', roof: 'granite', glass: null },
  obelisco: { wall: 'stone_bricks', accent: 'granite', roof: 'stone_bricks', glass: null }
};

function hashString(value) {
  let hash = 0;
  for (const char of String(value)) hash = (hash * 31 + char.charCodeAt(0)) | 0;
  return Math.abs(hash);
}

function round(value, digits = 2) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function median(values) {
  if (!values.length) return null;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function mode(entries) {
  if (!entries.size) return null;
  let best = null;
  let bestCount = -1;
  for (const [key, count] of entries) {
    if (count > bestCount) { best = key; bestCount = count; }
  }
  return best;
}

function pointInPolygon(x, z, polygon) {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [xi, zi] = polygon[i];
    const [xj, zj] = polygon[j];
    if (((zi > z) !== (zj > z)) && (x < ((xj - xi) * (z - zi)) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

function distanceToPolygonEdges(x, z, polygon) {
  let best = Infinity;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const [ax, az] = polygon[j];
    const [bx, bz] = polygon[i];
    const dx = bx - ax;
    const dz = bz - az;
    const len2 = dx * dx + dz * dz;
    if (len2 < 1e-9) continue;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / len2));
    const px = ax + dx * t;
    const pz = az + dz * t;
    best = Math.min(best, Math.hypot(x - px, z - pz));
  }
  return best;
}

function mcPolygon(poly) {
  return poly.map(([x, z]) => {
    const mc = projection.gameToMc(x, z);
    return [mc.x, mc.z];
  });
}

function polygonBounds(poly) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

function polygonCentroid(poly) {
  let x = 0, z = 0;
  for (const [px, pz] of poly) { x += px; z += pz; }
  return { x: x / poly.length, z: z / poly.length };
}

function solidBlock(name) {
  const key = blockKey(name);
  return key !== 'air' && key !== 'cave_air' && key !== 'void_air' && key !== 'water' && key !== 'lava';
}

function wallCandidate(name) {
  const key = blockKey(name);
  if (!solidBlock(key)) return false;
  if (isVegetationBlock(key) || isRoofBlock(key) || isGlassBlock(key) || isDoorBlock(key)) return false;
  if (rails.has(key)) return false;
  return true;
}

function groundCandidate(name) {
  const key = blockKey(name);
  if (!GROUND_BLOCKS.has(key)) return false;
  return true;
}

function topSurfaceAt(mx, mz, { keepCrops = true } = {}) {
  let surface = world.surfaceAt(mx, mz);
  let block = blockKey(surface.block);
  let guard = 0;
  while (guard++ < 12 && (
    isLeafBlock(block) || isLogBlock(block) ||
    (!keepCrops && isCropBlock(block)) ||
    block === 'short_grass' || block === 'tall_grass' || block === 'fern' ||
    block === 'sunflower' || block === 'dandelion' || block === 'poppy' ||
    block === 'cornflower' || block === 'oxeye_daisy'
  )) {
    surface = { block: world.blockAt(mx, surface.y - 1, mz), y: surface.y - 1 };
    block = blockKey(surface.block);
  }
  return { block, y: surface.y };
}

function groundAt(mx, mz, { keepCrops = false } = {}) {
  let surface = world.surfaceAt(mx, mz);
  let block = blockKey(surface.block);
  let guard = 0;
  while (guard++ < 24) {
    if (keepCrops && isCropBlock(block)) return { block, y: surface.y };
    if (block === 'water') return { block, y: surface.y };
    if (!(isVegetationBlock(block) || isCropBlock(block)) && GROUND_BLOCKS.has(block)) {
      return { block, y: surface.y };
    }
    surface = { block: world.blockAt(mx, surface.y - 1, mz), y: surface.y - 1 };
    block = blockKey(surface.block);
    if (block === 'air' && guard > 6) break;
  }
  return { block, y: surface.y };
}

function groundLevelFor(polyMc, bounds) {
  const heights = [];
  const minX = Math.floor(bounds.minX) - 3;
  const maxX = Math.ceil(bounds.maxX) + 3;
  const minZ = Math.floor(bounds.minZ) - 3;
  const maxZ = Math.ceil(bounds.maxZ) + 3;
  const total = Math.max(1, (maxX - minX + 1) * (maxZ - minZ + 1));
  const stride = Math.max(1, Math.ceil(Math.sqrt(total / 600)));
  for (let mx = minX; mx <= maxX; mx += stride) {
    for (let mz = minZ; mz <= maxZ; mz += stride) {
      if (pointInPolygon(mx + 0.5, mz + 0.5, polyMc)) continue;
      const ground = groundAt(mx, mz, { keepCrops: false });
      if (groundCandidate(ground.block)) heights.push(ground.y);
    }
  }
  return median(heights);
}

function columnListForPolygon(polyMc, bounds, maxColumns = 420) {
  const columns = [];
  const minX = Math.floor(bounds.minX);
  const maxX = Math.ceil(bounds.maxX);
  const minZ = Math.floor(bounds.minZ);
  const maxZ = Math.ceil(bounds.maxZ);
  const total = Math.max(1, (maxX - minX + 1) * (maxZ - minZ + 1));
  const stride = Math.max(1, Math.ceil(Math.sqrt(total / maxColumns)));
  for (let mx = minX; mx <= maxX; mx += stride) {
    for (let mz = minZ; mz <= maxZ; mz += stride) {
      const cx = mx + 0.5;
      const cz = mz + 0.5;
      if (!pointInPolygon(cx, cz, polyMc)) continue;
      columns.push({ mx, mz, cx, cz });
    }
  }
  return columns;
}

function countMapToObject(entries) {
  return Object.fromEntries([...entries.entries()].sort((a, b) => b[1] - a[1]));
}

function majorityBlock(entries, fallback) {
  const best = mode(entries);
  return best || fallback;
}

function normalizeRoof(name) {
  const key = blockKey(name);
  if (!key || key === 'air' || isTerrainBlock(key) || isVegetationBlock(key)) return null;
  if (isGlassBlock(key) || isDoorBlock(key)) return null;
  return key;
}

function roofTypeOf(name) {
  const key = blockKey(name);
  if (key.endsWith('_stairs')) return 'stairs';
  if (key.endsWith('_slab')) return 'slab';
  return 'flat';
}

function wallFallbackFor(building) {
  return WALL_FALLBACK[building.facadeStyle] || 'white_concrete';
}

function roofFallbackFor(building) {
  const hash = hashString(building.id);
  if (['industrial', 'warehouse', 'factory', 'commercial', 'garage', 'train_station', 'school', 'hospital', 'sport'].includes(building.kind)) {
    return 'gray_concrete';
  }
  const choices = ['granite_stairs', 'brick_stairs', 'polished_granite_stairs'];
  return choices[hash % choices.length];
}

// ---------------------------------------------------------------------------
// 1. Mappa di superficie
// ---------------------------------------------------------------------------
console.log('→ Costruisco la mappa di superficie Arnis…');
const mcMin = projection.gameToMc(WORLD.bounds.minX, WORLD.bounds.minZ);
const mcMax = projection.gameToMc(WORLD.bounds.maxX, WORLD.bounds.maxZ);
const surfaceMinX = Math.floor(mcMin.x);
const surfaceMinZ = Math.floor(mcMin.z);
const surfaceMaxX = Math.floor(mcMax.x);
const surfaceMaxZ = Math.floor(mcMax.z);
const surfaceWidth = surfaceMaxX - surfaceMinX + 1;
const surfaceHeight = surfaceMaxZ - surfaceMinZ + 1;
console.log(`  bbox MC ${surfaceMinX}..${surfaceMaxX} × ${surfaceMinZ}..${surfaceMaxZ} (${surfaceWidth}×${surfaceHeight})`);

const paletteColors = ['#5d8f3f'];
const paletteIndex = new Map([['#5d8f3f', 0]]);
const surfaceIndices = new Uint8Array(surfaceWidth * surfaceHeight);
const surfaceCounts = new Map();
const heightValues = new Int16Array(surfaceWidth * surfaceHeight);
let minHeight = Infinity;
let maxHeight = -Infinity;

function colorIndex(color) {
  let index = paletteIndex.get(color);
  if (index == null) {
    index = paletteColors.length;
    if (index > 255) {
      // Palette piena: usa il colore più vicino già presente.
      let bestIndex = 0;
      let bestDistance = Infinity;
      const [r, g, b] = hexToRgb(color);
      for (let i = 0; i < paletteColors.length; i++) {
        const [pr, pg, pb] = hexToRgb(paletteColors[i]);
        const distance = (r - pr) ** 2 + (g - pg) ** 2 + (b - pb) ** 2;
        if (distance < bestDistance) { bestDistance = distance; bestIndex = i; }
      }
      paletteIndex.set(color, bestIndex);
      return bestIndex;
    }
    paletteIndex.set(color, index);
    paletteColors.push(color);
  }
  return index;
}

function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return [parseInt(value.slice(0, 2), 16), parseInt(value.slice(2, 4), 16), parseInt(value.slice(4, 6), 16)];
}

const chunkMinX = Math.floor(surfaceMinX / 16);
const chunkMaxX = Math.floor(surfaceMaxX / 16);
const chunkMinZ = Math.floor(surfaceMinZ / 16);
const chunkMaxZ = Math.floor(surfaceMaxZ / 16);

let surfaceChunks = 0;
for (let cz = chunkMinZ; cz <= chunkMaxZ; cz++) {
  for (let cx = chunkMinX; cx <= chunkMaxX; cx++) {
    const chunk = world.chunk(cx, cz);
    surfaceChunks++;
    if (!chunk) continue;
    const startX = Math.max(surfaceMinX, cx * 16);
    const endX = Math.min(surfaceMaxX, cx * 16 + 15);
    const startZ = Math.max(surfaceMinZ, cz * 16);
    const endZ = Math.min(surfaceMaxZ, cz * 16 + 15);
    for (let mz = startZ; mz <= endZ; mz++) {
      const localZ = mz - cz * 16;
      const row = (mz - surfaceMinZ) * surfaceWidth;
      for (let mx = startX; mx <= endX; mx++) {
        const localX = mx - cx * 16;
        const surface = chunk.surfaceAtLocal(localX, localZ);
        const rawKey = blockKey(surface.block);
        const key = rawKey === 'air' || rawKey === 'cave_air' || rawKey === 'void_air' ? 'grass_block' : rawKey;
        surfaceCounts.set(key, (surfaceCounts.get(key) || 0) + 1);
        const color = blockColor(key);
        const index = colorIndex(color);
        const pixel = row + (mx - surfaceMinX);
        surfaceIndices[pixel] = index;
        heightValues[pixel] = surface.y;
        if (surface.y < minHeight) minHeight = surface.y;
        if (surface.y > maxHeight) maxHeight = surface.y;
      }
    }
  }
  if (cz % 20 === 0) console.log(`  …chunk Z ${cz}/${chunkMaxZ}`);
}
world.clearChunkCache();
world.clearRegionCache();
console.log(`  ${surfaceChunks} chunk, palette ${paletteColors.length} colori, quote ${minHeight}..${maxHeight}`);

const surfacePng = encodeIndexedPng(
  surfaceWidth,
  surfaceHeight,
  surfaceIndices,
  paletteColors.map(hexToRgb)
);
fs.writeFileSync(path.join(OUT_DIR, 'surface.png'), surfacePng);
console.log(`✓ surface.png (${(surfacePng.length / 1e6).toFixed(2)} MB)`);

// Piramide di LOD per l'editor: un texel ogni 2, 4, 8, 16 blocchi.
const paletteRgb = paletteColors.map(hexToRgb);
const surfaceLods = [
  { id: 'z0', src: 'surface.png', width: surfaceWidth, height: surfaceHeight, blocksPerPixel: 1 }
];
let lodWidth = surfaceWidth;
let lodHeight = surfaceHeight;
let lodIndices = surfaceIndices;
for (let level = 1; level <= 4; level++) {
  const width = Math.max(1, Math.ceil(lodWidth / 2));
  const height = Math.max(1, Math.ceil(lodHeight / 2));
  const next = new Uint8Array(width * height);
  for (let y = 0; y < height; y++) {
    const sy = Math.min(lodHeight - 1, y * 2);
    for (let x = 0; x < width; x++) {
      const sx = Math.min(lodWidth - 1, x * 2);
      next[y * width + x] = lodIndices[sy * lodWidth + sx];
    }
  }
  const png = encodeIndexedPng(width, height, next, paletteRgb);
  const src = `surface-z${level}.png`;
  fs.writeFileSync(path.join(OUT_DIR, src), png);
  surfaceLods.push({ id: `z${level}`, src, width, height, blocksPerPixel: 2 ** level });
  lodWidth = width;
  lodHeight = height;
  lodIndices = next;
}
const surfaceManifest = {
  version: 1,
  bounds: WORLD.bounds,
  blockSizeMeters: metadata.scale ? 1 / metadata.scale : 2,
  levels: surfaceLods
};
fs.writeFileSync(path.join(OUT_DIR, 'surface.json'), JSON.stringify(surfaceManifest, null, 2));
console.log(`✓ surface LOD z0..z4 + surface.json`);

// ---------------------------------------------------------------------------
// 2. Edifici
// ---------------------------------------------------------------------------
console.log('→ Estraggo i materiali reali degli edifici…');
const buildingEntries = [];
const sortedBuildings = [...city.buildings].sort((a, b) => {
  const ma = projection.gameToMc(a.x, a.z);
  const mb = projection.gameToMc(b.x, b.z);
  return (ma.z - mb.z) || (ma.x - mb.x);
});

let buildingIndex = 0;
for (const building of sortedBuildings) {
  buildingIndex++;
  const polyMc = mcPolygon(building.poly);
  const bounds = polygonBounds(polyMc);
  if (!Number.isFinite(bounds.minX)) continue;
  const groundY = groundLevelFor(polyMc, bounds);
  const columns = columnListForPolygon(polyMc, bounds, 420);
  const wallAll = new Map();
  const wallLower = new Map();
  const wallUpper = new Map();
  const roofCounts = new Map();
  const glassCounts = new Map();
  const doorCounts = new Map();
  let roofSamples = 0;
  let wallSamples = 0;
  let topY = -9999;
  let lowY = 9999;
  let groundGuess = groundY;

  for (const column of columns) {
    const surface = world.surfaceAt(column.mx, column.mz);
    if (surface.y <= -999) continue;
    if (topY < surface.y) topY = surface.y;
    if (lowY > surface.y) lowY = surface.y;
    const topKey = blockKey(surface.block);
    if (isRoofBlock(topKey) || (!isTerrainBlock(topKey) && !isVegetationBlock(topKey) && solidBlock(topKey))) {
      bump(roofCounts, normalizeRoof(topKey) || topKey);
      roofSamples++;
    }
    const distance = distanceToPolygonEdges(column.cx, column.cz, polyMc);
    if (distance > 2.0) continue;
    const base = groundGuess == null ? lowY - 4 : groundGuess;
    const height = Math.max(2, topY - base);
    const samples = [
      base + Math.max(1, Math.round(height * 0.22)),
      base + Math.round(height * 0.45),
      base + Math.round(height * 0.68),
      Math.max(base + 1, topY - 1)
    ];
    for (const y of samples) {
      const block = blockKey(world.blockAt(column.mx, y, column.mz));
      if (block === 'air' || block === 'cave_air' || block === 'void_air') continue;
      if (isGlassBlock(block)) { bump(glassCounts, block); continue; }
      if (isDoorBlock(block)) { bump(doorCounts, block); continue; }
      if (!wallCandidate(block)) continue;
      bump(wallAll, block);
      wallSamples++;
      if (y <= base + Math.round(height * 0.5)) bump(wallLower, block);
      else bump(wallUpper, block);
    }
  }

  if (groundGuess == null) groundGuess = lowY < 400 ? lowY - 3 : -55;
  if (groundGuess == null || groundGuess < -900 || groundGuess > 400) groundGuess = -55;
  if (topY <= -900 || topY > 400) topY = groundGuess + 3;
  const heightBlocks = Math.max(2, Math.min(18, topY - groundGuess + 1));
  const parsedHeight = round(heightBlocks * 2, 1);

  const wall = majorityBlock(wallAll, wallFallbackFor(building));
  const lower = majorityBlock(wallLower, wall);
  const upper = majorityBlock(wallUpper, wall);
  const roof = majorityBlock(roofCounts, roofFallbackFor(building));
  const roofType = roofTypeOf(roof);
  const glass = mode(glassCounts) || null;
  const door = mode(doorCounts) || null;
  const confidence = columns.length ? Math.min(1, (wallSamples + roofSamples) / (columns.length * 1.5)) : 0;

  buildingEntries.push({
    id: String(building.id),
    wall,
    wallLower: lower,
    wallUpper: upper,
    roof,
    roofType,
    roofHeight: round(Math.max(0.8, Math.min(4.8, heightBlocks * 0.28)), 2),
    height: parsedHeight,
    glass,
    door,
    groundY: groundGuess,
    topY,
    confidence: round(confidence, 2),
    samples: columns.length
  });

  if (buildingIndex % 400 === 0) {
    console.log(`  …edifici ${buildingIndex}/${sortedBuildings.length}`);
  }
}
world.clearChunkCache();
world.clearRegionCache();
const buildingsById = Object.fromEntries(buildingEntries.map(entry => [entry.id, entry]));
console.log(`✓ ${buildingEntries.length} edifici analizzati`);

// ---------------------------------------------------------------------------
// 3. Aree
// ---------------------------------------------------------------------------
console.log('→ Estraggo i materiali di aree e campi…');
const areaEntries = {};
for (const area of city.areas) {
  const polyMc = mcPolygon(area.poly);
  const bounds = polygonBounds(polyMc);
  const width = Math.max(1, Math.ceil(bounds.maxX - bounds.minX));
  const depth = Math.max(1, Math.ceil(bounds.maxZ - bounds.minZ));
  const step = Math.max(1, Math.ceil(Math.sqrt((width * depth) / 90)));
  const surfaces = new Map();
  const crops = new Map();
  const species = new Map();
  const banks = new Map();
  let waterLevel = null;
  let samples = 0;
  for (let mx = Math.floor(bounds.minX); mx <= Math.ceil(bounds.maxX); mx += step) {
    for (let mz = Math.floor(bounds.minZ); mz <= Math.ceil(bounds.maxZ); mz += step) {
      if (!pointInPolygon(mx + 0.5, mz + 0.5, polyMc)) continue;
      const surface = world.surfaceAt(mx, mz);
      if (surface.y <= -999) continue;
      samples++;
      const topKey = blockKey(surface.block);
      const openArea = ['square', 'sport', 'parking', 'platform'].includes(area.kind);
      const useKey = openArea
        ? blockKey(topSurfaceAt(mx, mz, { keepCrops: false }).block)
        : blockKey(groundAt(mx, mz, { keepCrops: false }).block);
      if (area.kind === 'farmland' && isCropBlock(topKey)) bump(crops, topKey);
      if (isLeafBlock(topKey)) bump(species, speciesFromLeaves(topKey));
      if (useKey && useKey !== 'air') bump(surfaces, useKey);
      if (area.kind === 'water') {
        for (let y = surface.y; y >= surface.y - 8; y--) {
          const block = blockKey(world.blockAt(mx, y, mz));
          if (block === 'water') {
            if (waterLevel == null) waterLevel = y;
            if (blockKey(world.blockAt(mx, y - 1, mz)) !== 'water') {
              const bank = blockKey(world.blockAt(mx, y - 1, mz));
              if (bank) bump(banks, bank);
            }
            break;
          }
        }
      }
    }
  }
  const surface = majorityBlock(surfaces, AREA_FALLBACK[area.kind] || 'grass_block');
  areaEntries[String(area.id)] = {
    kind: area.kind,
    surface,
    crop: mode(crops) || null,
    species: mode(species) || null,
    bank: mode(banks) || null,
    waterLevel,
    samples
  };
}
console.log(`✓ ${Object.keys(areaEntries).length} aree`);

// ---------------------------------------------------------------------------
// 4. Strade
// ---------------------------------------------------------------------------
console.log('→ Estraggo i materiali delle strade…');
const roadEntries = {};
for (const road of city.roads) {
  if (!road.pts?.length) continue;
  const pointCount = Math.min(8, Math.max(2, road.pts.length));
  const surfaces = new Map();
  const sides = new Map();
  let samples = 0;
  for (let i = 0; i < pointCount; i++) {
    const t = pointCount === 1 ? 0 : i / (pointCount - 1);
    const pointIndex = t * (road.pts.length - 1);
    const index = Math.min(road.pts.length - 1, Math.floor(pointIndex));
    const nextIndex = Math.min(road.pts.length - 1, index + 1);
    const segmentT = pointIndex - index;
    const [ax, az] = road.pts[index];
    const [bx, bz] = road.pts[nextIndex];
    const px = ax + (bx - ax) * segmentT;
    const pz = az + (bz - az) * segmentT;
    const dx = bx - ax, dz = bz - az;
    const len = Math.hypot(dx, dz) || 1;
    const ux = dx / len, uz = dz / len;
    const nx = -uz, nz = ux;
    const halfWidth = Math.max(1, (Number(road.w) || 4) / 2);
    const offsets = [
      [0, surfaces],
      [-Math.max(0.5, halfWidth - 0.6), surfaces],
      [Math.max(0.5, halfWidth - 0.6), surfaces],
      [-halfWidth - 1.1, sides],
      [halfWidth + 1.1, sides]
    ];
    for (const [offset, target] of offsets) {
      const gx = px + nx * offset;
      const gz = pz + nz * offset;
      const mc = projection.gameToMc(gx, gz);
      const surface = groundAt(Math.floor(mc.x), Math.floor(mc.z), { keepCrops: true });
      if (surface.y <= -999) continue;
      const key = blockKey(surface.block);
      if (key === 'air' || isLeafBlock(key) || isLogBlock(key)) continue;
      bump(target, key);
      samples++;
    }
  }
  const surface = majorityBlock(surfaces, ROAD_FALLBACK[road.kind] || 'gray_concrete_powder');
  const side = majorityBlock(sides, 'cyan_terracotta');
  roadEntries[String(road.id)] = {
    kind: road.kind,
    surface: baseBlock(surface),
    side: baseBlock(side),
    samples
  };
}
console.log(`✓ ${Object.keys(roadEntries).length} strade`);

// ---------------------------------------------------------------------------
// 5. Alberi
// ---------------------------------------------------------------------------
console.log('→ Estraggo le specie degli alberi…');
const treeEntries = [];
for (let i = 0; i < (city.trees || []).length; i++) {
  const tree = city.trees[i];
  const mc = projection.gameToMc(tree.x, tree.z);
  const centerX = Math.floor(mc.x);
  const centerZ = Math.floor(mc.z);
  const species = new Map();
  let topY = -9999;
  for (let dx = -3; dx <= 3; dx++) {
    for (let dz = -3; dz <= 3; dz++) {
      const surface = world.surfaceAt(centerX + dx, centerZ + dz);
      const key = blockKey(surface.block);
      if (isLeafBlock(key)) {
        bump(species, speciesFromLeaves(key));
        if (surface.y > topY) topY = surface.y;
      } else {
        for (let y = surface.y; y >= surface.y - 8; y--) {
          const block = blockKey(world.blockAt(centerX + dx, y, centerZ + dz));
          if (isLeafBlock(block)) {
            bump(species, speciesFromLeaves(block));
            if (y > topY) topY = y;
            break;
          }
        }
      }
    }
  }
  const ground = groundAt(centerX, centerZ);
  treeEntries.push({
    species: mode(species) || 'oak',
    height: topY > -900 && ground.y > -900 ? round(Math.max(3, Math.min(20, (topY - ground.y + 1) * 2)), 1) : 8
  });
}

const treeRowEntries = [];
for (const row of city.treeRows || []) {
  if (!row.pts?.length) { treeRowEntries.push('oak'); continue; }
  const point = row.pts[Math.floor(row.pts.length / 2)];
  const mc = projection.gameToMc(point[0], point[1]);
  const centerX = Math.floor(mc.x);
  const centerZ = Math.floor(mc.z);
  const species = new Map();
  for (let dx = -4; dx <= 4; dx += 2) {
    for (let dz = -4; dz <= 4; dz += 2) {
      const surface = world.surfaceAt(centerX + dx, centerZ + dz);
      const key = blockKey(surface.block);
      if (isLeafBlock(key)) bump(species, speciesFromLeaves(key));
    }
  }
  treeRowEntries.push(mode(species) || 'oak');
}
console.log(`✓ ${treeEntries.length} alberi, ${treeRowEntries.length} filari`);

// ---------------------------------------------------------------------------
// 6. Acqua
// ---------------------------------------------------------------------------
console.log('→ Estraggo l’acqua…');
const waterLevels = new Map();
const waterBanks = new Map();
function sampleWaterLine(points) {
  if (!points?.length) return;
  const step = Math.max(1, Math.floor(points.length / 6));
  for (let i = 0; i < points.length; i += step) {
    const [gx, gz] = points[i];
    const mc = projection.gameToMc(gx, gz);
    const mx = Math.floor(mc.x);
    const mz = Math.floor(mc.z);
    const surface = world.surfaceAt(mx, mz);
    for (let y = Math.min(surface.y + 1, 0); y >= surface.y - 10; y--) {
      const block = blockKey(world.blockAt(mx, y, mz));
      if (block === 'water') {
        bump(waterLevels, y);
        const bank = blockKey(world.blockAt(mx, y - 1, mz));
        if (bank && bank !== 'water') bump(waterBanks, bank);
        break;
      }
    }
  }
}
for (const area of city.areas) {
  if (area.kind === 'water') sampleWaterLine(area.poly);
}
for (const waterway of city.waterways || []) sampleWaterLine(waterway.pts);
const waterLevel = Number(mode(waterLevels) ?? -54);
const waterBank = mode(waterBanks) || 'clay';
console.log(`✓ acqua a y=${waterLevel}, sponde ${waterBank}`);

// ---------------------------------------------------------------------------
// 7. Landmark
// ---------------------------------------------------------------------------
console.log('→ Assegno i materiali ai landmark…');
const landmarkEntries = {};
const buildingByCenter = buildingEntries.map(entry => {
  const building = city.buildings.find(b => String(b.id) === entry.id);
  return building ? { entry, building } : null;
}).filter(Boolean);

for (const landmark of map.landmarks || []) {
  const fallback = LANDMARK_FALLBACK[landmark.id] || { wall: 'stone_bricks', accent: 'terracotta', roof: 'granite_stairs', glass: null };
  let nearest = null;
  let nearestDistance = 26;
  for (const item of buildingByCenter) {
    const distance = Math.hypot(item.building.x - landmark.x, item.building.z - landmark.z);
    if (distance < nearestDistance) {
      nearestDistance = distance;
      nearest = item.entry;
    }
  }
  landmarkEntries[landmark.id] = {
    wall: nearest?.wall || fallback.wall,
    accent: nearest?.wallLower && nearest.wallLower !== nearest.wall ? nearest.wallLower : fallback.accent,
    roof: nearest?.roof || fallback.roof,
    glass: nearest?.glass || fallback.glass,
    distance: nearest ? round(nearestDistance, 1) : null
  };
}
console.log(`✓ ${Object.keys(landmarkEntries).length} landmark`);

// ---------------------------------------------------------------------------
// 8. Palette blocchi e output
// ---------------------------------------------------------------------------
const usedBlocks = new Map();
function registerBlock(name) {
  if (!name) return;
  const key = blockKey(name);
  if (key === 'air') return;
  bump(usedBlocks, key);
}
for (const key of surfaceCounts.keys()) registerBlock(key);
for (const entry of buildingEntries) {
  registerBlock(entry.wall);
  registerBlock(entry.wallLower);
  registerBlock(entry.wallUpper);
  registerBlock(entry.roof);
  registerBlock(entry.glass);
  registerBlock(entry.door);
}
for (const entry of Object.values(areaEntries)) {
  registerBlock(entry.surface);
  registerBlock(entry.crop);
  registerBlock(entry.bank);
  if (entry.species) registerBlock(`${entry.species}_leaves`);
}
for (const entry of Object.values(roadEntries)) {
  registerBlock(entry.surface);
  registerBlock(entry.side);
}
for (const entry of treeEntries) registerBlock(`${entry.species}_leaves`);
for (const entry of Object.values(landmarkEntries)) {
  registerBlock(entry.wall);
  registerBlock(entry.accent);
  registerBlock(entry.roof);
  registerBlock(entry.glass);
}
registerBlock(waterBank);
for (const key of GROUND_BLOCKS) registerBlock(key);

const blockPalette = {};
for (const [key, count] of [...usedBlocks.entries()].sort((a, b) => b[1] - a[1])) {
  blockPalette[key] = { color: blockColor(key), count };
}

const output = {
  meta: {
    version: 3,
    generated: new Date().toISOString(),
    source: 'assets/ArnisWorld3',
    levelName: 'Arnis World 1: Fidenza',
    projection: 'local-tangent',
    scale: metadata.scale,
    blockSizeMeters: 2,
    gameOrigin: WORLD.origin,
    gameBounds: WORLD.bounds,
    mcBounds: {
      minX: surfaceMinX,
      maxX: surfaceMaxX,
      minZ: surfaceMinZ,
      maxZ: surfaceMaxZ,
      width: surfaceWidth,
      height: surfaceHeight
    },
    surface: {
      width: surfaceWidth,
      height: surfaceHeight,
      minY: minHeight,
      maxY: maxHeight,
      palette: paletteColors,
      lods: surfaceLods
    },
    water: { level: waterLevel, bank: waterBank },
    counts: {
      buildings: buildingEntries.length,
      areas: Object.keys(areaEntries).length,
      roads: Object.keys(roadEntries).length,
      trees: treeEntries.length,
      treeRows: treeRowEntries.length,
      landmarks: Object.keys(landmarkEntries).length
    }
  },
  palette: blockPalette,
  water: { block: 'water', level: waterLevel, bank: waterBank },
  buildings: buildingsById,
  areas: areaEntries,
  roads: roadEntries,
  trees: treeEntries,
  treeRows: treeRowEntries,
  landmarks: landmarkEntries
};

fs.writeFileSync(path.join(OUT_DIR, 'arnis.json'), JSON.stringify(output));
console.log(`✓ arnis.json (${(fs.statSync(path.join(OUT_DIR, 'arnis.json')).size / 1e6).toFixed(2)} MB)`);

const audit = {
  generated: output.meta.generated,
  surface: {
    chunks: surfaceChunks,
    paletteColors: paletteColors.length,
    minY: minHeight,
    maxY: maxHeight,
    topBlocks: Object.fromEntries([...surfaceCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 40))
  },
  buildings: {
    total: buildingEntries.length,
    lowConfidence: buildingEntries.filter(entry => entry.confidence < 0.25).length,
    avgConfidence: round(buildingEntries.reduce((sum, entry) => sum + entry.confidence, 0) / Math.max(1, buildingEntries.length), 3),
    stairsRoofs: buildingEntries.filter(entry => entry.roofType === 'stairs').length,
    slabRoofs: buildingEntries.filter(entry => entry.roofType === 'slab').length,
    flatRoofs: buildingEntries.filter(entry => entry.roofType === 'flat').length,
    withGlass: buildingEntries.filter(entry => entry.glass).length,
    withDoor: buildingEntries.filter(entry => entry.door).length,
    sample: buildingEntries.slice(0, 12)
  },
  areas: Object.fromEntries(Object.entries(areaEntries).slice(0, 30)),
  roads: Object.fromEntries(Object.entries(roadEntries).slice(0, 30)),
  trees: { species: treeEntries.reduce((acc, entry) => { acc[entry.species] = (acc[entry.species] || 0) + 1; return acc; }, {}) },
  water: output.water,
  pool: blockPalette
};
fs.writeFileSync(path.join(OUT_DIR, 'audit.json'), JSON.stringify(audit, null, 2));
console.log('✓ audit.json');
console.log('Fatto.');
