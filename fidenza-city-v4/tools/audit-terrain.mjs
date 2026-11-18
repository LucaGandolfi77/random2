#!/usr/bin/env node
/**
 * Fidenza da Giocare v2.14 — audit della heightmap AWS
 *
 * Verifica che data/terrain.json sia stato generato dai Terrain Tiles AWS
 * (Terrarium), che la griglia sia ad alta risoluzione e che le quote siano
 * finite e plausibili.
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const terrain = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'terrain.json'), 'utf8'));
const meta = terrain.meta || {};
const heights = Array.isArray(terrain.heights) ? terrain.heights : [];
const grid = Number(meta.grid || 0);

let invalid = 0;
let min = Infinity;
let max = -Infinity;
let sum = 0;
for (const h of heights) {
  if (!Number.isFinite(h)) { invalid++; continue; }
  if (h < min) min = h;
  if (h > max) max = h;
  sum += h;
}

const checks = {
  awsProvider: meta.provider === 'aws-terrarium',
  terrariumFormat: meta.format === 'Terrarium PNG',
  highZoom: Number(meta.zoom) >= 15,
  highGrid: grid >= 512,
  correctLength: heights.length === grid * grid,
  finiteHeights: invalid === 0,
  plausibleRange: min > -50 && max < 500,
  metadataMinMax: Math.abs(Number(meta.min) - min) < 0.2 && Math.abs(Number(meta.max) - max) < 0.2
};

const errors = Object.entries(checks).filter(([, ok]) => !ok).map(([key]) => key);
const report = {
  generated: new Date().toISOString(),
  source: meta.source || '',
  provider: meta.provider || '',
  format: meta.format || '',
  zoom: meta.zoom,
  grid,
  values: heights.length,
  min: +min.toFixed(1),
  max: +max.toFixed(1),
  mean: +(sum / Math.max(1, heights.length - invalid)).toFixed(1),
  invalid,
  checks,
  errors
};

fs.writeFileSync(path.join(ROOT, 'data', 'terrain-audit.json'), JSON.stringify(report, null, 2) + '\n');

console.log(`✓ audit terreno AWS: ${errors.length} errori`);
console.log(`  provider: ${report.provider} · zoom ${report.zoom} · griglia ${report.grid}×${report.grid}`);
console.log(`  quote: ${report.min} / ${report.mean} / ${report.max} m · valori ${report.values}`);
console.log('  report: data/terrain-audit.json');
if (errors.length) process.exitCode = 1;
