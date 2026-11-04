#!/usr/bin/env node
/**
 * Fidenza da Giocare v2 — POI audit
 *
 * Confronta i POI del manifest con le feature OpenStreetMap indicate dal
 * campo "osm" e produce data/poi-audit.json.
 *
 * Uso: node tools/audit-pois.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const getArg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const MAP = path.resolve(ROOT, getArg('--map', 'maps/fidenza/map.json'));
const OUT = path.join(ROOT, 'data', 'poi-audit.json');

function haversine(a, b) {
  const R = 6371000;
  const dLat = (b.lat - a.lat) * Math.PI / 180;
  const dLon = (b.lon - a.lon) * Math.PI / 180;
  const la1 = a.lat * Math.PI / 180;
  const la2 = b.lat * Math.PI / 180;
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function buildQuery(places) {
  const groups = { node: [], way: [], relation: [] };
  for (const p of places) {
    if (!p.osm) continue;
    const [type, id] = p.osm.split('/');
    if (groups[type] && id) groups[type].push(id);
  }
  const parts = [];
  if (groups.node.length) parts.push(`node(id:${groups.node.join(',')});`);
  if (groups.way.length) parts.push(`way(id:${groups.way.join(',')});`);
  if (groups.relation.length) parts.push(`relation(id:${groups.relation.join(',')});`);
  return `[out:json][timeout:90];(${parts.join('')});out tags center meta;`;
}

async function overpass(query) {
  const endpoints = [
    'https://overpass-api.de/api/interpreter',
    'https://overpass.kumi.systems/api/interpreter',
    'https://overpass.private.coffee/api/interpreter'
  ];
  let last;
  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded', 'User-Agent': 'fidenza-v2-poi-audit/1.0' },
        body: new URLSearchParams({ data: query }),
        signal: AbortSignal.timeout(90000)
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (err) {
      last = err;
      console.warn(`  Overpass ${url}: ${err.message}`);
    }
  }
  throw last;
}

async function main() {
  if (!fs.existsSync(MAP)) {
    console.error('Manifest non trovato:', MAP);
    process.exit(1);
  }
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const places = map.places || [];
  const withOsm = places.filter(p => p.osm);
  console.log(`Verifico ${withOsm.length} POI su ${places.length}…`);
  const json = await overpass(buildQuery(withOsm));
  const byOsm = new Map();
  for (const e of json.elements || []) {
    const lat = e.lat ?? e.center?.lat;
    const lon = e.lon ?? e.center?.lon;
    if (Number.isFinite(lat) && Number.isFinite(lon)) byOsm.set(`${e.type}/${e.id}`, { lat, lon, tags: e.tags || {} });
  }

  const report = [];
  for (const p of places) {
    const row = { id: p.id, name: p.name, osm: p.osm || null, ok: true, distance: null, osmName: null, note: '', info: '' };
    if (!p.osm) {
      row.note = 'nessun ID OSM';
    } else {
      const hit = byOsm.get(p.osm);
      if (!hit) {
        row.ok = false;
        row.note = 'feature OSM non trovata';
      } else {
        row.osmName = hit.tags.name || '';
        row.distance = +haversine({ lat: p.lat, lon: p.lon }, hit).toFixed(1);
        if (p.linear) {
          row.info = 'feature lineare: distanza dal centro non significativa';
        } else if (row.distance > 80) {
          row.ok = false;
          row.note = `coordinata troppo lontana (${row.distance} m)`;
        } else if (row.distance > 25) {
          row.note = `distanza da verificare (${row.distance} m)`;
        }
        const aliases = (p.aliases || []).map(a => a.toLowerCase());
        const osmName = (hit.tags.name || '').toLowerCase();
        const nameMatches = !hit.tags.name || p.name.toLowerCase().includes(osmName.split('(')[0].trim().slice(0, 8)) || aliases.some(a => osmName.includes(a.toLowerCase().split('(')[0].trim().slice(0, 8)));
        if (!nameMatches) {
          row.note = row.note || `nome OSM: ${hit.tags.name}`;
        }
      }
    }
    if (p.beacon && (p.beacon.x < -2000 || p.beacon.x > 2500 || p.beacon.z < -2000 || p.beacon.z > 2500)) {
      row.ok = false;
      row.note = row.note || 'beacon fuori dall’area giocabile';
    }
    report.push(row);
  }

  const errors = report.filter(r => !r.ok);
  const warnings = report.filter(r => r.ok && r.note);
  const out = {
    generated: new Date().toISOString(),
    source: 'OpenStreetMap via Overpass',
    totals: { places: places.length, checked: withOsm.length, errors: errors.length, warnings: warnings.length },
    rows: report
  };
  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  fs.writeFileSync(OUT, JSON.stringify(out, null, 2));

  console.log(`\n${'ID'.padEnd(24)} ${'DIST'.padEnd(8)} ESITO`);
  for (const r of report) {
    const status = r.ok ? (r.note ? '⚠' : '✓') : '✗';
    console.log(`${r.id.padEnd(24)} ${String(r.distance ?? '—').padEnd(8)} ${status} ${r.note || r.info || ''}`);
  }
  console.log(`\nErrori: ${errors.length} · Avvisi: ${warnings.length}`);
  console.log(`Report: ${path.relative(ROOT, OUT)}`);
  if (errors.length) process.exitCode = 2;
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
