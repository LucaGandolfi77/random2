#!/usr/bin/env node
/**
 * Audit degli asset Arnis derivati (non richiede il save Minecraft).
 *
 * Uso:
 *   node tools/audit-arnis.mjs
 *   node tools/audit-arnis.mjs --json
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const DATA = path.join(ROOT, 'data', 'arnis');
const ARNIS = path.join(DATA, 'arnis.json');
const SURFACE = path.join(DATA, 'surface.png');
const CITY = path.join(ROOT, 'data', 'city.json');
const MAP = path.join(ROOT, 'data', 'map.json');

const wantJson = process.argv.includes('--json');
const issues = [];
const warnings = [];

function readJson(file) {
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function pngSize(file) {
  const buffer = fs.readFileSync(file);
  const signature = buffer.subarray(0, 8).toString('hex');
  if (signature !== '89504e470d0a1a0a') return null;
  return {
    width: buffer.readUInt32BE(16),
    height: buffer.readUInt32BE(20),
    bytes: buffer.length
  };
}

if (!fs.existsSync(ARNIS)) {
  console.error('✗ data/arnis/arnis.json mancante. Esegui node tools/import-arnis.mjs');
  process.exit(1);
}
if (!fs.existsSync(SURFACE)) {
  console.error('✗ data/arnis/surface.png mancante. Esegui node tools/import-arnis.mjs');
  process.exit(1);
}

const arnis = readJson(ARNIS);
const city = readJson(CITY);
const map = readJson(MAP);
const surface = pngSize(SURFACE);

if (!surface) issues.push('surface.png non è un PNG valido');
else {
  if (surface.width !== arnis.meta?.surface?.width) {
    issues.push(`surface.png larghezza ${surface.width} ≠ meta ${arnis.meta?.surface?.width}`);
  }
  if (surface.height !== arnis.meta?.surface?.height) {
    issues.push(`surface.png altezza ${surface.height} ≠ meta ${arnis.meta?.surface?.height}`);
  }
  if (surface.bytes > 6_000_000) warnings.push(`surface.png pesa ${(surface.bytes / 1e6).toFixed(2)} MB`);
}

const lodManifestPath = path.join(DATA, 'surface.json');
const lodManifest = fs.existsSync(lodManifestPath) ? readJson(lodManifestPath) : null;
const lodReport = [];
if (!lodManifest) {
  warnings.push('surface.json mancante: l’editor userà solo surface.png');
} else {
  for (const level of lodManifest.levels || []) {
    const file = path.join(DATA, level.src);
    if (!fs.existsSync(file)) {
      issues.push(`LOD mancante: ${level.src}`);
      continue;
    }
    const info = pngSize(file);
    if (!info) {
      issues.push(`LOD non valido: ${level.src}`);
      continue;
    }
    if (info.width !== level.width || info.height !== level.height) {
      issues.push(`LOD ${level.id}: ${info.width}×${info.height} ≠ ${level.width}×${level.height}`);
    }
    lodReport.push({ id: level.id, src: level.src, width: info.width, height: info.height, bytes: info.bytes });
  }
}

// Copertura edifici
const buildingIds = new Set(Object.keys(arnis.buildings || {}));
let missingBuildings = 0;
let lowConfidence = 0;
let stairs = 0;
let slabs = 0;
let flat = 0;
let withGlass = 0;
let withDoor = 0;
for (const building of city.buildings) {
  const info = arnis.buildings?.[String(building.id)];
  if (!info) { missingBuildings++; continue; }
  if (!info.wall) issues.push(`edificio ${building.id}: muro mancante`);
  if (!info.roof) issues.push(`edificio ${building.id}: tetto mancante`);
  if (!Number.isFinite(info.height)) issues.push(`edificio ${building.id}: altezza non valida`);
  if ((info.confidence || 0) < 0.25) lowConfidence++;
  if (info.roofType === 'stairs') stairs++;
  else if (info.roofType === 'slab') slabs++;
  else flat++;
  if (info.glass) withGlass++;
  if (info.door) withDoor++;
}
const coverage = 1 - missingBuildings / Math.max(1, city.buildings.length);
if (coverage < 0.95) issues.push(`copertura edifici ${(coverage * 100).toFixed(1)}% < 95%`);
if (lowConfidence > city.buildings.length * 0.05) warnings.push(`${lowConfidence} edifici a bassa confidenza`);
if (stairs + slabs < city.buildings.length * 0.5) warnings.push('pochi tetti stairs/slab riconosciuti');

// Copertura aree, strade, alberi
const areaIds = new Set(Object.keys(arnis.areas || {}));
let missingAreas = 0;
for (const area of city.areas) if (!areaIds.has(String(area.id))) missingAreas++;
const areaCoverage = 1 - missingAreas / Math.max(1, city.areas.length);
if (areaCoverage < 0.9) warnings.push(`copertura aree ${(areaCoverage * 100).toFixed(1)}%`);

const roadIds = new Set(Object.keys(arnis.roads || {}));
let missingRoads = 0;
for (const road of city.roads) if (!roadIds.has(String(road.id))) missingRoads++;
const roadCoverage = 1 - missingRoads / Math.max(1, city.roads.length);
if (roadCoverage < 0.9) warnings.push(`copertura strade ${(roadCoverage * 100).toFixed(1)}%`);

if (!Array.isArray(arnis.trees) || arnis.trees.length !== (city.trees || []).length) {
  warnings.push(`alberi: ${arnis.trees?.length ?? 0} / ${(city.trees || []).length}`);
}
if (!Array.isArray(arnis.treeRows) || arnis.treeRows.length !== (city.treeRows || []).length) {
  warnings.push(`filari: ${arnis.treeRows?.length ?? 0} / ${(city.treeRows || []).length}`);
}

// Palette e blocchi sconosciuti
const palette = arnis.palette || {};
for (const [block, info] of Object.entries(palette)) {
  if (!info?.color) issues.push(`palette: colore mancante per ${block}`);
}
const blocksUsed = new Set([
  ...Object.values(arnis.buildings || {}).flatMap(info => [info.wall, info.wallLower, info.wallUpper, info.roof, info.glass, info.door]),
  ...Object.values(arnis.areas || {}).map(info => info.surface),
  ...Object.values(arnis.roads || {}).flatMap(info => [info.surface, info.side]),
  ...Object.values(arnis.landmarks || {}).flatMap(info => [info.wall, info.accent, info.roof, info.glass])
].filter(Boolean));
let unknownBlocks = 0;
for (const block of blocksUsed) {
  if (!palette[block]) { unknownBlocks++; warnings.push(`blocco usato ma non in palette: ${block}`); }
}
if (unknownBlocks > blocksUsed.size * 0.05) issues.push(`${unknownBlocks} blocchi usati fuori palette`);

// Landmark
for (const landmark of map.landmarks || []) {
  const info = arnis.landmarks?.[landmark.id];
  if (!info) {
    warnings.push(`landmark senza materiali: ${landmark.id}`);
    continue;
  }
  if (!info.wall || !info.roof) warnings.push(`landmark ${landmark.id}: materiale incompleto`);
}

const report = {
  generated: new Date().toISOString(),
  ok: issues.length === 0,
  coverage: {
    buildings: +(coverage * 100).toFixed(1),
    areas: +(areaCoverage * 100).toFixed(1),
    roads: +(roadCoverage * 100).toFixed(1)
  },
  buildings: {
    total: city.buildings.length,
    mapped: buildingIds.size,
    missing: missingBuildings,
    lowConfidence,
    roofs: { stairs, slabs, flat },
    withGlass,
    withDoor
  },
  surface,
  surfaceLods: lodReport,
  palette: { blocks: Object.keys(palette).length, used: blocksUsed.size, unknown: unknownBlocks },
  issues,
  warnings
};

if (wantJson) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Copertura edifici: ${report.coverage.buildings}% (${buildingIds.size}/${city.buildings.length})`);
  console.log(`Aree: ${report.coverage.areas}% · Strade: ${report.coverage.roads}%`);
  console.log(`Tetti: ${stairs} stairs, ${slabs} slab, ${flat} flat · vetri ${withGlass} · porte ${withDoor}`);
  console.log(`Superficie: ${surface.width}×${surface.height}, ${(surface.bytes / 1e6).toFixed(2)} MB`);
  console.log(`Palette: ${report.palette.blocks} blocchi, ${unknownBlocks} usati sconosciuti`);
  if (warnings.length) {
    console.log(`\n⚠ ${warnings.length} avvisi:`);
    for (const warning of warnings.slice(0, 20)) console.log(`  - ${warning}`);
    if (warnings.length > 20) console.log(`  … altri ${warnings.length - 20}`);
  }
  if (issues.length) {
    console.log(`\n✗ ${issues.length} problemi:`);
    for (const issue of issues) console.log(`  - ${issue}`);
  } else {
    console.log('\n✓ Audit Arnis superato');
  }
}

if (issues.length) process.exit(1);
