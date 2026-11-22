#!/usr/bin/env node
/**
 * Audit quote e posizioni di monumenti, piazze e suolo.
 *
 * Per ogni landmark/place/facciata confronta:
 *  - coordinate compilate (x, z) e GPS (lat, lon);
 *  - quota reale del terreno AWS/EU-DEM (m s.l.m.);
 *  - quota del suolo di gioco usata da player, landmark e facciate;
 *  - posizione OSM (way/node/relation) e scarto dal centroide dell'edificio;
 *  - eventuale scostamento del beacon rispetto al place.
 *
 * Uso:
 *   node tools/audit-monuments-ground.mjs
 *   node tools/audit-monuments-ground.mjs --out data/monument-ground-audit.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { WORLD, VERSION } from '../js/config.js';
import {
  groundHeightAt, terrainHeightAt, flatZoneInfo, projectLatLon, unproject
} from '../js/utils.js';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const OUT = path.resolve(ROOT, getArg('--out', 'data/monument-ground-audit.json'));

const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'map.json'), 'utf8'));
const source = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', 'fidenza', 'map.json'), 'utf8'));
const city = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'city.json'), 'utf8'));
const terrain = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'terrain.json'), 'utf8'));
const facadePath = path.join(ROOT, 'data', 'facades.json');
const facades = fs.existsSync(facadePath) ? JSON.parse(fs.readFileSync(facadePath, 'utf8')) : [];

const places = map.places || [];
const landmarks = map.landmarks || [];
const sourcePlaces = source.places || [];
const buildings = city.buildings || [];

const placeById = new Map(places.map(p => [p.id, p]));
const sourceById = new Map(sourcePlaces.map(p => [p.id, p]));
const buildingById = new Map(buildings.map(b => [String(b.id), b]));

const round = (v, digits = 2) => Number.isFinite(v) ? +v.toFixed(digits) : null;

function nearestBuilding(x, z) {
  let best = null;
  for (const b of buildings) {
    const d = Math.hypot(b.x - x, b.z - z);
    if (!best || d < best.distance) best = { building: b, distance: d };
  }
  return best;
}

function osmBuildingFor(place) {
  const osm = String(place?.osm || '');
  const [, id] = osm.split('/');
  if (!id) return null;
  return buildingById.get(String(id)) || null;
}

function describeBuilding(b) {
  if (!b) return null;
  return {
    id: b.id,
    name: b.name || '',
    kind: b.kind || '',
    x: round(b.x),
    z: round(b.z),
    height: round(b.h)
  };
}

function auditPlace(place) {
  const x = Number(place.x);
  const z = Number(place.z);
  const real = terrainHeightAt(terrain, x, z);
  const ground = groundHeightAt(terrain, x, z, 0);
  const flat = flatZoneInfo(x, z);
  const gps = unproject(x, z);
  const sourcePlace = sourceById.get(place.id);
  let sourceDrift = null;
  if (sourcePlace && Number.isFinite(sourcePlace.lat) && Number.isFinite(sourcePlace.lon)) {
    const projected = projectLatLon(sourcePlace.lat, sourcePlace.lon);
    sourceDrift = Math.hypot(projected.x - x, projected.z - z);
  }
  const osmBuilding = osmBuildingFor(place);
  const nearest = nearestBuilding(x, z);
  // Un edificio OSM è il riferimento migliore. Per chiese, musei, teatri e
  // uffici accettiamo anche l'edificio più vicino; per piazze, parchi e
  // monumenti isolati il centroide di un edificio vicino sarebbe fuorviante.
  const builtCategories = new Set(['church', 'museum', 'theatre', 'civic', 'station', 'school', 'hospital']);
  const reference = osmBuilding
    ? { building: osmBuilding, distance: Math.hypot(osmBuilding.x - x, osmBuilding.z - z), source: 'osm' }
    : (builtCategories.has(place.category) && nearest && nearest.distance < 45)
      ? { ...nearest, source: 'nearest' }
      : null;
  const beaconDrift = Number.isFinite(place.beaconX) && Number.isFinite(place.beaconZ)
    ? Math.hypot(place.beaconX - x, place.beaconZ - z)
    : null;
  const notes = [];
  if (!Number.isFinite(x) || !Number.isFinite(z)) notes.push('coordinate non finite');
  if (!Number.isFinite(real)) notes.push('quota terreno non disponibile');
  if (sourceDrift != null && sourceDrift > 1) notes.push(`GPS/compilato scostato di ${sourceDrift.toFixed(1)} m`);
  if (reference?.source === 'nearest' && reference.distance > 40) {
    notes.push(`nessun edificio OSM vicino (${reference.distance.toFixed(0)} m)`);
  }
  if (beaconDrift != null && beaconDrift > 40) notes.push(`beacon scostato di ${beaconDrift.toFixed(1)} m`);
  if (!flat.inside && Math.abs(ground) > 0.05) notes.push('fuori area piatta: landmark deve usare groundHeightAt');
  return {
    id: place.id,
    name: place.name || place.short || place.id,
    category: place.category || '',
    osm: place.osm || '',
    lat: round(place.lat, 7),
    lon: round(place.lon, 7),
    gps: { lat: round(gps.lat, 7), lon: round(gps.lon, 7) },
    x: round(x),
    z: round(z),
    realAltitude: round(real, 1),
    groundY: round(ground, 3),
    flatZone: flat.inside,
    sourceDrift: round(sourceDrift),
    beaconDrift: round(beaconDrift),
    reference: reference ? { source: reference.source, distance: round(reference.distance), building: describeBuilding(reference.building) } : null,
    notes
  };
}

const landmarkRows = landmarks.map(l => {
  const place = placeById.get(l.placeId || l.place);
  const base = place ? auditPlace(place) : null;
  const x = Number(l.x) + (Number(l.offsetX) || 0);
  const z = Number(l.z) + (Number(l.offsetZ) || 0);
  const real = terrainHeightAt(terrain, x, z);
  const ground = groundHeightAt(terrain, x, z, 0);
  const notes = base ? [...base.notes] : ['place mancante'];
  if (!base) {
    notes.push('landmark senza place: impossibile confrontare il GPS');
  } else {
    const drift = Math.hypot(x - base.x, z - base.z);
    if (drift > 0.5) notes.push(`offset landmark ${drift.toFixed(1)} m dal place`);
  }
  return {
    id: l.id,
    name: base?.name || l.name || l.id,
    model: l.model || l.type || '',
    placeId: l.placeId || l.place || null,
    x: round(x),
    z: round(z),
    realAltitude: round(real, 1),
    groundY: round(ground, 3),
    groupY: round(ground, 3),
    offsetX: round(Number(l.offsetX) || 0),
    offsetZ: round(Number(l.offsetZ) || 0),
    reference: base?.reference || null,
    notes
  };
});

const facadeRows = facades.map(f => {
  const x = Number(f.x);
  const z = Number(f.z);
  const real = terrainHeightAt(terrain, x, z);
  const ground = groundHeightAt(terrain, x, z, 0);
  const nearest = nearestBuilding(x, z);
  const notes = [];
  if (!Number.isFinite(x) || !Number.isFinite(z)) notes.push('coordinate non finite');
  if (nearest && nearest.distance > 35) notes.push(`facciata lontana ${nearest.distance.toFixed(0)} m dall'edificio più vicino`);
  return {
    id: f.id,
    name: f.name || f.id,
    x: round(x),
    z: round(z),
    realAltitude: round(real, 1),
    groundY: round(ground, 3),
    nearestBuilding: describeBuilding(nearest?.building),
    distance: round(nearest?.distance),
    notes
  };
});

const warnings = [...landmarkRows, ...facadeRows].filter(row => row.notes.length > 0);
const errors = landmarkRows.filter(row => !Number.isFinite(row.x) || !Number.isFinite(row.z) ||
  !Number.isFinite(row.realAltitude) || !Number.isFinite(row.groundY));

const report = {
  generated: new Date().toISOString(),
  version: VERSION,
  origin: WORLD.origin,
  terrain: {
    provider: terrain.meta?.provider || null,
    grid: terrain.meta?.grid || null,
    bounds: terrain.meta?.bounds || null,
    min: terrain.meta?.min ?? null,
    max: terrain.meta?.max ?? null,
    mean: terrain.meta?.mean ?? null
  },
  summary: {
    places: places.length,
    landmarks: landmarkRows.length,
    facades: facadeRows.length,
    warnings: warnings.length,
    errors: errors.length
  },
  landmarks: landmarkRows,
  places: places.map(auditPlace),
  facades: facadeRows
};
fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, `${JSON.stringify(report, null, 2)}\n`);

const pad = (v, n) => String(v ?? '—').padEnd(n).slice(0, n);
console.log('Monumento / place            x        z      quota reale  suolo gioco  riferimento OSM        scarto   note');
for (const row of landmarkRows) {
  const ref = row.reference?.building
    ? `${row.reference.building.kind || 'edificio'}#${row.reference.building.id}`
    : '—';
  console.log(
    `${pad(row.name, 28)} ${pad(row.x, 8)} ${pad(row.z, 8)} ${pad(row.realAltitude, 12)} ${pad(row.groundY, 12)} ${pad(ref, 22)} ${pad(row.reference?.distance, 7)} ${row.notes.join('; ')}`
  );
}
console.log('\nFacciate fotografiche:');
for (const row of facadeRows) {
  console.log(`  ${pad(row.name, 28)} (${row.x}, ${row.z}) quota ${row.realAltitude} m s.l.m. · suolo ${row.groundY} m${row.notes.length ? ` · ${row.notes.join('; ')}` : ''}`);
}
console.log(`\n${warnings.length ? '⚠' : '✓'} audit quote/posizioni: ${warnings.length} avvisi, ${errors.length} errori`);
console.log(`  place: ${places.length} · landmark: ${landmarkRows.length} · facciate: ${facadeRows.length}`);
console.log(`  terreno: ${terrain.meta?.provider || '?'} · griglia ${terrain.meta?.grid || '?'} · ${terrain.meta?.min ?? '?'}–${terrain.meta?.max ?? '?'} m s.l.m.`);
console.log(`  report: ${path.relative(ROOT, OUT)}`);
if (errors.length) process.exitCode = 1;
