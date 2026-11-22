#!/usr/bin/env node
/**
 * Audit coerenza tetti / muri per Fidenza v3.
 *
 * Ricalcola l'ingombro dei tetti cosi' come lo genera world.js e segnala:
 *  - tetti che sporgono oltre il footprint dei muri;
 *  - tetti costruiti su poligoni irregolari (gradoni "sospesi");
 *  - edifici saltati dai landmark che avrebbero ancora un tetto;
 *  - poligoni degeneri.
 */

import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  resolveBuildingRoof, hippedRoofRing, polygonCentroid
} from '../js/building-geometry.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const city = JSON.parse(readFileSync(resolve(root, 'data/city.json'), 'utf8'));
const map = JSON.parse(readFileSync(resolve(root, 'data/map.json'), 'utf8'));
const arnis = JSON.parse(readFileSync(resolve(root, 'data/arnis/arnis.json'), 'utf8'));
const arnisBuildings = arnis.buildings || {};
const roofStyleCounts = { flat: 0, gabled: 0, hipped: 0 };

const LANDMARK_NAMES = new Set([
  'Cattedrale di San Donnino', 'Porta di San Donnino',
  'Teatro Girolamo Magnani', 'Santuario della Gran Madre di Dio',
  'Chiesa di San Pietro', 'Fidenza'
]);
const comunale = (map.landmarks || []).find(item => item.id === 'comunale');

function polygonArea(poly) {
  let area = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    area += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(area) / 2;
}

function isConvex(poly) {
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length], c = poly[(i + 2) % poly.length];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) < 1e-6) continue;
    if (!sign) sign = Math.sign(cross);
    else if (Math.sign(cross) !== sign) return false;
  }
  return true;
}

function longestEdge(poly) {
  let best = null;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i], b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-6 || (best && len <= best.len)) continue;
    best = { ux: dx / len, uz: dz / len, len };
  }
  return best || { ux: 1, uz: 0, len: 1 };
}

function orientedBounds(poly, ux, uz) {
  let minU = Infinity, maxU = -Infinity, minN = Infinity, maxN = -Infinity;
  for (const [x, z] of poly) {
    const u = x * ux + z * uz;
    const n = -x * uz + z * ux;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (n < minN) minN = n;
    if (n > maxN) maxN = n;
  }
  return {
    minU, maxU, minN, maxN,
    centerX: ux * (minU + maxU) / 2 - uz * (minN + maxN) / 2,
    centerZ: uz * (minU + maxU) / 2 + ux * (minN + maxN) / 2,
    width: maxN - minN,
    length: maxU - minU
  };
}

function pointSegmentDistance(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const t = len2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz));
}

function distanceToPolygon(p, poly) {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    min = Math.min(min, pointSegmentDistance(p, poly[i], poly[(i + 1) % poly.length]));
  }
  return min;
}

const issues = [];
const nearPonte = [];
for (const b of city.buildings || []) {
  const poly = b.poly || [];
  const area = Number(b.area) || polygonArea(poly);
  const skipped = LANDMARK_NAMES.has(b.name) ||
    (comunale && Math.hypot(b.x - comunale.x, b.z - comunale.z) < 9);

  if (poly.length < 3 || area < 1 || !(b.h > 1)) {
    issues.push({ id: b.id, name: b.name, x: b.x, z: b.z, type: 'degenerate', area, h: b.h });
    continue;
  }
  if (skipped) {
    issues.push({ id: b.id, name: b.name, x: b.x, z: b.z, type: 'skipped-landmark', area, h: b.h });
    continue;
  }

  const edge = longestEdge(poly);
  const bounds = orientedBounds(poly, edge.ux, edge.uz);
  const rectangularity = area / Math.max(0.01, bounds.width * bounds.length);
  // Stessa funzione usata da world.js: così l'audit non può divergere dalla
  // scelta reale del tetto (incluso il roofType di Arnis).
  const resolved = resolveBuildingRoof(b, arnisBuildings[String(b.id)]?.roofType);
  roofStyleCounts[resolved.style] = (roofStyleCounts[resolved.style] || 0) + 1;
  const flat = resolved.style === 'flat' ||
    ['shed', 'flat', 'none'].includes((b.kind || '').toLowerCase());
  if (flat) continue;

  if (resolved.style === 'hipped') {
    const ring = hippedRoofRing(poly, 0.5);
    const centroid = polygonCentroid(poly);
    let cx = 0, cz = 0;
    for (const [x, shapeY] of ring) { cx += x; cz += -shapeY; }
    cx /= ring.length;
    cz /= ring.length;
    const mirrorDrift = Math.hypot(cx - centroid.x, cz - centroid.z);
    if (mirrorDrift > 0.01) {
      issues.push({
        id: b.id, name: b.name, x: b.x, z: b.z,
        type: 'hipped-roof-mirrored', drift: +mirrorDrift.toFixed(2), area, h: b.h
      });
    }
  }

  // Rettangolo del tetto con overhang alto (1 m), come in world.js quality!=low.
  const overhang = 0.35;
  const corners = [
    [bounds.minU - overhang, bounds.minN - overhang],
    [bounds.maxU + overhang, bounds.minN - overhang],
    [bounds.maxU + overhang, bounds.maxN + overhang],
    [bounds.minU - overhang, bounds.maxN + overhang]
  ].map(([u, n]) => [u * edge.ux - n * edge.uz, u * edge.uz + n * edge.ux]);
  let overhangMax = 0;
  for (const corner of corners) overhangMax = Math.max(overhangMax, distanceToPolygon(corner, poly));

  const record = {
    id: b.id, name: b.name, x: +b.x.toFixed(1), z: +b.z.toFixed(1),
    type: overhangMax > 1.0 ? 'roof-outside-walls' : rectangularity < 0.6 ? 'irregular-roof' : null,
    overhangMax: +overhangMax.toFixed(2),
    rectangularity: +rectangularity.toFixed(2),
    convex: isConvex(poly),
    area: +area.toFixed(1), h: b.h
  };
  if (b.x > -370 && b.x < -260 && b.z > -100 && b.z < -30) nearPonte.push(record);
  if (record.type) issues.push(record);
}

