#!/usr/bin/env node
/**
 * Fidenza da Giocare v2.10 — audit insegne POI
 *
 * Verifica quali attività commerciali possono ricevere un'insegna sulla
 * facciata e produce data/poi-sign-audit.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { planPoiSigns } from '../js/poi-signs.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const city = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'city.json'), 'utf8'));
const plan = planPoiSigns(city);
const report = {
  generated: new Date().toISOString(),
  summary: plan.totals,
  signs: plan.signs.map(s => ({
    poi: s.poi.id,
    name: s.poi.name,
    subtype: s.poi.subtype,
    building: s.building.id,
    x: s.x,
    y: s.y,
    z: s.z,
    width: s.width,
    awning: s.awning
  })),
  skipped: plan.skipped.map(s => ({
    poi: s.poi.id,
    name: s.poi.name || '',
    subtype: s.poi.subtype,
    reason: s.reason
  }))
};
fs.writeFileSync(path.join(ROOT, 'data', 'poi-sign-audit.json'), JSON.stringify(report, null, 2) + '\n');
console.log(`✓ insegne POI: ${plan.totals.signs} piazzate · ${plan.totals.skipped} scartate`);
const reasons = {};
for (const s of plan.skipped) reasons[s.reason] = (reasons[s.reason] || 0) + 1;
console.log('  motivi:', reasons);
console.log('  report: data/poi-sign-audit.json');
