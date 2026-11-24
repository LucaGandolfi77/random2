#!/usr/bin/env node
/*
 * build-fidenza.mjs — extract the playable centre of Fidenza from the OSM
 * snapshot already tracked in fidenza-city-v3. The output is a compact,
 * deterministic JSON database for the game. It is derived from
 * OpenStreetMap data, © OpenStreetMap contributors, ODbL 1.0.
 *
 *   node scripts/build-fidenza.mjs
 *
 * The source snapshot is data/city.json (Overpass import) plus the map
 * manifest (places and local origin). No network access is required.
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const repo = resolve(root, '..');
const sourceCity = join(repo, 'fidenza-city-v3', 'data', 'city.json');
const sourceMap = join(repo, 'fidenza-city-v3', 'maps', 'fidenza', 'map.json');
const outFile = join(root, 'src', 'data', 'fidenza.json');

const PLAY_BOUNDS = { minX: -1450, maxX: 1390, minZ: -600, maxZ: 1400 };
const EAST_EDGE = 780;
const WEST_MAX_Z = 1400;
const BUFFER = 60;
const VIEW = {
  minX: PLAY_BOUNDS.minX - BUFFER,
  maxX: PLAY_BOUNDS.maxX + BUFFER,
  minZ: PLAY_BOUNDS.minZ - BUFFER,
  maxZ: PLAY_BOUNDS.maxZ + BUFFER
};

const city = JSON.parse(readFileSync(sourceCity, 'utf8'));
const manifest = JSON.parse(readFileSync(sourceMap, 'utf8'));
const origin = manifest.origin;
const metersPerDegreeLat = 111320;
const metersPerDegreeLon = 111320 * Math.cos((origin.lat * Math.PI) / 180);

function project(lat, lon) {
  return {
    x: (lon - origin.lon) * metersPerDegreeLon,
    z: (origin.lat - lat) * metersPerDegreeLat
  };
}

function inside(point, bounds) {
  return point.x >= bounds.minX && point.x <= bounds.maxX && point.z >= bounds.minZ && point.z <= bounds.maxZ;
}

/* The southern district completes the map into one rectangle. The helper
   stays so data around the edge can still be clipped consistently. */
function insidePlayable(point, margin = 0) {
  if (!inside(point, {
    minX: PLAY_BOUNDS.minX - margin,
    maxX: PLAY_BOUNDS.maxX + margin,
    minZ: PLAY_BOUNDS.minZ - margin,
    maxZ: PLAY_BOUNDS.maxZ + margin
  })) {
    return false;
  }
  if (point.x <= EAST_EDGE + margin) return point.z <= WEST_MAX_Z + margin;
  return true;
}

function insideView(point) {
  if (point.x < VIEW.minX || point.x > VIEW.maxX || point.z < VIEW.minZ || point.z > VIEW.maxZ) return false;
  if (point.x <= EAST_EDGE) return point.z <= WEST_MAX_Z + BUFFER;
  return true;
}

function bboxOf(poly) {
  let minX = Infinity;
  let maxX = -Infinity;
  let minZ = Infinity;
  let maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

function intersects(a, b) {
  return a.maxX >= b.minX && a.minX <= b.maxX && a.maxZ >= b.minZ && a.minZ <= b.maxZ;
}

function shoelace(poly) {
  let sum = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % poly.length];
    sum += x1 * z2 - x2 * z1;
  }
  return Math.abs(sum) / 2;
}

function centroid(poly) {
  let x = 0;
  let z = 0;
  let area = 0;
  for (let i = 0; i < poly.length; i++) {
    const [x1, z1] = poly[i];
    const [x2, z2] = poly[(i + 1) % poly.length];
    const cross = x1 * z2 - x2 * z1;
    area += cross;
    x += (x1 + x2) * cross;
    z += (z1 + z2) * cross;
  }
  area /= 2;
  if (Math.abs(area) < 0.001) {
    const n = poly.length;
    return { x: poly.reduce((s, p) => s + p[0], 0) / n, z: poly.reduce((s, p) => s + p[1], 0) / n };
  }
  return { x: x / (6 * area), z: z / (6 * area) };
}

function cleanPoly(poly, tolerance) {
  const points = [];
  for (const [x, z] of poly) {
    if (!Number.isFinite(x) || !Number.isFinite(z)) continue;
    const px = Math.round(x * 10) / 10;
    const pz = Math.round(z * 10) / 10;
    const last = points[points.length - 1];
    if (!last || Math.abs(last[0] - px) > 0.05 || Math.abs(last[1] - pz) > 0.05) points.push([px, pz]);
  }
  if (points.length > 2) {
    const first = points[0];
    const last = points[points.length - 1];
    if (Math.abs(first[0] - last[0]) < 0.05 && Math.abs(first[1] - last[1]) < 0.05) points.pop();
  }
  const simplified = simplify(points, tolerance);
  return simplified.length >= 3 ? simplified : [];
}

