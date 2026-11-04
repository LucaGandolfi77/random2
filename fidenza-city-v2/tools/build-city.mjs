#!/usr/bin/env node
/**
 * Fidenza da Giocare — city data builder
 *
 * Scarica una volta sola i dati OpenStreetMap per il centro di Fidenza e li
 * trasforma in un file compatto usato dal gioco. I dati derivati restano
 * soggetti a ODbL (© OpenStreetMap contributors).
 *
 * Uso: node tools/build-city.mjs [--refresh]
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, '.cache');
const DATA = path.join(ROOT, 'data');

const args = process.argv.slice(2);
const getArg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const MAP_FILE = path.resolve(ROOT, getArg('--map', 'maps/fidenza/map.json'));
const mapConfig = fs.existsSync(MAP_FILE) ? JSON.parse(fs.readFileSync(MAP_FILE, 'utf8')) : null;
const MAP_ID = mapConfig?.id || 'fidenza';
const RAW = path.join(CACHE, `osm-${MAP_ID}.json`);
const OUT = path.resolve(ROOT, getArg('--out', 'data/city.json'));

const BBOX = mapConfig?.bbox || { south: 44.8500, west: 10.0400, north: 44.8820, east: 10.0850 };
const ORIGIN = mapConfig?.origin || mapConfig?.center || { lat: 44.8665, lon: 10.0612 };
const M_LAT = 111132.0;
const M_LON = 111320.0 * Math.cos(ORIGIN.lat * Math.PI / 180);

fs.mkdirSync(CACHE, { recursive: true });
fs.mkdirSync(DATA, { recursive: true });

const refresh = process.argv.includes('--refresh');

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

function overpassQuery() {
  const b = `${BBOX.south},${BBOX.west},${BBOX.north},${BBOX.east}`;
  return `[out:json][timeout:180];
(
  way["building"](${b});
  way["highway"](${b});
  way["waterway"](${b});
  way["natural"="water"](${b});
  way["natural"="wood"](${b});
  way["leisure"~"park|garden|playground|pitch|sports_centre|common|swimming_pool"](${b});
  way["landuse"~"grass|meadow|forest|farmland|cemetery|industrial|residential|commercial|retail|orchard|vineyard"](${b});
  way["place"~"square|neighbourhood"](${b});
  way["amenity"~"parking|school|hospital|marketplace|townhall|theatre|place_of_worship|fuel|pharmacy|bank|restaurant|cafe|bar"](${b});
  way["railway"~"rail|light_rail|narrow_gauge|platform|station"](${b});
  way["tourism"](${b});
  way["historic"](${b});
  node["tourism"](${b});
  node["historic"](${b});
  node["amenity"~"place_of_worship|townhall|theatre|hospital|marketplace|fuel|pharmacy|bank|restaurant|cafe|bar|school|police"](${b});
  node["railway"="station"](${b});
  relation["natural"="water"](${b});
  relation["waterway"="riverbank"](${b});
  relation["leisure"~"park|garden|playground|pitch|sports_centre|common"](${b});
  relation["landuse"~"grass|meadow|forest|farmland|cemetery|industrial|residential|commercial|retail"](${b});
);
out geom;`;
}

async function fetchRaw() {
  if (fs.existsSync(RAW) && !refresh) {
    const stat = fs.statSync(RAW);
    if (stat.size > 100000) {
      console.log(`↺ uso cache OSM (${(stat.size / 1e6).toFixed(1)} MB)`);
      return JSON.parse(fs.readFileSync(RAW, 'utf8'));
    }
  }
  const body = new URLSearchParams({ data: overpassQuery() });
  let lastErr;
  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`↓ scarico OpenStreetMap da ${endpoint}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FidenzaDaGiocare/0.1 (open-data city game; contact: local)'
        },
        body,
        signal: AbortSignal.timeout(180000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.elements) throw new Error('risposta Overpass senza elements');
      fs.writeFileSync(RAW, JSON.stringify(json));
      console.log(`✓ ${json.elements.length} elementi OSM salvati`);
      return json;
    } catch (err) {
      lastErr = err;
      console.warn(`  ✗ ${err.message}`);
    }
  }
  throw new Error(`Overpass non raggiungibile: ${lastErr?.message}`);
}

function project(lat, lon) {
  return [
    +( (lon - ORIGIN.lon) * M_LON ).toFixed(2),
    +( -(lat - ORIGIN.lat) * M_LAT ).toFixed(2)
  ];
}

function ringFromGeometry(geometry) {
  if (!Array.isArray(geometry) || geometry.length < 3) return null;
  const pts = [];
  for (const p of geometry) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
    const xy = project(p.lat, p.lon);
    const last = pts[pts.length - 1];
    if (!last || last[0] !== xy[0] || last[1] !== xy[1]) pts.push(xy);
  }
  if (pts.length < 3) return null;
  if (pts[0][0] === pts[pts.length - 1][0] && pts[0][1] === pts[pts.length - 1][1]) pts.pop();
  return pts.length >= 3 ? pts : null;
}

function lineFromGeometry(geometry) {
  if (!Array.isArray(geometry) || geometry.length < 2) return null;
  const pts = [];
  for (const p of geometry) {
    if (!Number.isFinite(p.lat) || !Number.isFinite(p.lon)) continue;
    const xy = project(p.lat, p.lon);
    const last = pts[pts.length - 1];
    if (!last || Math.hypot(last[0] - xy[0], last[1] - xy[1]) > 0.05) pts.push(xy);
  }
  return pts.length >= 2 ? pts : null;
}

function perpDistance(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len = Math.hypot(dx, dz);
  if (len < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  return Math.abs((p[0] - a[0]) * dz - (p[1] - a[1]) * dx) / len;
}

function simplify(points, tolerance = 0.8) {
  if (points.length <= 4) return points;
  const keep = new Uint8Array(points.length);
  keep[0] = keep[points.length - 1] = 1;
  const stack = [[0, points.length - 1]];
  while (stack.length) {
    const [first, last] = stack.pop();
    let maxDist = 0, index = -1;
    for (let i = first + 1; i < last; i++) {
      const d = perpDistance(points[i], points[first], points[last]);
      if (d > maxDist) { maxDist = d; index = i; }
    }
    if (maxDist > tolerance && index !== -1) {
      keep[index] = 1;
      stack.push([first, index], [index, last]);
    }
  }
  return points.filter((_, i) => keep[i]);
}

function polygonArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(a) / 2;
}

function polygonCentroid(poly) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    a += f;
    cx += (poly[j][0] + poly[i][0]) * f;
    cz += (poly[j][1] + poly[i][1]) * f;
  }
  if (Math.abs(a) < 1e-6) {
    return [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  }
  return [cx / (3 * a), cz / (3 * a)];
}

function hashInt(n) {
  let x = n | 0;
  x = Math.imul(x ^ (x >>> 16), 0x7feb352d);
  x = Math.imul(x ^ (x >>> 15), 0x846ca68b);
  return (x ^ (x >>> 16)) >>> 0;
}

function parseNumber(value) {
  if (value == null) return NaN;
  const m = String(value).replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : NaN;
}

const BUILDING_DEFAULTS = {
  cathedral: 24, church: 18, chapel: 11, monastery: 14, convent: 14,
  apartments: 15, terrace: 10, residential: 11, house: 8, detached: 8,
  semidetached_house: 8, bungalow: 6, villa: 9, farm: 7,
  commercial: 10, retail: 9, office: 12, hotel: 14,
  industrial: 9, warehouse: 8, factory: 10, workshop: 6,
  school: 11, university: 13, hospital: 14, civic: 11, public: 10,
  government: 12, townhall: 13, museum: 11, theatre: 13, cinema: 10,
  garage: 3.2, garages: 3.2, carport: 3, shed: 2.8, hut: 3, roof: 3,
  service: 4, yes: 9, train_station: 9, transportation: 9
};

const BUILDING_COLORS = [
  '#e9dfcd', '#e4d5bd', '#dcc7aa', '#d3b596', '#cba184',
  '#e7e0d2', '#d8cfbf', '#c4b29b', '#bfa88e', '#d9c9b2',
  '#e6d2b4', '#d7b894', '#c98f6f', '#e3c9a3', '#ccaa82'
];
const SPECIAL_COLORS = {
  cathedral: '#d9c6a3', church: '#d7c6a8', chapel: '#d7c6a8',
  monastery: '#d2c1a5', convent: '#d2c1a5', theatre: '#d8c2a2',
  townhall: '#d9c5a5', government: '#d6c3a7', museum: '#d8c7ad',
  industrial: '#9b9d99', warehouse: '#a3a4a0', factory: '#969a97',
  garage: '#aaa49a', garages: '#aaa49a', shed: '#a8a096', roof: '#9c958b',
  school: '#c9bda9', hospital: '#d7d2c7', commercial: '#cfc5b5', retail: '#d3c6b2'
};

function buildingHeight(tags, kind, id) {
  let h = parseNumber(tags.height);
  if (!Number.isFinite(h) || h <= 0) {
    const levels = parseNumber(tags['building:levels']);
    if (Number.isFinite(levels) && levels > 0) h = levels * 3.15 + 0.8;
  }
  if (!Number.isFinite(h) || h <= 0) h = BUILDING_DEFAULTS[kind] ?? 8;
  const jitter = 0.92 + (hashInt(id) % 17) / 100;
  return +Math.max(2.4, Math.min(48, h * jitter)).toFixed(2);
}

function buildingColor(kind, id) {
  if (SPECIAL_COLORS[kind]) return SPECIAL_COLORS[kind];
  return BUILDING_COLORS[hashInt(id) % BUILDING_COLORS.length];
}

const ROAD_WIDTHS = {
  motorway: 14, motorway_link: 7, trunk: 13, trunk_link: 7,
  primary: 10, primary_link: 5.5, secondary: 8.5, secondary_link: 5,
  tertiary: 7, tertiary_link: 4.5, unclassified: 5.5, residential: 6,
  living_street: 5, service: 4, pedestrian: 6, footway: 2.1,
  path: 1.9, cycleway: 2.4, track: 3, steps: 2.2
};
const WALKABLE = new Set(['footway', 'path', 'pedestrian', 'living_street', 'residential', 'service', 'cycleway', 'unclassified', 'track']);

const AREA_KINDS = {
  park: 'park', garden: 'park', playground: 'park', pitch: 'sport', sports_centre: 'sport',
  common: 'park', swimming_pool: 'water',
  grass: 'grass', meadow: 'grass', forest: 'forest', wood: 'forest',
  farmland: 'farmland', orchard: 'farmland', vineyard: 'farmland',
  cemetery: 'cemetery', industrial: 'industrial', residential: 'urban',
  commercial: 'urban', retail: 'urban',
  water: 'water', riverbank: 'water', reservoir: 'water',
  square: 'square', parking: 'parking', school: 'school', hospital: 'hospital',
  marketplace: 'square', platform: 'platform'
};

function areaKind(tags) {
  if (tags.leisure && AREA_KINDS[tags.leisure]) return AREA_KINDS[tags.leisure];
  if (tags.landuse && AREA_KINDS[tags.landuse]) return AREA_KINDS[tags.landuse];
  if (tags.natural && AREA_KINDS[tags.natural]) return AREA_KINDS[tags.natural];
  if (tags.waterway && AREA_KINDS[tags.waterway]) return AREA_KINDS[tags.waterway];
  if (tags.place && AREA_KINDS[tags.place]) return AREA_KINDS[tags.place];
  if (tags.amenity && AREA_KINDS[tags.amenity]) return AREA_KINDS[tags.amenity];
  if (tags.railway && AREA_KINDS[tags.railway]) return AREA_KINDS[tags.railway];
  return null;
}

function addPolygon(list, el, kind, name) {
  if (el.type === 'way') {
    const poly = ringFromGeometry(el.geometry);
    if (!poly) return;
    const simplified = simplify(poly, kind === 'urban' ? 1.2 : 0.9);
    if (simplified.length < 3) return;
    const area = polygonArea(simplified);
    if (area < 25) return;
    const c = polygonCentroid(simplified);
    list.push({ id: el.id, kind, name: name || '', poly: simplified, area: +area.toFixed(1), x: +c[0].toFixed(1), z: +c[1].toFixed(1) });
  } else if (el.type === 'relation' && Array.isArray(el.members)) {
    for (const m of el.members) {
      if (m.type !== 'way' || (m.role && m.role !== 'outer')) continue;
      const poly = ringFromGeometry(m.geometry);
      if (!poly) continue;
      const simplified = simplify(poly, 0.9);
      if (simplified.length < 3) continue;
      const area = polygonArea(simplified);
      if (area < 25) continue;
      const c = polygonCentroid(simplified);
      list.push({ id: el.id, kind, name: name || '', poly: simplified, area: +area.toFixed(1), x: +c[0].toFixed(1), z: +c[1].toFixed(1) });
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

function build() {
  const raw = JSON.parse(fs.readFileSync(RAW, 'utf8'));
  const elements = raw.elements || [];

  const buildings = [];
  const roads = [];
  const areas = [];
  const waterways = [];
  const railways = [];
  const pois = [];
  const seenPoi = new Set();

  for (const el of elements) {
    const tags = el.tags || {};

    // Edifici
    if (el.type === 'way' && tags.building && tags.building !== 'no' && tags['building:part'] !== 'yes') {
      const poly = ringFromGeometry(el.geometry);
      if (!poly) continue;
      const simplified = simplify(poly, 0.45);
      if (simplified.length < 3 || polygonArea(simplified) < 12) continue;
      const kind = tags.building === 'yes' ? (tags['building:levels'] ? 'residential' : 'yes') : tags.building;
      const c = polygonCentroid(simplified);
      buildings.push({
        id: el.id,
        kind,
        name: tags.name || '',
        h: buildingHeight(tags, kind, el.id),
        levels: parseNumber(tags['building:levels']) || 0,
        roofShape: tags['roof:shape'] || '',
        roofHeight: parseNumber(tags['roof:height']) || 0,
        addr: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
        color: buildingColor(kind, el.id),
        poly: simplified,
        x: +c[0].toFixed(1),
        z: +c[1].toFixed(1),
        area: +polygonArea(simplified).toFixed(1)
      });
      continue;
    }

    // Strade
    if (el.type === 'way' && tags.highway) {
      const kind = tags.highway;
      const w = ROAD_WIDTHS[kind];
      if (!w) continue;
      if (tags.area === 'yes') continue;
      const pts = lineFromGeometry(el.geometry);
      if (!pts) continue;
      const simplified = simplify(pts, 0.65);
      if (simplified.length < 2) continue;
      let length = 0;
      for (let i = 1; i < simplified.length; i++) length += Math.hypot(simplified[i][0] - simplified[i - 1][0], simplified[i][1] - simplified[i - 1][1]);
      if (length < 1.5) continue;
      roads.push({
        id: el.id,
        kind,
        name: tags.name || '',
        w,
        pts: simplified,
        length: +length.toFixed(1),
        bridge: tags.bridge && tags.bridge !== 'no',
        tunnel: tags.tunnel && tags.tunnel !== 'no',
        oneway: tags.oneway === 'yes' || tags.oneway === '1' || tags.junction === 'roundabout',
        surface: tags.surface || ''
      });
      continue;
    }

    // Aree
    const kind = areaKind(tags);
    if (kind && (el.type === 'way' || el.type === 'relation')) {
      addPolygon(areas, el, kind, tags.name || '');
    }

    // Corsi d'acqua lineari
    if (el.type === 'way' && tags.waterway && !['riverbank', 'dock'].includes(tags.waterway)) {
      const pts = lineFromGeometry(el.geometry);
      if (pts && pts.length >= 2) {
        waterways.push({ id: el.id, kind: tags.waterway, name: tags.name || '', pts: simplify(pts, 1.2) });
      }
    }

    // Ferrovia
    if (el.type === 'way' && ['rail', 'light_rail', 'narrow_gauge'].includes(tags.railway)) {
      const pts = lineFromGeometry(el.geometry);
      if (pts && pts.length >= 2) {
        railways.push({ id: el.id, kind: tags.railway, name: tags.name || '', pts: simplify(pts, 1.0) });
      }
    }

    // POI
    const poiKind = tags.tourism ? 'tourism' : tags.historic ? 'historic' : tags.amenity ? 'amenity' : tags.railway === 'station' ? 'railway' : null;
    if (poiKind && tags.name && !seenPoi.has(tags.name)) {
      let position = null;
      if (el.type === 'node' && Number.isFinite(el.lat) && Number.isFinite(el.lon)) {
        position = project(el.lat, el.lon);
      } else if (el.center && Number.isFinite(el.center.lat)) {
        position = project(el.center.lat, el.center.lon);
      } else if (el.geometry) {
        const poly = ringFromGeometry(el.geometry);
        if (poly) position = polygonCentroid(poly);
      }
      if (position) {
        seenPoi.add(tags.name);
        pois.push({
          id: el.id,
          name: tags.name,
          kind: poiKind,
          subtype: tags.tourism || tags.historic || tags.amenity || tags.railway || '',
          x: +position[0].toFixed(1),
          z: +position[1].toFixed(1),
          tags: Object.fromEntries(['tourism','historic','amenity','railway','shop','leisure','religion','denomination','cuisine'].filter(k => tags[k]).map(k => [k, tags[k]]))
        });
      }
    }
  }

  // Deduplica gli elementi relation ripetuti
  const uniqAreas = [];
  const seenArea = new Set();
  for (const a of areas) {
    const key = `${a.kind}:${a.id}:${Math.round(a.area)}:${a.x}:${a.z}`;
    if (seenArea.has(key)) continue;
    seenArea.add(key);
    uniqAreas.push(a);
  }

  // Stelle: punti pedonabili, distanziati, distribuiti nel centro.
  const walkable = roads.filter(r => WALKABLE.has(r.kind) && r.kind !== 'track');
  const candidates = [];
  for (const r of walkable) {
    const step = 14;
    let carry = 0;
    for (let i = 1; i < r.pts.length; i++) {
      const [x1, z1] = r.pts[i - 1], [x2, z2] = r.pts[i];
      const dx = x2 - x1, dz = z2 - z1, len = Math.hypot(dx, dz);
      if (len < 0.1) continue;
      for (let d = carry; d < len; d += step) {
        const t = d / len;
        const x = x1 + dx * t, z = z1 + dz * t;
        if (Math.hypot(x, z) > 1650) continue;
        if (buildings.some(b => pointInPoly(x, z, b.poly))) continue;
        candidates.push([+x.toFixed(1), +z.toFixed(1), r.name || r.kind]);
      }
      carry = (carry + len) % step;
    }
  }

  function seededRandom(seed) {
    let s = seed >>> 0;
    return () => {
      s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
      return s / 4294967296;
    };
  }
  const rnd = seededRandom(0xF1DE27A);
  const shuffled = candidates
    .map(p => [rnd(), p])
    .sort((a, b) => a[0] - b[0])
    .map(p => p[1]);

  const stars = [];
  const minDistances = [95, 75, 55, 38, 24];
  for (const minDist of minDistances) {
    for (const p of shuffled) {
      if (stars.length >= 27) break;
      if (stars.some(s => Math.hypot(s.x - p[0], s.z - p[1]) < minDist)) continue;
      stars.push({ x: p[0], z: p[1], zone: p[2] || '' });
    }
    if (stars.length >= 27) break;
  }
  // Se ancora pochi, aggiungi punti lungo le strade pedonali con distanza ridotta.
  if (stars.length < 27) {
    for (const p of shuffled) {
      if (stars.length >= 27) break;
      if (stars.some(s => Math.hypot(s.x - p[0], s.z - p[1]) < 12)) continue;
      stars.push({ x: p[0], z: p[1], zone: p[2] || '' });
    }
  }

  const xs = buildings.flatMap(b => b.poly.map(p => p[0]));
  const zs = buildings.flatMap(b => b.poly.map(p => p[1]));
  const bounds = {
    minX: +Math.min(...xs).toFixed(1),
    maxX: +Math.max(...xs).toFixed(1),
    minZ: +Math.min(...zs).toFixed(1),
    maxZ: +Math.max(...zs).toFixed(1)
  };

  const out = {
    meta: {
      name: 'Fidenza',
      region: 'Emilia-Romagna',
      country: 'Italia',
      generated: new Date().toISOString(),
      origin: ORIGIN,
      bbox: BBOX,
      bounds,
      counts: {
        buildings: buildings.length,
        roads: roads.length,
        areas: uniqAreas.length,
        waterways: waterways.length,
        railways: railways.length,
        pois: pois.length,
        stars: stars.length
      },
      attribution: {
        map: '© OpenStreetMap contributors (ODbL)',
        terrain: 'Terrain Tiles (Mapzen, EU-DEM Copernicus)',
        region: '© Regione Emilia-Romagna'
      }
    },
    buildings,
    roads,
    areas: uniqAreas,
    waterways,
    railways,
    pois,
    stars
  };

  fs.writeFileSync(OUT, JSON.stringify(out));
  const size = fs.statSync(OUT).size;
  console.log('✓ city.json creato');
  console.log(`  edifici: ${buildings.length}`);
  console.log(`  strade: ${roads.length}`);
  console.log(`  aree: ${uniqAreas.length}`);
  console.log(`  corsi d'acqua: ${waterways.length}`);
  console.log(`  ferrovie: ${railways.length}`);
  console.log(`  POI: ${pois.length}`);
  console.log(`  stelle: ${stars.length}`);
  console.log(`  dimensione: ${(size / 1e6).toFixed(2)} MB`);
  console.log(`  hash: ${crypto.createHash('sha1').update(fs.readFileSync(OUT)).digest('hex').slice(0, 12)}`);
}

await fetchRaw();
build();
