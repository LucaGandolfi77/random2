#!/usr/bin/env node
/**
 * Fidenza da Giocare v2 — map validator
 *
 * Applica gli override, ricompila la mappa e verifica POI, beacon, stelle,
 * veicoli, spawn e target delle missioni.
 *
 * Uso:
 *   node tools/validate-map.mjs
 *   node tools/validate-map.mjs --map maps/fidenza/map.json --city data/city.json
 */
import fs from 'node:fs';
import path from 'node:path';
import { validateMap } from '../js/map-validate.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const getArg = (name, fallback) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : fallback;
};
const MAP = path.resolve(ROOT, getArg('--map', 'maps/fidenza/map.json'));
const CITY = path.resolve(ROOT, getArg('--city', 'data/city.json'));
const OUT = path.resolve(ROOT, getArg('--out', 'data/map-validation.json'));

function main() {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const city = JSON.parse(fs.readFileSync(CITY, 'utf8'));
  const result = validateMap(map, city);

  const report = {
    generated: new Date().toISOString(),
    totals: result.totals,
    rows: result.rows
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Controlli: ${result.totals.checks} · Errori: ${result.totals.errors} · Override: ${result.totals.overrides} · Custom: ${result.totals.customFeatures || 0}`);
  for (const e of result.errors) console.log(`  ✗ ${e.kind} ${e.id}: ${e.msg}`);
  console.log(`Report: ${path.relative(ROOT, OUT)}`);
  if (result.errors.length) process.exitCode = 1;
}

main();
