#!/usr/bin/env node
/**
 * Fidenza da Giocare — dettagli del centro storico
 *
 * Aggiunge a data/city.json i micro-elementi OSM del centro: negozi, arredo
 * urbano, alberi singoli, barriere e segnaletica. Non rigenera edifici,
 * strade o aree, quindi non altera la mappa già pubblicata.
 *
 * Uso:
 *   node tools/build-center-details.mjs
 *   node tools/build-center-details.mjs --refresh
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const ROOT = path.resolve(import.meta.dirname, '..');
const CACHE = path.join(ROOT, '.cache');
const DATA = path.join(ROOT, 'data', 'city.json');
const RAW = path.join(CACHE, 'osm-center-details.json');
const DETAILS_BBOX = { south: 44.8590, west: 10.0470, north: 44.8740, east: 10.0685 };
const REFRESH = process.argv.includes('--refresh');
const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

const city = JSON.parse(fs.readFileSync(DATA, 'utf8'));
const ORIGIN = city.meta.origin;
const M_LAT = 111132.0;
const M_LON = 111320.0 * Math.cos(ORIGIN.lat * Math.PI / 180);

const round = (v, digits = 2) => +Number(v).toFixed(digits);

function project(lat, lon) {
  return [
    round((lon - ORIGIN.lon) * M_LON),
    round(-(lat - ORIGIN.lat) * M_LAT)
  ];
}

function wayPoints(geometry) {
  if (!Array.isArray(geometry)) return [];
  return geometry
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon))
    .map(p => project(p.lat, p.lon));
}

function averagePoint(pts) {
  if (!pts.length) return null;
  const x = pts.reduce((sum, p) => sum + p[0], 0) / pts.length;
  const z = pts.reduce((sum, p) => sum + p[1], 0) / pts.length;
  return [round(x), round(z)];
}

function elementPoint(el) {
  if (el.type === 'node') {
    if (!Number.isFinite(el.lat) || !Number.isFinite(el.lon)) return null;
    return project(el.lat, el.lon);
  }
  const pts = wayPoints(el.geometry);
  return averagePoint(pts);
}

function fetchQuery() {
  const b = `${DETAILS_BBOX.south},${DETAILS_BBOX.west},${DETAILS_BBOX.north},${DETAILS_BBOX.east}`;
  const parts = [];
  const add = (selector) => parts.push(`${selector}(${b});`);
  add('node["shop"]');
  add('way["shop"]');
  add('node["amenity"~"bench|waste_basket|bicycle_parking|drinking_water|fountain|post_box|recycling|toilets|clock|bus_station|taxi|marketplace|shelter"]');
  add('way["amenity"~"bench|waste_basket|bicycle_parking|drinking_water|fountain|post_box|recycling|toilets|clock|bus_station|taxi|marketplace|shelter"]');
  add('node["highway"~"bus_stop|street_lamp|speed_camera|give_way|stop"]');
  add('way["highway"~"bus_stop|street_lamp"]');
  add('node["railway"~"level_crossing|signal|platform|halt|tram_stop"]');
  add('way["railway"="platform"]');
  add('node["natural"="tree"]');
  add('way["barrier"~"hedge|fence|wall|bollard|gate"]');
  add('node["barrier"~"bollard|gate"]');
  add('node["tourism"~"artwork|information|viewpoint"]');
  add('way["tourism"~"artwork|information|viewpoint"]');
  add('node["historic"~"memorial|monument|wayside_shrine"]');
  add('way["historic"~"memorial|monument|wayside_shrine"]');
  return `[out:json][timeout:240];\n(${parts.join('\n')}\n);\nout geom;`;
}

async function loadRaw() {
  if (!REFRESH && fs.existsSync(RAW) && fs.statSync(RAW).size > 1000) {
    console.log(`↺ uso cache dettagli centro (${(fs.statSync(RAW).size / 1e3).toFixed(0)} KB)`);
    return JSON.parse(fs.readFileSync(RAW, 'utf8'));
  }
  fs.mkdirSync(CACHE, { recursive: true });
  const body = new URLSearchParams({ data: fetchQuery() });
  let lastError;
  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`↓ scarico dettagli centro da ${endpoint}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FidenzaDaGiocare/0.1 (open-data city game; contact: local)'
        },
        body,
        signal: AbortSignal.timeout(280000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!json.elements?.length) throw new Error('risposta Overpass vuota');
      fs.writeFileSync(RAW, JSON.stringify(json));
      console.log(`✓ ${json.elements.length} elementi OSM del centro`);
      return json;
    } catch (error) {
      lastError = error;
      console.warn(`  ✗ ${error.message}`);
    }
  }
  throw new Error(`Overpass non raggiungibile: ${lastError?.message}`);
}

const SHOP_POI_TAGS = ['shop', 'opening_hours', 'wheelchair', 'outdoor_seating', 'cuisine', 'brand', 'operator'];
const FURNITURE_TAGS = ['amenity', 'highway', 'railway', 'tourism', 'historic', 'barrier', 'name', 'shelter', 'operator', 'network', 'ref', 'artwork_type', 'memorial', 'information'];
const FURNITURE_TYPES = new Set([
  'bench', 'waste_basket', 'bicycle_parking', 'drinking_water', 'fountain',
  'post_box', 'recycling', 'toilets', 'clock', 'bus_station', 'taxi',
  'marketplace', 'shelter', 'bus_stop', 'street_lamp', 'artwork',
  'information', 'viewpoint', 'memorial', 'monument', 'wayside_shrine'
]);
const BARRIER_TYPES = new Set(['hedge', 'fence', 'wall']);

function compactTags(tags, keys) {
  const out = {};
  for (const key of keys) if (tags[key] != null && tags[key] !== '') out[key] = tags[key];
  return out;
}

function stripEmpty(obj) {
  for (const key of Object.keys(obj)) if (obj[key] === '' || obj[key] == null) delete obj[key];
  return obj;
}

function build(raw) {
  const elements = raw.elements || [];
  const shops = [];
  const furniture = [];
  const trees = [];
  const barriers = [];
  const roadSigns = [];
  const seenFurniture = new Set();
  const seenTrees = new Set();

  function addFurniture(el, type, point, extra = {}) {
    if (!point) return;
    const key = `${type}:${point[0]}:${point[1]}`;
    if (seenFurniture.has(key)) return;
    seenFurniture.add(key);
    furniture.push(stripEmpty({
      id: `sf-${type}-${el.type}-${el.id}`,
      type,
      x: point[0],
      z: point[1],
      ...compactTags(el.tags || {}, FURNITURE_TAGS),
      ...extra
    }));
  }

  for (const el of elements) {
    const tags = el.tags || {};
    if (!Object.keys(tags).length) continue;

    // Negozi: vanno nei POI, così il pianificatore insegne li usa già.
    if (tags.shop) {
      const point = elementPoint(el);
      if (point) {
        shops.push(stripEmpty({
          id: `shop-${el.type}-${el.id}`,
          name: tags.name || '',
          kind: 'shop',
          subtype: tags.shop,
          x: point[0],
          z: point[1],
          addr: [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' '),
          tags: compactTags(tags, SHOP_POI_TAGS)
        }));
      }
      continue;
    }

    // Alberi singoli.
    if (tags.natural === 'tree') {
      const point = elementPoint(el);
      if (point && !seenTrees.has(el.id)) {
        seenTrees.add(el.id);
        trees.push(stripEmpty({
          id: `tree-${el.id}`,
          x: point[0],
          z: point[1],
          height: Number(tags.height) || 0,
          leaf: tags.leaf_type || ''
        }));
      }
      continue;
    }

    // Barriere lineari: siepi, recinzioni, muri.
    if (tags.barrier && BARRIER_TYPES.has(tags.barrier) && el.type === 'way') {
      const pts = wayPoints(el.geometry);
      if (pts.length >= 2) {
        barriers.push({
          id: `barrier-${el.id}`,
          kind: tags.barrier,
          height: Number(tags.height) || 0,
          pts
        });
      }
      continue;
    }

    // Segnali stradali verticali.
    if (tags.highway === 'give_way' || tags.highway === 'stop') {
      const point = elementPoint(el);
      if (point) roadSigns.push({ id: `sign-${el.id}`, type: tags.highway, x: point[0], z: point[1] });
      continue;
    }

    // Arredo urbano e segnaletica minore.
    let type = null;
    if (tags.amenity && FURNITURE_TYPES.has(tags.amenity)) type = tags.amenity;
    else if (tags.highway && FURNITURE_TYPES.has(tags.highway)) type = tags.highway;
    else if (tags.railway === 'platform') type = 'platform';
    else if (tags.barrier === 'bollard') type = 'bollard';
    else if (tags.barrier === 'gate' || tags.barrier === 'lift_gate') type = 'gate';
    else if (tags.tourism && FURNITURE_TYPES.has(tags.tourism)) type = tags.tourism;
    else if (tags.historic && FURNITURE_TYPES.has(tags.historic)) type = tags.historic;

    if (type) {
      const point = elementPoint(el);
      const extra = {};
      if (type === 'bus_stop') {
        extra.bus = tags.bus === 'yes' || tags.public_transport === 'platform';
      }
      if (type === 'drinking_water' || type === 'fountain') {
        extra.fountain = tags.fountain || type;
      }
      addFurniture(el, type, point, extra);
    }
  }

  // POI: rimuove eventuali negozi da esecuzioni precedenti, poi aggiunge quelli nuovi.
  const existingPois = (city.pois || []).filter(p => p.kind !== 'shop');
  const seenPoi = new Set(existingPois.map(p => `${p.kind}:${p.name}:${p.x}:${p.z}`));
  const mergedShops = [];
  for (const shop of shops) {
    const key = `${shop.kind}:${shop.name}:${shop.x}:${shop.z}`;
    if (seenPoi.has(key)) continue;
    seenPoi.add(key);
    mergedShops.push(shop);
  }

  const out = {
    ...city,
    pois: [...existingPois, ...mergedShops],
    streetFurniture: furniture,
    trees,
    barriers,
    roadSigns,
    meta: {
      ...city.meta,
      counts: {
        ...city.meta.counts,
        pois: existingPois.length + mergedShops.length,
        shops: mergedShops.length,
        streetFurniture: furniture.length,
        trees: trees.length,
        barriers: barriers.length,
        roadSigns: roadSigns.length
      },
      centerDetails: {
        bbox: DETAILS_BBOX,
        generated: new Date().toISOString(),
        source: 'OpenStreetMap contributors — ODbL',
        counts: {
          shops: mergedShops.length,
          streetFurniture: furniture.length,
          trees: trees.length,
          barriers: barriers.length,
          roadSigns: roadSigns.length
        }
      }
    }
  };

  fs.writeFileSync(DATA, JSON.stringify(out));
  const size = fs.statSync(DATA).size;
  console.log('✓ dettagli centro aggiunti a city.json');
  console.log(`  negozi: ${mergedShops.length}`);
  console.log(`  arredo: ${furniture.length}`);
  console.log(`  alberi: ${trees.length}`);
  console.log(`  barriere: ${barriers.length}`);
  console.log(`  segnali stradali: ${roadSigns.length}`);
  console.log(`  dimensione: ${(size / 1e6).toFixed(2)} MB`);
  console.log(`  hash: ${crypto.createHash('sha1').update(fs.readFileSync(DATA)).digest('hex').slice(0, 12)}`);
}

build(await loadRaw());