const nearPonteIssues = nearPonte.filter(item => item.type);
console.log(`Edifici: ${(city.buildings || []).length}, tetti analizzati: ${(city.buildings || []).length - issues.length + nearPonte.length}`);
console.log(`Stili tetto risolti: piani ${roofStyleCounts.flat}, a falde ${roofStyleCounts.gabled}, a padiglione ${roofStyleCounts.hipped}`);
console.log(`Problemi totali: ${issues.length}, zona Ponte Romano: ${nearPonteIssues.length}/${nearPonte.length}`);
console.log('\nTetti a padiglione specchiati:');
const mirrored = issues.filter(i => i.type === 'hipped-roof-mirrored');
if (!mirrored.length) console.log('  nessuno');
for (const item of mirrored.slice(0, 12)) {
  console.log(`  ${item.id} (${item.x}, ${item.z}) drift=${item.drift} m`);
}
console.log('\nPeggiori (sporgenza):');
for (const item of [...issues].filter(i => i.type === 'roof-outside-walls').sort((a, b) => b.overhangMax - a.overhangMax).slice(0, 12)) {
  console.log(`  ${item.id} (${item.x}, ${item.z}) ${item.type} overhang=${item.overhangMax} rect=${item.rectangularity} h=${item.h}`);
}
console.log('\nIrregolari:');
for (const item of issues.filter(i => i.type === 'irregular-roof').slice(0, 12)) {
  console.log(`  ${item.id} (${item.x}, ${item.z}) rect=${item.rectangularity} convex=${item.convex} area=${item.area}`);
}
console.log('\nSaltati/degeneri:');
for (const item of issues.filter(i => i.type === 'skipped-landmark' || i.type === 'degenerate').slice(0, 12)) {
  console.log(`  ${item.id} ${item.name || ''} (${item.x}, ${item.z}) ${item.type}`);
}
console.log('\nZona Ponte Romano:');
for (const item of nearPonte) {
  console.log(`  ${item.id} (${item.x}, ${item.z}) ${item.type || 'ok'} overhang=${item.overhangMax ?? '-'} rect=${item.rectangularity ?? '-'} convex=${item.convex ?? '-'}`);
}

// --- Coerenza dati OSM / POI / cartellonistica -----------------------------
const buildings = city.buildings || [];
const pois = city.pois || [];
const roads = city.roads || [];
const countBy = (items, key) => items.reduce((acc, item) => {
  const value = item[key] || 'none';
  acc[value] = (acc[value] || 0) + 1;
  return acc;
}, {});
const provenance = {
  heightSource: countBy(buildings, 'heightSource'),
  withColor: buildings.filter(b => b.color).length,
  withWallColor: buildings.filter(b => b.wallColor).length,
  withRoofColor: buildings.filter(b => b.roofColor).length,
  withAddress: buildings.filter(b => b.addr).length,
};
const poiIssues = pois.filter(p => !Number.isFinite(p.x) || !Number.isFinite(p.z));
const namedRoads = roads.filter(r => r.name);
const facadeFile = resolve(root, 'data/facades.json');
const facades = JSON.parse(readFileSync(facadeFile, 'utf8'));
const missingFacadePhotos = facades.filter(f => {
  try { readFileSync(resolve(root, 'assets/textures/exteriors', f.image)); return false; }
  catch { return true; }
});

console.log('\n=== Coerenza citta reale ===');
console.log(`Altezze: ${JSON.stringify(provenance.heightSource)}`);
console.log(`Colori: ${provenance.withColor}/${buildings.length} muri, ${provenance.withRoofColor} tetti, ${provenance.withWallColor} pareti`);
console.log(`IndirizziOSM: ${provenance.withAddress} edifici, strade nominate: ${namedRoads.length}/${roads.length}`);
console.log(`POI: ${pois.length}, coordinate invalide: ${poiIssues.length}`);
console.log(`Facciate fotografiche: ${facades.length}, foto mancanti: ${missingFacadePhotos.length}`);
if (missingFacadePhotos.length) {
  for (const f of missingFacadePhotos) console.log(`  MANCANTE ${f.id}: ${f.image}`);
}
const globalIssues = issues.filter(i => i.type !== 'skipped-landmark').length +
  poiIssues.length + missingFacadePhotos.length;
console.log(`\nTOTALE anomalie correggibili: ${globalIssues}`);
