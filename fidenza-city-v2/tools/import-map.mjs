#!/usr/bin/env node
/**
 * Fidenza da Giocare v2 — map importer
 *
 * Legge un manifest di mappa editabile (maps/<id>/map.json), calcola le
 * coordinate locali, valida i riferimenti e produce data/map.json + data/styles.
 *
 * Uso:
 *   node tools/import-map.mjs
 *   node tools/import-map.mjs --map maps/fidenza/map.json --out data/map.json
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const MAP_FILE = path.resolve(ROOT, getArg('--map', 'maps/fidenza/map.json'));
const OUT_FILE = path.resolve(ROOT, getArg('--out', 'data/map.json'));
const STYLE_DIR = path.join(ROOT, 'data', 'styles');

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

function project(lat, lon, origin) {
  const mPerDegLat = 111132.0;
  const mPerDegLon = 111320.0 * Math.cos(origin.lat * Math.PI / 180);
  return {
    x: +((lon - origin.lon) * mPerDegLon).toFixed(2),
    z: +(-(lat - origin.lat) * mPerDegLat).toFixed(2)
  };
}

function validate(map) {
  const required = ['id', 'name', 'bbox', 'center', 'places', 'landmarks'];
  for (const key of required) {
    if (!(key in map)) fail(`campo obbligatorio mancante: ${key}`);
  }
  if (!Array.isArray(map.places) || !map.places.length) fail('places deve essere un array non vuoto');
  if (!Array.isArray(map.landmarks)) fail('landmarks deve essere un array');
  const ids = new Set();
  for (const p of map.places) {
    if (!p.id) fail('place senza id');
    if (ids.has(p.id)) fail(`id duplicato: ${p.id}`);
    ids.add(p.id);
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) fail(`coordinate non valide per ${p.id}`);
    if (p.lat < map.bbox.south || p.lat > map.bbox.north || p.lon < map.bbox.west || p.lon > map.bbox.east) {
      console.warn(`  ! ${p.id} è fuori dal bbox della mappa`);
    }
  }
  for (const l of map.landmarks) {
    if (!l.id) fail('landmark senza id');
    if (l.place && !ids.has(l.place)) fail(`landmark ${l.id}: place sconosciuto ${l.place}`);
  }
  const missionIds = new Set();
  for (const m of map.missions || []) {
    if (!m.id) fail('missione senza id');
    if (missionIds.has(m.id)) fail(`missione duplicata: ${m.id}`);
    missionIds.add(m.id);
    for (const s of m.steps || []) {
      if (s.place && !ids.has(s.place)) fail(`missione ${m.id}: place sconosciuto ${s.place}`);
    }
  }
}


function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}
function distToPoly(x, z, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], az = poly[j][1], bx = poly[i][0], bz = poly[i][1];
    const dx = bx - ax, dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}
function makeFreeTest(city) {
  const buildings = city?.buildings || [];
  return (x, z, r = 0.5) => !buildings.some(b => pointInPoly(x, z, b.poly) || distToPoly(x, z, b.poly) < r);
}
function makeRoadPoints(city) {
  const out = [];
  for (const r of city?.roads || []) {
    for (const p of r.pts) out.push({ x: p[0], z: p[1] });
  }
  return out;
}
function findSpot(place, free, roadPoints) {
  if (place.beacon && free(place.beacon.x, place.beacon.z, 0.4)) return { x: +place.beacon.x.toFixed(2), z: +place.beacon.z.toFixed(2) };
  const category = place.category || '';
  if (['park', 'square', 'museum', 'nature'].includes(category) && free(place.x, place.z, 0.4)) {
    return { x: +place.x.toFixed(2), z: +place.z.toFixed(2) };
  }
  const candidates = [];
  for (const p of roadPoints) {
    const d = Math.hypot(p.x - place.x, p.z - place.z);
    if (d < 60) candidates.push({ ...p, d });
  }
  candidates.sort((a, b) => a.d - b.d);
  for (const p of candidates.slice(0, 120)) {
    if (free(p.x, p.z, 0.4)) return { x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
  }
  // fallback: spirale attorno al POI
  for (let r = 2; r <= 30; r += 2) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const x = place.x + Math.cos(a) * r;
      const z = place.z + Math.sin(a) * r;
      if (free(x, z, 0.4)) return { x: +x.toFixed(2), z: +z.toFixed(2) };
    }
  }
  return { x: +place.x.toFixed(2), z: +place.z.toFixed(2) };
}
function adjustMissionPoint(x, z, free) {
  if (free(x, z, 0.7)) return { x: +x.toFixed(2), z: +z.toFixed(2) };
  for (let r = 2; r <= 30; r += 2) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const nx = x + Math.cos(a) * r;
      const nz = z + Math.sin(a) * r;
      if (free(nx, nz, 0.7)) return { x: +nx.toFixed(2), z: +nz.toFixed(2) };
    }
  }
  return { x: +x.toFixed(2), z: +z.toFixed(2) };
}

function main() {
  if (!fs.existsSync(MAP_FILE)) fail(`manifest non trovato: ${MAP_FILE}`);
  const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
  validate(map);
  const cityPath = path.resolve(ROOT, map.sources?.cityData || 'data/city.json');
  const city = fs.existsSync(cityPath) ? JSON.parse(fs.readFileSync(cityPath, 'utf8')) : null;
  const free = makeFreeTest(city);
  const roadPoints = makeRoadPoints(city);

  const origin = map.origin || map.center;
  const places = map.places.map(p => {
    const xy = project(p.lat, p.lon, origin);
    const place = { ...p, x: xy.x, z: xy.z };
    const spot = findSpot(place, free, roadPoints);
    return {
      ...place,
      beaconX: spot.x,
      beaconZ: spot.z
    };
  });
  const byId = new Map(places.map(p => [p.id, p]));

  const landmarks = map.landmarks.map(l => {
    const place = byId.get(l.place);
    if (!place) fail(`landmark ${l.id}: place ${l.place} assente`);
    return {
      id: l.id,
      placeId: place.id,
      name: place.name,
      short: place.short || place.name,
      type: l.model || l.type,
      model: l.model || l.type,
      rotation: l.rotation || 0,
      x: place.x,
      z: place.z,
      lat: place.lat,
      lon: place.lon,
      radius: place.radius || 8,
      collectible: !!place.collectible,
      description: place.description || '',
      fact: place.fact || ''
    };
  });

  const missions = (map.missions || []).map(m => {
    const steps = (m.steps || []).map(s => {
      let x = s.x, z = s.z;
      if (s.place) {
        const p = byId.get(s.place);
        if (!p) fail(`missione ${m.id}: place ${s.place} assente`);
        const baseX = p.beaconX ?? p.x;
        const baseZ = p.beaconZ ?? p.z;
        x = +(baseX + (s.offsetX || 0)).toFixed(2);
        z = +(baseZ + (s.offsetZ || 0)).toFixed(2);
      }
      const adjusted = adjustMissionPoint(Number(x), Number(z), free);
      return {
        x: adjusted.x,
        z: adjusted.z,
        name: s.name || '',
        prompt: s.prompt || 'interagisci',
        radius: s.radius || 12,
        photo: !!s.photo,
        placeId: s.place || null
      };
    });
    return {
      id: m.id,
      type: m.type || m.id,
      title: m.title || m.id,
      short: m.short || '',
      time: m.time || 150,
      reward: m.reward || 500,
      chase: !!m.chase,
      steps
    };
  });

  // Stili stagionali: copia nel bundle dati e riscrivi i percorsi.
  fs.mkdirSync(STYLE_DIR, { recursive: true });
  const seasons = map.seasons || {};
  const compiledSeasons = { default: seasons.default || 'auto', styles: {} };
  for (const [id, rel] of Object.entries(seasons.styles || {})) {
    const src = path.resolve(ROOT, rel);
    if (!fs.existsSync(src)) {
      console.warn(`  ! stile stagionale mancante: ${rel}`);
      continue;
    }
    const style = JSON.parse(fs.readFileSync(src, 'utf8'));
    const out = path.join(STYLE_DIR, `${id}.json`);
    fs.writeFileSync(out, JSON.stringify(style, null, 2));
    compiledSeasons.styles[id] = `data/styles/${id}.json`;
  }

  const out = {
    meta: {
      id: map.id,
      name: map.name,
      version: map.version || '2.0.0',
      generated: new Date().toISOString(),
      center: map.center,
      origin,
      bbox: map.bbox,
      projection: map.projection || 'local-tangent',
      attribution: map.attribution || {},
      counts: {
        places: places.length,
        collectibles: places.filter(p => p.collectible).length,
        landmarks: landmarks.length,
        missions: missions.length
      }
    },
    places,
    landmarks,
    missions,
    seasons: compiledSeasons
  };

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log('✓ map.json compilato');
  console.log(`  places: ${out.meta.counts.places} (${out.meta.counts.collectibles} collezionabili)`);
  console.log(`  landmarks: ${out.meta.counts.landmarks}`);
  console.log(`  missions: ${out.meta.counts.missions}`);
  console.log(`  seasons: ${Object.keys(compiledSeasons.styles).join(', ') || 'nessuna'}`);
  console.log(`  output: ${path.relative(ROOT, OUT_FILE)}`);
}

main();