function simplify(points, tolerance) {
  if (points.length <= 3) return points;
  let maxDistance = 0;
  let index = 0;
  const [x1, z1] = points[0];
  const [x2, z2] = points[points.length - 1];
  const dx = x2 - x1;
  const dz = z2 - z1;
  const denominator = Math.hypot(dx, dz) || 1;
  for (let i = 1; i < points.length - 1; i++) {
    const [x, z] = points[i];
    const distance = Math.abs(dz * x - dx * z + x2 * z1 - z2 * x1) / denominator;
    if (distance > maxDistance) {
      index = i;
      maxDistance = distance;
    }
  }
  if (maxDistance <= tolerance) return [points[0], points[points.length - 1]];
  const left = simplify(points.slice(0, index + 1), tolerance);
  const right = simplify(points.slice(index), tolerance);
  return left.slice(0, -1).concat(right);
}

function flat(poly) {
  const out = new Array(poly.length * 2);
  for (let i = 0; i < poly.length; i++) {
    out[i * 2] = poly[i][0];
    out[i * 2 + 1] = poly[i][1];
  }
  return out;
}

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function round(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

const LANDMARK_NAMES = new Map([
  ['Cattedrale di San Donnino', 'duomo'],
  ['Santuario della Gran Madre di Dio', 'granmadre'],
  ['Chiesa di San Paolo', 'sanpaolo'],
  ["Chiesa di Sant'Antonio Abate", 'santantonio'],
  ['Porta di San Donnino', 'porta'],
  ['Teatro Girolamo Magnani', 'teatro'],
  ['Chiesa di San Pietro', 'sanpietro'],
  ['Oratorio di San Giorgio', 'oratorio'],
  ['Chiesa di Santa Maria Annunziata', 'santamaria'],
  ['Fidenza', 'stazione'],
  ['Centro Commerciale Fidenza', 'centro-commerciale'],
  ['PalaPratizzoli', 'pala'],
  ['Piscina coperta', 'piscina']
]);

const buildings = [];
for (const building of city.buildings) {
  const raw = building.poly;
  if (!Array.isArray(raw) || raw.length < 3) continue;
  const box = bboxOf(raw);
  if (!intersects(box, VIEW)) continue;
  const center = centroid(raw);
  if (!insideView(center)) continue;
  const area = building.area || shoelace(raw);
  if (area < 9) continue;
  const poly = cleanPoly(raw, 0.35);
  if (poly.length < 3) continue;
  const finalArea = shoelace(poly);
  if (finalArea < 8) continue;
  /* The new Piazza delle Azalee replaces a dense residential block. */
  if (Math.hypot(center.x - 900, center.z - 420) < 30) continue;
  /* Open a small forecourt in front of the Teatro Magnani. */
  if (Math.hypot(center.x + 92, center.z - 50) < 10) continue;
  const landmark = LANDMARK_NAMES.get(building.name || '') || null;
  const height = clamp(Number(building.h) || 8.5, 3, 24);
  buildings.push({
    id: String(building.id),
    kind: building.kind || 'yes',
    name: building.name || '',
    x: round(center.x),
    z: round(center.z),
    h: round(height),
    area: round(finalArea),
    landmark,
    poly: flat(poly)
  });
}

/* The Palazzo Comunale is an unnamed footprint near the actual town hall
   POI. The manifest's "comunale" point is stale, so use the OSM POI. */
const comunalePoint = { x: 20.4, z: -68.6 };
let best = null;
let bestDistance = Infinity;
for (const building of buildings) {
  if (building.area < 300) continue;
  const distance = Math.hypot(building.x - comunalePoint.x, building.z - comunalePoint.z);
  if (distance < bestDistance) {
    best = building;
    bestDistance = distance;
  }
}
if (best && bestDistance < 30) best.landmark = 'comunale';

const ROAD_KINDS = new Set([
  'primary',
  'secondary',
  'tertiary',
  'residential',
  'living_street',
  'pedestrian',
  'footway',
  'cycleway',
  'service',
  'unclassified',
  'primary_link',
  'secondary_link',
  'tertiary_link'
]);

function clipRuns(points) {
  const runs = [];
  let run = [];
  for (const [x, z] of points) {
    const p = { x, z };
    if (insideView(p)) {
      run.push([round(x), round(z)]);
    } else if (run.length) {
      if (run.length >= 2) runs.push(run);
      run = [];
    }
  }
  if (run.length >= 2) runs.push(run);
  return runs.filter((pointsRun) => {
    let length = 0;
    for (let i = 1; i < pointsRun.length; i++) {
      length += Math.hypot(pointsRun[i][0] - pointsRun[i - 1][0], pointsRun[i][1] - pointsRun[i - 1][1]);
    }
    return length >= 5;
  });
}

const roads = [];
for (const road of city.roads) {
  if (!ROAD_KINDS.has(road.kind)) continue;
  if (!Array.isArray(road.pts) || road.pts.length < 2) continue;
  const runs = clipRuns(road.pts);
  for (const [runIndex, run] of runs.entries()) {
    roads.push({
      id: `${road.id}${runIndex ? `-${runIndex}` : ''}`,
      kind: road.kind,
      name: road.name || '',
      w: round(clamp(Number(road.w) || (road.kind === 'footway' ? 2.1 : 5), 1.4, 14), 1),
      pts: flat(run)
    });
  }
}

const railways = [];
for (const railway of city.railways || []) {
  if (!Array.isArray(railway.pts) || railway.pts.length < 2) continue;
  for (const run of clipRuns(railway.pts)) {
    railways.push({
      id: String(railway.id),
      name: railway.name || '',
      pts: flat(run)
    });
  }
}

const WATER_KINDS = new Set(['stream', 'ditch', 'river', 'canal']);
const WATER_WIDTHS = {
  'Torrente Stirone': 18,
  'Torrente Rovacchia': 8,
  stream: 3.5,
  ditch: 2.2,
  river: 8,
  canal: 4
};
const waterways = [];
for (const water of city.waterways || []) {
  if (!WATER_KINDS.has(water.kind)) continue;
  if (!Array.isArray(water.pts) || water.pts.length < 2) continue;
  const runs = clipRuns(water.pts);
  for (const [runIndex, run] of runs.entries()) {
    waterways.push({
      id: `${water.id}${runIndex ? `-${runIndex}` : ''}`,
      kind: water.kind,
      name: water.name || '',
      w: WATER_WIDTHS[water.name] ?? WATER_WIDTHS[water.kind] ?? 3,
      pts: flat(run)
    });
  }
}

const AREA_COLORS = {
  park: 0x74844e,
  grass: 0x7f8a54,
  forest: 0x627244,
  urban: 0xb9aa8d,
  parking: 0x6f6b62,
  square: 0xc7b693,
  sport: 0xa77f61,
  school: 0xb8ab90,
  water: 0x6f9fae,
  platform: 0xb9a885,
  cemetery: 0x8a8a6f,
  farmland: 0x9b9a63,
  industrial: 0x8b8373,
  hospital: 0xb9aa8d
};

const AREA_KINDS = new Set(Object.keys(AREA_COLORS));
const areas = [];
for (const area of city.areas) {
  if (!AREA_KINDS.has(area.kind)) continue;
  const raw = area.poly;
  if (!Array.isArray(raw) || raw.length < 3) continue;
  const box = bboxOf(raw);
  if (!intersects(box, VIEW)) continue;
  const center = area.x != null && area.z != null ? { x: area.x, z: area.z } : centroid(raw);
  if (!insideView(center)) continue;
  if ((area.area || shoelace(raw)) < 80) continue;
  const poly = cleanPoly(raw, 0.6);
  if (poly.length < 3) continue;
  areas.push({
    id: String(area.id),
    kind: area.kind,
    name: area.name || '',
    color: AREA_COLORS[area.kind],
    poly: flat(poly)
  });
}

const trees = city.trees
  .filter((tree) => insideView({ x: tree.x, z: tree.z }))
  .map((tree) => ({
    x: round(tree.x),
    z: round(tree.z),
    h: round(clamp(Number(tree.height) || 7, 3, 18)),
    leaf: tree.leaf || ''
  }));

const furniture = (city.streetFurniture || [])
  .filter((item) => insidePlayable({ x: item.x, z: item.z }))
  .map((item) => ({ type: item.type, x: round(item.x), z: round(item.z) }));

const places = (manifest.places || [])
  .map((place) => {
    const point = project(place.lat, place.lon);
    return {
      id: place.id,
      name: place.name,
      category: place.category,
      x: round(point.x),
      z: round(point.z),
      radius: place.radius || 8
    };
  })
  .filter((place) => insideView(place));

/* Correct two stale manifest coordinates using the OSM POI / square. */
const comunale = places.find((place) => place.id === 'comunale');
if (comunale) {
  comunale.x = 20.4;
  comunale.z = -68.6;
}
const obelisco = places.find((place) => place.id === 'obelisco');
if (obelisco) {
  obelisco.x = 10;
  obelisco.z = -25;
}

const bounds = bboxOf(buildings.map((b) => [b.x, b.z]));
const output = {
  meta: {
    id: 'fidenza-nord-sud',
    name: 'Fidenza — centro, quartieri, Le Azalee, il sud e il nord agrario',
    source: 'OpenStreetMap via Overpass (snapshot fidenza-city-v3)',
    attribution: '© OpenStreetMap contributors (ODbL 1.0)',
    license: 'ODbL-1.0',
    generated: new Date().toISOString().slice(0, 10),
    origin,
    bounds: PLAY_BOUNDS,
    view: VIEW,
    counts: {
      buildings: buildings.length,
      roads: roads.length,
      areas: areas.length,
      trees: trees.length,
      furniture: furniture.length,
      places: places.length,
      railways: railways.length,
      waterways: waterways.length
    }
  },
  bounds,
  buildings,
  roads,
  areas,
  waterways,
  railways,
  trees,
  furniture,
  places
};

mkdirSync(dirname(outFile), { recursive: true });
writeFileSync(outFile, JSON.stringify(output));
console.log(
  `wrote ${outFile}: ${buildings.length} buildings, ${roads.length} road runs, ${areas.length} areas, ${trees.length} trees, ${places.length} places, ${waterways.length} waterway runs`
);
