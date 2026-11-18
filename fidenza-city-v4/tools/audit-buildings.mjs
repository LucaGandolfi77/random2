#!/usr/bin/env node
/**
 * Fidenza da Giocare v2.9 — audit edifici e tetti
 *
 * Classifica tutte le footprint con la stessa logica usata dal mondo 3D,
 * evidenzia casi sospetti e produce data/building-audit.json.
 */
import fs from 'node:fs';
import path from 'node:path';
import { classifyBuildingRoof, polygonArea } from '../js/building-geometry.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const CITY = path.join(ROOT, 'data', 'city.json');
const OUT = path.join(ROOT, 'data', 'building-audit.json');

const city = JSON.parse(fs.readFileSync(CITY, 'utf8'));
const buildings = city.buildings || [];
const items = [];
const byStyle = { flat: 0, gabled: 0, hipped: 0 };
const byKind = {};
const issues = [];

for (const b of buildings) {
  const info = classifyBuildingRoof(b);
  byStyle[info.style] = (byStyle[info.style] || 0) + 1;
  byKind[b.kind || 'yes'] = (byKind[b.kind || 'yes'] || 0) + 1;
  const flags = [];
  if (info.style === 'gabled' && info.rectangularity < 0.7) flags.push('gabled-irregular');
  if (info.style === 'hipped' && !info.convex) flags.push('hipped-concave');
  if (info.rectangularity < 0.55) flags.push('footprint-irregular');
  if (info.ridgeHeight > 6) flags.push('ridge-too-high');
  if (info.style === 'flat' && info.explicit && info.explicit !== 'flat') flags.push('explicit-roof-overridden');
  if (info.style !== 'flat' && info.explicit === 'flat') flags.push('flat-explicit');
  const item = {
    id: b.id,
    kind: b.kind,
    name: b.name || '',
    h: b.h,
    area: +polygonArea(b.poly).toFixed(1),
    explicit: info.explicit,
    style: info.style,
    rectangularity: info.rectangularity,
    convex: info.convex,
    span: info.span,
    length: info.length,
    ridgeHeight: info.ridgeHeight,
    flags
  };
  items.push(item);
  if (flags.length) issues.push(item);
}

const report = {
  generated: new Date().toISOString(),
  source: 'data/city.json',
  summary: {
    buildings: buildings.length,
    styles: byStyle,
    explicitRoofShapes: items.filter(i => i.explicit).length,
    irregularFootprints: items.filter(i => i.rectangularity < 0.55).length,
    issues: issues.length
  },
  kinds: byKind,
  issues: issues.slice(0, 300),
  items
};

fs.writeFileSync(OUT, JSON.stringify(report, null, 2) + '\n');
console.log(`✓ audit edifici: ${buildings.length} edifici`);
console.log(`  tetti: ${byStyle.flat} piatti · ${byStyle.gabled} a falde · ${byStyle.hipped} a padiglione`);
console.log(`  roof:shape espliciti: ${report.summary.explicitRoofShapes}`);
console.log(`  footprint irregolari: ${report.summary.irregularFootprints}`);
console.log(`  segnalazioni: ${report.summary.issues}`);
console.log(`  report: ${path.relative(ROOT, OUT)}`);
