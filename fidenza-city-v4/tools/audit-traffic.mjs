#!/usr/bin/env node
/**
 * Fidenza da Giocare v2.13 — audit del traffico ambientale
 *
 * Verifica che le auto vengano pianificate solo su strade primary/secondary/
 * tertiary, che i conteggi per qualità siano rispettati e che le strade
 * pedonali, ciclabili e residenziali non ricevano traffico.
 */
import fs from 'node:fs';
import path from 'node:path';
import {
  FORBIDDEN_TRAFFIC_KINDS,
  TRAFFIC_COUNTS,
  TRAFFIC_ROAD_KINDS,
  eligibleTrafficRoads,
  planTraffic,
  summarizeTraffic
} from '../js/traffic.js';
import { seededRandom } from '../js/utils.js';

const ROOT = path.resolve(import.meta.dirname, '..');
const city = JSON.parse(fs.readFileSync(path.join(ROOT, 'data', 'city.json'), 'utf8'));

const roadCounts = {};
for (const road of city.roads || []) {
  roadCounts[road.kind] = (roadCounts[road.kind] || 0) + 1;
}

const eligible = eligibleTrafficRoads(city);
const eligibleByKind = {};
for (const kind of TRAFFIC_ROAD_KINDS) {
  eligibleByKind[kind] = eligible.filter(road => road.kind === kind).length;
}

const runs = {};
let errors = 0;
for (const quality of ['low', 'medium', 'high']) {
  const plans = planTraffic(city, quality, seededRandom(77));
  const summary = summarizeTraffic(plans);
  const expected = TRAFFIC_COUNTS[quality];
  const forbidden = plans.filter(plan => !TRAFFIC_ROAD_KINDS.includes(plan.kind));
  if (forbidden.length) errors++;
  if (summary.total !== expected.total) errors++;
  for (const kind of TRAFFIC_ROAD_KINDS) {
    if (summary.byKind[kind] !== expected[kind]) errors++;
  }
  runs[quality] = {
    expected,
    actual: summary,
    forbidden: forbidden.length,
    plans: plans.map(plan => ({ roadId: plan.roadId, kind: plan.kind, speed: +plan.speed.toFixed(2) }))
  };
}

const forbiddenRoads = (city.roads || [])
  .filter(road => FORBIDDEN_TRAFFIC_KINDS.includes(road.kind))
  .reduce((acc, road) => {
    acc[road.kind] = (acc[road.kind] || 0) + 1;
    return acc;
  }, {});

const report = {
  generated: new Date().toISOString(),
  counts: TRAFFIC_COUNTS,
  allowedKinds: TRAFFIC_ROAD_KINDS,
  forbiddenKinds: FORBIDDEN_TRAFFIC_KINDS,
  roadCounts,
  eligibleByKind,
  forbiddenRoads,
  runs,
  errors
};

fs.writeFileSync(path.join(ROOT, 'data', 'traffic-audit.json'), JSON.stringify(report, null, 2) + '\n');

console.log(`✓ audit traffico: ${errors} errori`);
for (const quality of ['low', 'medium', 'high']) {
  const run = runs[quality];
  console.log(`  ${quality}: ${run.actual.total} auto · ${TRAFFIC_ROAD_KINDS.map(k => `${k} ${run.actual.byKind[k]}`).join(' · ')}`);
}
console.log(`  strade eleggibili: ${TRAFFIC_ROAD_KINDS.map(k => `${k} ${eligibleByKind[k]}`).join(' · ')}`);
console.log('  report: data/traffic-audit.json');
if (errors) process.exitCode = 1;
