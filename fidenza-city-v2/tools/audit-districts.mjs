#!/usr/bin/env node
/**
 * Fidenza da Giocare v2.13 — audit dei macro-quartieri
 *
 * Verifica che i confini Voronoi coprano l'area di gioco senza sovrapposizioni
 * e che il Bar Blu Piramide ricada nel quartiere Le Azalee.
 */
import fs from 'node:fs';
import path from 'node:path';
import { WORLD } from '../js/config.js';
import { buildDistricts, districtPointInPoly, getDistrictAt } from '../js/districts.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const map = JSON.parse(fs.readFileSync(path.join(ROOT, 'maps', 'fidenza', 'map.json'), 'utf8'));
const districts = buildDistricts(map.districts || [], WORLD.bounds);
const venues = map.venues || [];

let overlaps = 0;
let gaps = 0;
const step = 60;
let samples = 0;
for (let x = WORLD.bounds.minX + 17; x <= WORLD.bounds.maxX; x += step) {
  for (let z = WORLD.bounds.minZ + 17; z <= WORLD.bounds.maxZ; z += step) {
    samples++;
    let hits = 0;
    for (const district of districts) {
      if (districtPointInPoly(x, z, district.poly)) hits++;
    }
    if (hits > 1) overlaps++;
    if (hits === 0) gaps++;
  }
}

const venueChecks = venues.map(venue => {
  const district = getDistrictAt(districts, venue.x, venue.z);
  return {
    id: venue.id,
    name: venue.name,
    district: district?.id || null,
    expected: venue.id === 'bar-blu-piramide' ? 'azalee' : null
  };
});
const venueErrors = venueChecks.filter(v => v.expected && v.district !== v.expected);

const report = {
  generated: new Date().toISOString(),
  bounds: WORLD.bounds,
  districts: districts.map(d => ({
    id: d.id,
    name: d.name,
    center: { x: d.x, z: d.z },
    vertices: d.poly.length,
    color: d.color
  })),
  samples,
  overlaps,
  gaps,
  venues: venueChecks,
  errors: overlaps + gaps + venueErrors.length
};
fs.writeFileSync(path.join(ROOT, 'data', 'district-audit.json'), JSON.stringify(report, null, 2) + '\n');

console.log(`✓ audit quartieri: ${report.errors} errori`);
console.log(`  quartieri: ${districts.map(d => d.name).join(' · ')}`);
console.log(`  campioni: ${samples} · sovrapposizioni: ${overlaps} · vuoti: ${gaps}`);
for (const v of venueChecks) console.log(`  ${v.name}: ${v.district}`);
console.log('  report: data/district-audit.json');
if (report.errors) process.exitCode = 1;
