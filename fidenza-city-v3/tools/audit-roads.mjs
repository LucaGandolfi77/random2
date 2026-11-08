#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { distanceToPolyline, ROAD_WIDTHS } from './road-widths.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CITY_FILE = path.join(ROOT, 'data/city.json');
const OSM_FILE = path.join(ROOT, 'data/osm-roads.json');
const OUT_FILE = path.join(ROOT, 'data/road-audit.json');
const check = process.argv.includes('--check');
const city = JSON.parse(fs.readFileSync(CITY_FILE, 'utf8'));
const snapshot = fs.existsSync(OSM_FILE) ? JSON.parse(fs.readFileSync(OSM_FILE, 'utf8')) : null;
const origin = city.meta.origin;
const mPerDegLat = 111132.0;
const mPerDegLon = 111320.0 * Math.cos(origin.lat * Math.PI / 180);

function project(lat, lon) {
  return [
    +((lon - origin.lon) * mPerDegLon).toFixed(2),
    +(-(lat - origin.lat) * mPerDegLat).toFixed(2)
  ];
}

function median(values) {
  if (!values.length) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

function groupKey(road) {
  const name = road.name?.trim().toLowerCase();
  return name
    ? `${name}|${road.kind}|${road.dual ? 'dual' : 'normal'}`
    : `__unnamed__|${road.kind}|${road.dual ? 'dual' : 'normal'}`;
}

const errors = [];
const warnings = [];
const roads = city.roads || [];
const groups = new Map();
for (const road of roads) {
  const key = groupKey(road);
  if (!groups.has(key)) groups.set(key, []);
  groups.get(key).push(road);
}

const invalidWidth = roads.filter(road => !(road.w >= 1.5 && road.w <= 30));
if (invalidWidth.length) errors.push(`${invalidWidth.length} strade con larghezza fuori da 1,5–30 m`);

const groupRows = [];
for (const [key, list] of groups) {
  const widths = list.map(road => road.w);
  const before = list.map(road => Number(road.wOsm) || Number(road.w) || 0);
  const spread = Math.max(...widths) - Math.min(...widths);
  const spreadBefore = Math.max(...before) - Math.min(...before);
  if (spread > 0.31) errors.push(`gruppo ${key} ancora disomogeneo: ${spread.toFixed(2)} m`);
  groupRows.push({
    key,
    name: list[0].name || '',
    kind: list[0].kind,
    dual: !!list[0].dual,
    segments: list.length,
    length: +list.reduce((sum, road) => sum + (Number(road.length) || 0), 0).toFixed(1),
    width: median(widths),
    widthBefore: median(before),
    spread: +spread.toFixed(2),
    spreadBefore: +spreadBefore.toFixed(2),
    sampleId: String(list[0].id),
    osmUrl: `https://www.openstreetmap.org/way/${list[0].id}`
  });
}
groupRows.sort((a, b) => b.spreadBefore - a.spreadBefore || b.length - a.length);

const rawById = new Map();
if (snapshot) {
  for (const element of snapshot.elements || []) {
    if (element.geometry?.length >= 2) rawById.set(String(element.id), element);
  }
}

const geometryRows = [];
let maxDeviation = 0;
let checkedGeometry = 0;
for (const road of roads) {
  const element = rawById.get(String(road.id));
  if (!element || !road.pts || road.pts.length < 2) continue;
  const rawPoints = element.geometry.map(point => project(point.lat, point.lon));
  let deviation = 0;
  for (const point of rawPoints) {
    deviation = Math.max(deviation, distanceToPolyline(point, road.pts));
  }
  maxDeviation = Math.max(maxDeviation, deviation);
  checkedGeometry++;
  if (deviation > 0.35) {
    geometryRows.push({
      id: String(road.id),
      name: road.name || '',
      kind: road.kind,
      deviation: +deviation.toFixed(2)
    });
  }
}
if (geometryRows.length) errors.push(`${geometryRows.length} strade deviate dal centerline OSM oltre 0,35 m`);

const changed = roads
  .filter(road => Math.abs((Number(road.w) || 0) - (Number(road.wOsm) || 0)) >= 0.5)
  .map(road => ({
    id: String(road.id),
    name: road.name || '',
    kind: road.kind,
    dual: !!road.dual,
    width: road.w,
    widthBefore: road.wOsm,
    source: road.wSource || '',
    group: road.wGroup || '',
    osmUrl: `https://www.openstreetmap.org/way/${road.id}`
  }))
  .sort((a, b) => Math.abs(b.width - b.widthBefore) - Math.abs(a.width - a.widthBefore));

const missingSnapshot = roads.filter(road => snapshot && !rawById.has(String(road.id)));
if (missingSnapshot.length) warnings.push(`${missingSnapshot.length} strade senza geometria nello snapshot OSM`);
if (!snapshot) warnings.push('snapshot OSM assente: salto il controllo geometrico');

const summary = {
  generated: new Date().toISOString(),
  roads: roads.length,
  named: roads.filter(road => road.name).length,
  unnamed: roads.filter(road => !road.name).length,
  groups: groups.size,
  dualSegments: roads.filter(road => road.dual).length,
  checkedGeometry,
  maxDeviation: +maxDeviation.toFixed(2),
  changed: changed.length,
  invalidWidth: invalidWidth.length,
  errors,
  warnings,
  classes: Object.fromEntries([...new Set(roads.map(road => road.kind))].sort().map(kind => [
    kind,
    {
      count: roads.filter(road => road.kind === kind).length,
      width: ROAD_WIDTHS[kind] || null,
      median: median(roads.filter(road => road.kind === kind).map(road => road.w))
    }
  ]))
};

const priority = { primary: 5, secondary: 4, tertiary: 3, residential: 2, unclassified: 1, service: 1 };
const review = groupRows
  .filter(group => group.spreadBefore >= 0.5)
  .sort((a, b) => (priority[b.kind] || 0) - (priority[a.kind] || 0) || b.spreadBefore - a.spreadBefore || b.length - a.length)
  .map(group => ({
    status: 'todo',
    name: group.name || '(senza nome)',
    kind: group.kind,
    dual: group.dual,
    segments: group.segments,
    length: group.length,
    width: group.width,
    widthBefore: group.widthBefore,
    spreadBefore: group.spreadBefore,
    sampleId: group.sampleId,
    osmUrl: group.osmUrl
  }));

const report = {
  summary,
  review,
  groups: groupRows,
  geometry: geometryRows,
  changed: changed.slice(0, 120),
  missingSnapshot: missingSnapshot.slice(0, 40).map(road => ({
    id: String(road.id),
    name: road.name || '',
    kind: road.kind
  }))
};

fs.writeFileSync(OUT_FILE, JSON.stringify(report, null, 2));

console.log(`Strade: ${summary.roads} · gruppi: ${summary.groups} · carreggiate doppie: ${summary.dualSegments}`);
console.log(`Larghezze cambiate: ${summary.changed} · deviazione max centerline: ${summary.maxDeviation} m`);
console.log('Gruppi con maggiore differenza prima della normalizzazione:');
for (const row of groupRows.slice(0, 12)) {
  console.log(`  ${(row.name || '(senza nome)').slice(0, 40).padEnd(40)} ${row.kind.padEnd(12)} ${row.segments.toString().padStart(3)} seg · ${row.widthBefore.toFixed(1)} m · spread ${row.spreadBefore.toFixed(1)} → ${row.spread.toFixed(2)}`);
}
if (warnings.length) for (const warning of warnings) console.warn(`! ${warning}`);
if (errors.length) {
  for (const error of errors) console.error(`✗ ${error}`);
  process.exit(check ? 1 : 0);
}
console.log(`✓ Audit strade superato · report ${path.relative(ROOT, OUT_FILE)}`);
