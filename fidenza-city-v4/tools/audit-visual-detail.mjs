#!/usr/bin/env node
/**
 * Stima i dettagli voxel 1 m aggiunti a case e strade e verifica i budget
 * indicativi per qualità. Non richiede il save Minecraft né un browser.
 *
 * Uso: node tools/audit-visual-detail.mjs [--json]
 */

import fs from 'node:fs';
import path from 'node:path';
import { classifyBuildingRoof } from '../js/building-geometry.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const city = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'city.json'), 'utf8'));
const json = process.argv.includes('--json');

function box(geometries = 1) {
  return geometries * 12;
}

let buildings = 0;
let edgesTotal = 0;
let windows = 0;
let gabled = 0;
let hipped = 0;
let flat = 0;
let gableEnds = 0;
let roofSteps = 0;
let dormers = 0;
let quoins = 0;
let plinths = 0;
let cornices = 0;
let windowSills = 0;
let windowLintels = 0;
let shutters = 0;
let flowerBoxes = 0;
let flatPosts = 0;
let pilasters = 0;

for (const building of city.buildings || []) {
  if (building.h < 4.2 || building.area < 28 || building.kind === 'roof') continue;
  buildings++;
  const edges = [];
  for (let i = 0, j = building.poly.length - 1; i < building.poly.length; j = i++) {
    const [ax, az] = building.poly[j];
    const [bx, bz] = building.poly[i];
    const len = Math.hypot(bx - ax, bz - az);
    if (len >= 4) edges.push(len);
  }
  edgesTotal += edges.length;
  const industrial = building.facadeStyle === 'industrial';
  const rural = building.facadeStyle === 'rural';
  const floorLimit = industrial ? 2 : rural ? 3 : 8;
  const floors = Math.max(1, Math.min(floorLimit, building.levels > 0 ? Math.round(building.levels) : Math.floor((building.h - 2) / 3)));
  let buildingWindows = 0;
  for (const len of edges) {
    const count = industrial
      ? Math.max(1, Math.min(4, Math.floor(len / 7)))
      : rural
        ? Math.max(1, Math.min(5, Math.floor(len / 4.2)))
        : Math.max(1, Math.min(8, Math.floor(len / 3.1)));
    for (let f = 0; f < floors; f++) {
      if (2.15 + f * 3 > building.h - 0.75) break;
      buildingWindows += count;
    }
  }
  windows += buildingWindows;
  const roof = classifyBuildingRoof(building);
  const steps = Math.max(2, Math.min(12, Math.ceil(roof.ridgeHeight / 1)));
  roofSteps += steps;
  if (roof.style === 'gabled') {
    gabled++;
    gableEnds += 2;
    if (building.area > 60) dormers += 5;
  } else if (roof.style === 'hipped') {
    hipped++;
  } else {
    flat++;
    if (building.h > 2) flatPosts += Math.max(2, Math.round(building.poly.length * 2));
  }
  plinths += edges.length;
  cornices += edges.length;
  for (const len of edges) if (len > 7.5) pilasters += Math.floor(len / 7);
  if (building.area > 42 && building.poly.length <= 10) quoins += 12;
  windowSills += Math.floor(buildingWindows / 3);
  windowLintels += Math.floor(buildingWindows / 6);
  shutters += Math.floor(buildingWindows / (rural ? 5 : 6)) * 2;
  flowerBoxes += Math.floor(buildingWindows / 23);
}

let roadSegments = 0;
let curbs = 0;
let roadPatches = 0;
let drains = 0;
let stopLines = 0;
let lamps = 0;
let bollards = 0;
for (const road of city.roads || []) {
  if (!road.pts || road.pts.length < 2) continue;
  const segments = road.pts.length - 1;
  const pedestrian = ['pedestrian', 'footway', 'living_street', 'path', 'cycleway', 'track', 'steps'].includes(road.kind);
  if (!pedestrian && road.w >= 4.5) {
    roadSegments += segments;
    curbs += segments * 4;
  }
  if (road.length > 12) roadPatches += Math.min(4, Math.floor(road.length / 28));
  if (['primary', 'secondary', 'tertiary'].includes(road.kind)) drains += Math.max(0, Math.floor(road.length / 40));
}
for (const crossing of city.crossings || []) stopLines += 2;
lamps = 90;
bollards = 30;
const treePits = Math.min((city.trees || []).length + (city.treeRows || []).length * 8, 500);

const detailBoxes = {
  plinths: plinths + cornices,
  pilasters,
  quoins,
  window: windowSills + windowLintels + shutters + flowerBoxes * 2,
  roof: roofSteps + gableEnds + dormers + flatPosts,
  road: curbs + roadPatches + drains + stopLines,
  street: lamps * 4 + bollards * 2,
  treePits: treePits * 5
};
const detailTris = Object.fromEntries(Object.entries(detailBoxes).map(([key, value]) => [key, box(value)]));
const addedTris = Object.values(detailTris).reduce((sum, value) => sum + value, 0);
const baseTris = 4_100_000;
const baseMedium = 3_600_000;
const baseLow = 1_800_000;

const report = {
  buildings,
  edgesTotal,
  windows,
  roofs: { gabled, hipped, flat },
  detailBoxes,
  estimatedTriangles: {
    base: baseTris,
    details: detailTris,
    high: baseTris + addedTris,
    medium: baseMedium + Math.round(addedTris * 0.35),
    low: baseLow + Math.round(addedTris * 0.08)
  },
  treePits
};

if (json) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(`Edifici: ${buildings} · finestre: ${windows} · tetti: ${gabled} gabled, ${hipped} hipped, ${flat} flat`);
  console.log(`Dettagli stimati: ${Object.values(detailBoxes).reduce((a, b) => a + b, 0)} box`);
  console.log(`Triangoli stimati (approssimati): high ${(report.estimatedTriangles.high / 1e6).toFixed(2)}M · medium ${(report.estimatedTriangles.medium / 1e6).toFixed(2)}M · low ${(report.estimatedTriangles.low / 1e6).toFixed(2)}M`);
  if (report.estimatedTriangles.high > 9_000_000) {
    console.log('⚠ budget high oltre 9M: valutare una riduzione dei dettagli.');
  } else {
    console.log('✓ budget high entro 9M.');
  }
}
