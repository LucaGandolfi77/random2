#!/usr/bin/env node
/**
 * Fidenza da Giocare v2 — map importer
 *
 * Legge un manifest di mappa editabile, valida i riferimenti, compila il bundle
 * dati e copia gli stili stagionali.
 *
 * Uso:
 *   node tools/import-map.mjs
 *   node tools/import-map.mjs --map maps/fidenza/map.json --out data/map.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { compileMap } from '../js/map-compiler.js';

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
  for (const [groupId, group] of Object.entries(map.overrides || {})) {
    if (!['buildings', 'roads', 'areas', 'waterways', 'railways'].includes(groupId)) {
      console.warn(`  ! gruppo override sconosciuto: ${groupId}`);
    }
    if (!group || typeof group !== 'object') fail(`overrides.${groupId} deve essere un oggetto`);
  }
}

function main() {
  if (!fs.existsSync(MAP_FILE)) fail(`manifest non trovato: ${MAP_FILE}`);
  const map = JSON.parse(fs.readFileSync(MAP_FILE, 'utf8'));
  validate(map);

  const cityPath = path.resolve(ROOT, map.sources?.cityData || 'data/city.json');
  const city = fs.existsSync(cityPath) ? JSON.parse(fs.readFileSync(cityPath, 'utf8')) : null;
  const out = compileMap(map, city);

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
    const target = path.join(STYLE_DIR, `${id}.json`);
    fs.writeFileSync(target, JSON.stringify(style, null, 2));
    compiledSeasons.styles[id] = `data/styles/${id}.json`;
  }
  out.seasons = compiledSeasons;

  fs.mkdirSync(path.dirname(OUT_FILE), { recursive: true });
  fs.writeFileSync(OUT_FILE, JSON.stringify(out, null, 2));
  console.log('✓ map.json compilato');
  console.log(`  places: ${out.meta.counts.places} (${out.meta.counts.collectibles} collezionabili)`);
  console.log(`  landmarks: ${out.meta.counts.landmarks}`);
  console.log(`  missions: ${out.meta.counts.missions}`);
  console.log(`  stars: ${out.meta.counts.stars}`);
  console.log(`  vehicles: ${out.meta.counts.vehicles}`);
  console.log(`  overrides: ${Object.values(out.overrides || {}).reduce((n, g) => n + Object.keys(g || {}).length, 0)}`);
  console.log(`  seasons: ${Object.keys(compiledSeasons.styles).join(', ') || 'nessuna'}`);
  console.log(`  output: ${path.relative(ROOT, OUT_FILE)}`);
}

main();
