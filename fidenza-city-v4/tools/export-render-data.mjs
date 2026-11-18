#!/usr/bin/env node
/**
 * Esporta la citta' "effettiva" usata dal gioco (override dell'editor + altezze
 * Arnis) in data/render-city.json, leggibile dallo script Blender.
 *
 * La logica rispecchia World.constructor (applyOverrides) e
 * World.applyArnisHeights() in js/world.js. Se quelle funzioni cambiano,
 * aggiornare anche qui e rigenerare il file.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { applyOverrides } from '../js/map-overrides.js';

const here = dirname(fileURLToPath(import.meta.url));
const root = resolve(here, '..');
const read = (rel) => JSON.parse(readFileSync(resolve(root, rel), 'utf8'));
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

const city = read('data/city.json');
const map = read('data/map.json');
const arnis = read('data/arnis/arnis.json');

const effective = applyOverrides(city, map.overrides || {}, map.custom || {});
const arnisBuildings = arnis?.buildings || {};
let withArnisHeight = 0;

for (const building of effective.buildings) {
  const info = arnisBuildings[String(building.id)];
  if (!info) continue;
  building.arnis = info;
  building.osmHeight = building.h;
  if (Number.isFinite(info.height)) {
    building.h = clamp(info.height, 3, 32);
    withArnisHeight++;
  }
}

const out = resolve(root, 'data/render-city.json');
writeFileSync(out, JSON.stringify(effective));
console.log(
  `render-city.json: ${effective.buildings.length} edifici, ` +
  `${effective.roads.length} strade, ${effective.areas.length} aree, ` +
  `${withArnisHeight} altezze da Arnis`
);
