#!/usr/bin/env node
/**
 * Fidenza da Giocare v2 — map validator
 *
 * Controlla che POI, beacon, stelle e target delle missioni siano dentro
 * l'area giocabile, fuori dagli edifici e raggiungibili.
 *
 * Uso: node tools/validate-map.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const ROOT = path.resolve(import.meta.dirname, '..');
const args = process.argv.slice(2);
const getArg = (name, fallback) => { const i = args.indexOf(name); return i >= 0 ? args[i + 1] : fallback; };
const MAP = path.resolve(ROOT, getArg('--map', 'data/map.json'));
const CITY = path.resolve(ROOT, getArg('--city', 'data/city.json'));
const STARS = path.join(ROOT, 'data', 'city.json');
const OUT = path.join(ROOT, 'data', 'map-validation.json');
const BOUNDS = { minX: -1660, maxX: 1940, minZ: -1740, maxZ: 1840 };

function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}
function distToPoly(x, z, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], az = poly[j][1], bx = poly[i][0], bz = poly[i][1];
    const dx = bx - ax, dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

function main() {
  const map = JSON.parse(fs.readFileSync(MAP, 'utf8'));
  const city = JSON.parse(fs.readFileSync(CITY, 'utf8'));
  const buildings = city.buildings;
  const inside = (x, z) => buildings.some(b => pointInPoly(x, z, b.poly));
  const free = (x, z, r = 0.6) => !buildings.some(b => pointInPoly(x, z, b.poly) || distToPoly(x, z, b.poly) < r);

  const rows = [];
  const add = (kind, id, ok, msg, extra = {}) => rows.push({ kind, id, ok, msg, ...extra });

  for (const p of map.places) {
    const inBounds = p.x >= BOUNDS.minX && p.x <= BOUNDS.maxX && p.z >= BOUNDS.minZ && p.z <= BOUNDS.maxZ;
    add('place', p.id, inBounds, inBounds ? 'dentro l’area giocabile' : 'fuori dall’area giocabile', { x: p.x, z: p.z, collectible: p.collectible });
    if (p.collectible) {
      const bx = p.beaconX ?? p.x;
      const bz = p.beaconZ ?? p.z;
      const beaconFree = free(bx, bz, 0.5);
      const beaconNear = Math.hypot(bx - p.x, bz - p.z) < 90;
      add('beacon', p.id, beaconFree && beaconNear, beaconFree ? (beaconNear ? 'beacon accessibile' : 'beacon troppo lontano dal POI') : 'beacon dentro un edificio', { x: bx, z: bz });
    }
  }

  for (const l of map.landmarks) {
    add('landmark', l.id, Number.isFinite(l.x) && Number.isFinite(l.z), 'modello 3D posizionato', { x: l.x, z: l.z, model: l.model });
  }

  for (const s of city.stars || []) {
    const ok = free(s.x, s.z, 0.35);
    add('star', `star-${s.x}-${s.z}`, ok, ok ? 'stella raggiungibile' : 'stella dentro/too close a un edificio', { x: s.x, z: s.z });
  }

  for (const m of map.missions) {
    for (let i = 0; i < (m.steps || []).length; i++) {
      const s = m.steps[i];
      const ok = free(s.x, s.z, 0.7);
      add('mission-step', `${m.id}:${i}`, ok, ok ? (s.name || 'target') : 'target dentro un edificio', { x: s.x, z: s.z });
    }
  }

  const errors = rows.filter(r => !r.ok);
  const report = {
    generated: new Date().toISOString(),
    totals: { checks: rows.length, errors: errors.length },
    rows
  };
  fs.writeFileSync(OUT, JSON.stringify(report, null, 2));
  console.log(`Controlli: ${rows.length} · Errori: ${errors.length}`);
  for (const e of errors) console.log(`  ✗ ${e.kind} ${e.id}: ${e.msg}`);
  console.log(`Report: ${path.relative(ROOT, OUT)}`);
  if (errors.length) process.exitCode = 1;
}

main();
