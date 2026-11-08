#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const MAP_FILE = path.join(ROOT, 'maps/fidenza/map.json');
const OUT = path.join(ROOT, 'data/osm-roads.json');
const args = process.argv.slice(2);
const outArg = args.indexOf('--out');
const target = outArg >= 0 ? path.resolve(ROOT, args[outArg + 1]) : OUT;
const refresh = args.includes('--refresh');

const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
const bbox = map.bbox;
const endpoints = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
  'https://overpass.private.coffee/api/interpreter'
];

if (fs.existsSync(target) && !refresh) {
  const existing = JSON.parse(fs.readFileSync(target, 'utf8'));
  console.log(`↺ uso snapshot ${path.relative(ROOT, target)} (${existing.elements?.length || 0} way)`);
  process.exit(0);
}

function query() {
  const b = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return `[out:json][timeout:180];
way["highway"](${b});
out tags geom;`;
}

async function fetchRoads() {
  let lastError;
  for (const endpoint of endpoints) {
    try {
      console.log(`↓ scarico strade OSM da ${endpoint}`);
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'FidenzaDaGiocare/0.1 (open-data city game; contact: local)'
        },
        body: new URLSearchParams({ data: query() }),
        signal: AbortSignal.timeout(180000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      if (!Array.isArray(json.elements) || !json.elements.length) throw new Error('risposta Overpass vuota');
      return json;
    } catch (error) {
      lastError = error;
      console.warn(`  ✗ ${error.message}`);
    }
  }
  throw new Error(`Overpass non raggiungibile: ${lastError?.message}`);
}

const raw = await fetchRoads();
const roads = raw.elements.filter(el => el.type === 'way' && el.tags?.highway && Array.isArray(el.geometry));
const output = {
  version: 1,
  generated: new Date().toISOString(),
  source: 'OpenStreetMap via Overpass API',
  attribution: '© OpenStreetMap contributors (ODbL)',
  bbox,
  elements: roads.map(el => ({
    id: el.id,
    geometry: el.geometry.map(p => ({ lat: p.lat, lon: p.lon })),
    tags: el.tags
  }))
};
fs.mkdirSync(path.dirname(target), { recursive: true });
fs.writeFileSync(target, JSON.stringify(output));
console.log(`✓ ${roads.length} strade OSM → ${path.relative(ROOT, target)} (${(fs.statSync(target).size / 1e6).toFixed(2)} MB)`);
