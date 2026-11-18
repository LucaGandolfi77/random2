#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { EXCLUDED_HIGHWAYS, normalizeRoadWidths, osmRoadWidth, parseWidth, parseLanes } from './road-widths.mjs';

const ROOT = path.resolve(import.meta.dirname, '..');
const CITY_FILE = path.join(ROOT, 'data/city.json');
const OSM_FILE = path.join(ROOT, 'data/osm-roads.json');
const args = process.argv.slice(2);
const osmArg = args.indexOf('--osm');
const OSM_PATH = osmArg >= 0 ? path.resolve(ROOT, args[osmArg + 1]) : OSM_FILE;

const city = JSON.parse(fs.readFileSync(CITY_FILE, 'utf8'));
const snapshot = JSON.parse(fs.readFileSync(OSM_PATH, 'utf8'));
const origin = city.meta.origin;
const mPerDegLat = 111132.0;
const mPerDegLon = 111320.0 * Math.cos(origin.lat * Math.PI / 180);

function project(lat, lon) {
  return [
    +((lon - origin.lon) * mPerDegLon).toFixed(2),
    +(-(lat - origin.lat) * mPerDegLat).toFixed(2)
  ];
}

function perpDistance(point, a, b) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length = Math.hypot(dx, dz);
  if (length < 1e-9) return Math.hypot(point[0] - a[0], point[1] - a[1]);
  return Math.abs((point[0] - a[0]) * dz - (point[1] - a[1]) * dx) / length;
}

function simplify(points, tolerance = 0.15) {
  if (points.length <= 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDistance = 0;
    let index = -1;
    for (let i = first + 1; i < last; i++) {
      const distance = perpDistance(points[i], points[first], points[last]);
      if (distance > maxDistance) {
        maxDistance = distance;
        index = i;
      }
    }
    if (maxDistance > tolerance && index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function lineFromGeometry(geometry) {
  const points = [];
  for (const node of geometry || []) {
    if (!Number.isFinite(node.lat) || !Number.isFinite(node.lon)) continue;
    const xy = project(node.lat, node.lon);
    const last = points[points.length - 1];
    if (!last || Math.hypot(last[0] - xy[0], last[1] - xy[1]) > 0.02) points.push(xy);
  }
  return points.length >= 2 ? simplify(points) : null;
}

function lineLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return +length.toFixed(1);
}

const roadsById = new Map(city.roads.map(road => [String(road.id), road]));
let updated = 0;
let added = 0;
let skipped = 0;

for (const element of snapshot.elements || []) {
  const tags = element.tags || {};
  const kind = tags.highway;
  const points = lineFromGeometry(element.geometry);
  if (!kind || EXCLUDED_HIGHWAYS.has(kind) || !points) {
    skipped++;
    continue;
  }
  const length = lineLength(points);
  if (length < 1.5) {
    skipped++;
    continue;
  }
  const lanes = Math.round(parseLanes(tags.lanes)) || 0;
  const widthTag = parseWidth(tags.width ?? tags['width:carriageway']);
  const maxspeed = Math.round(parseWidth(tags.maxspeed)) || 0;
  const oneway = tags.oneway === 'yes' || tags.oneway === '1' || tags.oneway === '-1' || tags.junction === 'roundabout';
  const sidewalk = tags.sidewalk == null ? undefined : !['no', 'separate'].includes(tags.sidewalk);
  const common = {
    kind,
    name: tags.name || '',
    w: osmRoadWidth(tags, kind),
    wOsm: osmRoadWidth(tags, kind),
    widthTag,
    lanes,
    maxspeed,
    pts: points,
    length,
    bridge: tags.bridge && tags.bridge !== 'no',
    tunnel: tags.tunnel && tags.tunnel !== 'no',
    oneway,
    surface: tags.surface || '',
    sidewalk,
    cycleway: tags.cycleway || '',
    layer: Number.isFinite(Number(tags.layer)) ? Number(tags.layer) : 0,
    roundabout: tags.junction === 'roundabout',
    dualCarriageway: tags.dual_carriageway === 'yes'
  };

  const existing = roadsById.get(String(element.id));
  if (existing) {
    Object.assign(existing, common);
    updated++;
  } else {
    city.roads.push({ id: element.id, ...common });
    added++;
  }
}

const beforeFilter = city.roads.length;
city.roads = city.roads.filter(road => !EXCLUDED_HIGHWAYS.has(road.kind));
const removedExcluded = beforeFilter - city.roads.length;
const report = normalizeRoadWidths(city.roads);
city.meta.counts.roads = city.roads.length;
city.meta.roadWidths = {
  ...report,
  osmWays: Array.isArray(snapshot.elements) ? snapshot.elements.length : 0,
  roads: city.roads.length,
  skipped,
  removedExcluded,
  osmSnapshot: snapshot.generated || ''
};

fs.writeFileSync(CITY_FILE, JSON.stringify(city, null, 2));
console.log(`✓ ${updated} strade aggiornate, ${added} aggiunte, ${skipped} scartate`);
console.log(`  gruppi ${report.groups} · carreggiate doppie ${report.dualSegments} · larghezze cambiate ${report.changed}`);
console.log(`  output ${path.relative(ROOT, CITY_FILE)}`);
