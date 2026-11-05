#!/usr/bin/env node
/**
 * Fidenza da Giocare v2.9 — merge edifici da GeoJSON
 *
 * Importa footprints/altezze da fonti libere (DBTR Emilia-Romagna, Microsoft,
 * Overture, esportazioni GIS) e aggiorna data/city.json.
 *
 * Uso:
 *   node tools/merge-buildings.mjs --geojson edifici.geojson
 *   node tools/merge-buildings.mjs --geojson edifici.geojson --dry-run
 */
import fs from 'node:fs';
import path from 'node:path';
import { polygonArea, polygonCentroid } from '../js/building-geometry.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const getArg = (name, fallback = null) => {
  const i = args.indexOf(name);
  return i >= 0 && args[i + 1] ? args[i + 1] : fallback;
};
const has = name => args.includes(name);

const input = getArg('--geojson');
if (!input) {
  console.error('Uso: node tools/merge-buildings.mjs --geojson <file.geojson> [--out data/city.json] [--dry-run]');
  process.exit(1);
}
const cityPath = path.resolve(ROOT, getArg('--out', 'data/city.json'));
const city = JSON.parse(fs.readFileSync(cityPath, 'utf8'));
const geo = JSON.parse(fs.readFileSync(path.resolve(ROOT, input), 'utf8'));
const origin = city.meta?.origin || { lat: 44.8665, lon: 10.0612 };
const mPerDegLat = 111132.0;
const mPerDegLon = 111320.0 * Math.cos(origin.lat * Math.PI / 180);
const project = (lat, lon) => ({
  x: +((lon - origin.lon) * mPerDegLon).toFixed(2),
  z: +(-(lat - origin.lat) * mPerDegLat).toFixed(2)
});
const num = v => {
  const n = Number(String(v ?? '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)?.[0]);
  return Number.isFinite(n) ? n : null;
};
const colors = ['#e9dfcd', '#e4d5bd', '#dcc7aa', '#d3b596', '#cba184', '#e7e0d2', '#d8cfbf', '#c4b29b', '#bfa88e'];
const buildings = city.buildings || [];
const features = geo.type === 'FeatureCollection' ? geo.features || [] : [geo];
const dryRun = has('--dry-run');
let matched = 0;
let added = 0;
let skipped = 0;

function rings(feature) {
  const geom = feature.geometry || feature;
  if (!geom) return [];
  if (geom.type === 'Polygon') return [geom.coordinates?.[0]].filter(Boolean);
  if (geom.type === 'MultiPolygon') return (geom.coordinates || []).map(p => p?.[0]).filter(Boolean);
  return [];
}

for (let fi = 0; fi < features.length; fi++) {
  const feature = features[fi];
  const props = feature.properties || {};
  for (const ring of rings(feature)) {
    if (!Array.isArray(ring) || ring.length < 3) { skipped++; continue; }
    const poly = ring.map(([lon, lat]) => {
      const p = project(lat, lon);
      return [p.x, p.z];
    });
    if (poly.length > 1 && Math.hypot(poly[0][0] - poly[poly.length - 1][0], poly[0][1] - poly[poly.length - 1][1]) < 0.1) poly.pop();
    if (poly.length < 3) { skipped++; continue; }
    const centroid = polygonCentroid(poly);
    const area = polygonArea(poly);
    let nearest = null;
    for (const b of buildings) {
      const d = Math.hypot(b.x - centroid.x, b.z - centroid.z);
      if (!nearest || d < nearest.d) nearest = { b, d };
    }
    const height = num(props.height ?? props.h ?? props.H ?? props.altezza);
    const levels = num(props['building:levels'] ?? props.levels ?? props.LIVELLI);
    const roofShape = props['roof:shape'] ?? props.roofShape ?? props.tetto ?? '';
    const roofHeight = num(props['roof:height'] ?? props.roofHeight ?? props.altezza_tetto);
    if (nearest && nearest.d <= 12) {
      const b = nearest.b;
      if (height != null) b.h = height;
      if (levels != null) b.levels = levels;
      if (roofShape) b.roofShape = roofShape;
      if (roofHeight != null) b.roofHeight = roofHeight;
      if (props.name || props.nome) b.name = props.name || props.nome;
      matched++;
    } else {
      buildings.push({
        id: `import-${feature.id ?? fi}-${added}`,
        kind: props.building || props.kind || 'yes',
        name: props.name || props.nome || '',
        h: height ?? 8,
        levels: levels ?? 0,
        roofShape,
        roofHeight: roofHeight ?? 0,
        addr: props['addr:street'] || props.addr || '',
        color: colors[(fi + added) % colors.length],
        poly,
        x: +centroid.x.toFixed(1),
        z: +centroid.z.toFixed(1),
        area: +area.toFixed(1)
      });
      added++;
    }
  }
}

city.buildings = buildings;
city.meta.counts = { ...(city.meta.counts || {}), buildings: buildings.length };
city.meta.buildingsSource = propsSource(geo, input);
city.meta.updated = new Date().toISOString();
if (!dryRun) fs.writeFileSync(cityPath, JSON.stringify(city));
console.log(`✓ merge edifici: ${matched} aggiornati · ${added} aggiunti · ${skipped} scartati${dryRun ? ' (dry-run)' : ''}`);
console.log(`  output: ${path.relative(ROOT, cityPath)}`);

function propsSource(g, file) {
  return g.metadata?.source || g.source || file;
}
