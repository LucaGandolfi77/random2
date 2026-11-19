#!/usr/bin/env node
/**
 * Refresh mirato dei tag OSM degli edifici per Fidenza v3.3.6.
 *
 * Scarica solo i tag `building`, `height`, `addr:*`, `building:colour`,
 * `roof:*` dall'area della mappa e aggiorna data/city.json IN LOCO,
 * preservando tutti gli altri livelli (Arnis, dettagli centro, POI, ecc.).
 *
 * Uso: node tools/refresh-osm-tags.mjs [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const CITY = path.join(ROOT, 'data/city.json');
const MAP = path.join(ROOT, 'maps/fidenza/map.json');
const BACKUP = path.join(ROOT, '.cache/city-before-osm-refresh.json');
const DRY = process.argv.includes('--dry-run');
const argValue = (name, fallback) => {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : fallback;
};
const LOCAL_OSM = argValue('--osm', null);

const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
const city = JSON.parse(fs.readFileSync(CITY, 'utf8'));
const bbox = map.bbox || { south: 44.85, west: 10.04, north: 44.882, east: 10.085 };
const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
const query = `[out:json][timeout:180];
(
  way["building"](${b});
  relation["building"](${b});
);
out tags;`;

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];
const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function fetchOsm() {
  if (LOCAL_OSM) {
    const elements = JSON.parse(fs.readFileSync(path.resolve(ROOT, LOCAL_OSM), 'utf8')).elements || [];
    console.log(`↺ uso cache OSM locale: ${LOCAL_OSM} (${elements.length} elementi)`);
    return elements;
  }
  let lastErr;
  for (const endpoint of ENDPOINTS) {
    try {
      console.log(`↓ Overpass: ${endpoint}`);
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FidenzaDaGiocare/3.3 (OSM tag refresh)'
        },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(180000)
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const json = await response.json();
      if (!json.elements?.length) throw new Error('risposta vuota');
      console.log(`✓ ${json.elements.length} edifici OSM`);
      return json.elements;
    } catch (err) {
      lastErr = err;
      console.warn(`  ✗ ${err.message}`);
      await sleep(2000);
    }
  }
  throw new Error(`Overpass non raggiungibile: ${lastErr?.message}`);
}

function parseHeight(value) {
  if (!value) return 0;
  const match = String(value).match(/\d+(?:[.,]\d+)?/);
  return match ? parseFloat(match[0].replace(',', '.')) : 0;
}

function parseLevels(value) {
  if (!value) return 0;
  const matches = String(value).match(/\d+(?:[.,]\d+)?/g);
  return matches ? Math.max(...matches.map(v => parseFloat(v.replace(',', '.')))) : 0;
}

const elements = await fetchOsm();
const tagsById = new Map();
for (const element of elements) tagsById.set(element.id, element.tags || {});

let updatedHeight = 0, updatedLevels = 0, updatedAddress = 0, updatedColors = 0, missing = 0;
for (const building of city.buildings || []) {
  const tags = tagsById.get(building.id);
  if (!tags) {
    missing++;
    continue;
  }
  const height = parseHeight(tags.height);
  if (height > 0 && Math.abs(height - building.h) > 0.05) {
    building.h = +height.toFixed(2);
    building.heightSource = 'height';
    updatedHeight++;
  } else {
    const levels = parseLevels(tags['building:levels']);
    if (levels > 0) {
      building.levels = +levels.toFixed(1);
      if (building.heightSource !== 'height' && !height) {
        building.h = +Math.max(2.4, levels * 3.15).toFixed(2);
        building.heightSource = 'levels';
        updatedLevels++;
      }
    }
  }
  const address = [tags['addr:street'], tags['addr:housenumber']].filter(Boolean).join(' ');
  if (address && address !== building.addr) {
    building.addr = address;
    updatedAddress++;
  }
  const wall = tags['building:colour'] || tags['building:color'] || '';
  const roof = tags['roof:colour'] || tags['roof:color'] || '';
  if (wall && wall !== building.wallColor) {
    building.wallColor = wall;
    building.color = wall;
    updatedColors++;
  }
  if (roof && roof !== building.roofColor) {
    building.roofColor = roof;
    updatedColors++;
  }
  const roofShape = (tags['roof:shape'] || '').toLowerCase();
  if (roofShape && roofShape !== building.roofShape) building.roofShape = roofShape;
}

console.log(`Aggiornati: altezze=${updatedHeight}, livelli=${updatedLevels}, indirizzi=${updatedAddress}, colori=${updatedColors}`);
console.log(`Edifici OSM non trovati in city.json: ${missing}`);

if (!DRY) {
  fs.mkdirSync(path.dirname(BACKUP), { recursive: true });
  fs.copyFileSync(CITY, BACKUP);
  fs.writeFileSync(CITY, JSON.stringify(city));
  console.log(`✓ data/city.json aggiornato (backup: ${path.relative(ROOT, BACKUP)})`);
  console.log('  Rigenera poi il bundle: node tools/import-map.mjs --map maps/fidenza/map.json --out data/map.json');
} else {
  console.log('Dry-run: nessun file scritto');
}
