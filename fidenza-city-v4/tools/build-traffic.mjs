#!/usr/bin/env node
/**
 * Fidenza da Giocare v2 — generatore semafori e attraversamenti
 *
 * Quando i dati OSM dei nodi traffic_signals/crossing non sono disponibili,
 * genera un set coerente di semafori sulle intersezioni principali e di
 * attraversamenti pedonali vicino ai luoghi del centro.
 *
 * Uso: node tools/build-traffic.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const FILE = path.join(ROOT, 'data', 'city.json');
const city = JSON.parse(fs.readFileSync(FILE, 'utf8'));

function segIntersect(a, b, c, d) {
  const r = { x: b[0] - a[0], z: b[1] - a[1] };
  const s = { x: d[0] - c[0], z: d[1] - c[1] };
  const den = r.x * s.z - r.z * s.x;
  if (Math.abs(den) < 1e-9) return null;
  const t = ((c[0] - a[0]) * s.z - (c[1] - a[1]) * s.x) / den;
  const u = ((c[0] - a[0]) * r.z - (c[1] - a[1]) * r.x) / den;
  if (t < 0.02 || t > 0.98 || u < 0.02 || u > 0.98) return null;
  return { x: a[0] + r.x * t, z: a[1] + r.z * t };
}

function dist(a, b) { return Math.hypot(a.x - b.x, a.z - b.z); }

const major = city.roads.filter(r => ['primary', 'secondary', 'tertiary'].includes(r.kind) && r.length > 20);
const extra = city.roads.filter(r => r.kind === 'residential' && r.length > 35);
const roads = major.length > 8 ? major : major.concat(extra);

const points = [];
for (let i = 0; i < roads.length; i++) {
  const A = roads[i];
  for (let j = i + 1; j < roads.length; j++) {
    const B = roads[j];
    for (let ai = 1; ai < A.pts.length; ai++) {
      for (let bi = 1; bi < B.pts.length; bi++) {
        const p = segIntersect(A.pts[ai - 1], A.pts[ai], B.pts[bi - 1], B.pts[bi]);
        if (!p) continue;
        if (Math.hypot(p.x, p.z) > 1700) continue;
        if (points.some(q => dist(p, q) < 14)) continue;
        points.push(p);
      }
    }
  }
}

// Priorità alle intersezioni più centrali.
points.sort((a, b) => Math.hypot(a.x, a.z) - Math.hypot(b.x, b.z));
const chosen = points.slice(0, 24);
const trafficSignals = chosen.map((p, i) => ({ id: `signal-${i + 1}`, x: +p.x.toFixed(1), z: +p.z.toFixed(1) }));

// Aggiunge semafori in punti di riferimento del centro, agganciandoli alla strada più vicina.
function nearestRoadPoint(x, z) {
  let best = null;
  for (const r of major.concat(extra)) {
    for (const p of r.pts) {
      const d = Math.hypot(p[0] - x, p[1] - z);
      if (!best || d < best.d) best = { x: p[0], z: p[1], d };
    }
  }
  return best && best.d < 90 ? { x: best.x, z: best.z } : null;
}
for (const [x, z] of [[-290, 8], [20, -20], [175, -110], [-90, 70], [-300, -50], [260, 30], [-200, 200], [180, 150], [-500, 250], [450, 60]]) {
  const p = nearestRoadPoint(x, z);
  if (!p) continue;
  if (trafficSignals.some(s => Math.hypot(s.x - p.x, s.z - p.z) < 18)) continue;
  trafficSignals.push({ id: `signal-${trafficSignals.length + 1}`, x: +p.x.toFixed(1), z: +p.z.toFixed(1) });
}

// Attraversamenti: vicino ai semafori e ai luoghi principali.
const crossings = [];
function addCrossing(x, z) {
  if (crossings.some(c => Math.hypot(c.x - x, c.z - z) < 10)) return;
  crossings.push({ id: `crossing-${crossings.length + 1}`, x: +x.toFixed(1), z: +z.toFixed(1), kind: 'uncontrolled' });
}
for (const s of chosen) {
  addCrossing(s.x + 3.5, s.z);
  addCrossing(s.x - 3.5, s.z);
}
for (const [x, z] of [
  [-296, 8], [-305, 20], [-299, -36], [-315, -69], [-83, 64],
  [-12, 56], [175, -112], [391, 148], [-13, 32], [20, -68],
  [-77, -7], [14, -21], [-32, 70]
]) addCrossing(x, z);

city.trafficSignals = trafficSignals;
city.crossings = crossings;
city.meta.counts.trafficSignals = trafficSignals.length;
city.meta.counts.crossings = crossings.length;
fs.writeFileSync(FILE, JSON.stringify(city));
console.log(`✓ traffico generato: ${trafficSignals.length} semafori, ${crossings.length} attraversamenti`);
