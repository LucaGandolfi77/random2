#!/usr/bin/env node
/**
 * Fidenza da Giocare v2.18 — audit altezze e facciate
 *
 * Controlla che le altezze siano plausibili, che i piani siano coerenti e
 * mostra quante altezze vengono da tag OSM, da building:levels o da inferenza.
 */
import fs from 'node:fs';
import path from 'node:path';
import { WORLD } from '../js/config.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const city = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'city.json'), 'utf8'));
const buildings = city.buildings || [];

const counts = {
  total: buildings.length,
  bySource: {},
  byStyle: {},
  byKind: {}
};
const heights = [];
const outliers = [];

for (const building of buildings) {
  const source = building.heightSource || 'inferred';
  counts.bySource[source] = (counts.bySource[source] || 0) + 1;
  counts.byStyle[building.facadeStyle || 'urban'] = (counts.byStyle[building.facadeStyle || 'urban'] || 0) + 1;
  counts.byKind[building.kind || 'yes'] = (counts.byKind[building.kind || 'yes'] || 0) + 1;
  heights.push(building.h);
  if (!Number.isFinite(building.h) || building.h < 2.4 || building.h > 48) {
    outliers.push({ id: building.id, reason: 'altezza fuori scala', h: building.h });
  } else if (building.facadeStyle === 'rural' && building.h > 14) {
    outliers.push({ id: building.id, reason: 'casa rurale troppo alta', h: building.h, style: building.facadeStyle });
  } else if (building.facadeStyle === 'industrial' && building.h > 24) {
    outliers.push({ id: building.id, reason: 'capannone troppo alto', h: building.h, style: building.facadeStyle });
  }
}

const sum = heights.reduce((total, height) => total + height, 0);
const report = {
  generated: new Date().toISOString(),
  counts,
  heights: {
    min: +Math.min(...heights).toFixed(2),
    max: +Math.max(...heights).toFixed(2),
    mean: +(sum / Math.max(1, heights.length)).toFixed(2)
  },
  explicit: {
    height: counts.bySource.height || 0,
    levels: counts.bySource.levels || 0,
    inferred: counts.bySource.inferred || 0,
    lidar: counts.bySource.lidar || 0
  },
  outliers,
  bounds: WORLD.bounds
};

fs.writeFileSync(path.join(ROOT, 'data', 'building-height-audit.json'), JSON.stringify(report, null, 2) + '\n');

console.log(`✓ audit altezze: ${outliers.length} anomalie`);
console.log(`  edifici: ${counts.total} · altezza ${report.heights.min}–${report.heights.max} m · media ${report.heights.mean} m`);
console.log(`  fonti: height ${report.explicit.height} · levels ${report.explicit.levels} · lidar ${report.explicit.lidar} · inferred ${report.explicit.inferred}`);
console.log(`  stili: ${Object.entries(counts.byStyle).map(([key, value]) => `${key} ${value}`).join(' · ')}`);
for (const item of outliers.slice(0, 8)) console.log(`  ! ${item.id}: ${item.reason} (${item.h} m)`);
console.log('  report: data/building-height-audit.json');
if (outliers.length) process.exitCode = 1;
