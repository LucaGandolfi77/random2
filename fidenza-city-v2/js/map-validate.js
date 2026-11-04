/**
 * Fidenza da Giocare v2 — validazione condivisa mappa
 *
 * Usata dal tool CLI e dall'editor. Applica gli override, ricompila la mappa
 * e controlla che POI, beacon, stelle, veicoli, spawn e missioni siano
 * dentro l'area giocabile e fuori dagli edifici.
 *
 * Modulo puro: nessuna dipendenza dal DOM.
 */
import { applyOverrides } from './map-overrides.js';
import { compileMap, project, pointInPoly, distToPoly } from './map-compiler.js';

const MODELS = new Set([
  'duomo', 'piazza-duomo', 'porta', 'ponte', 'teatro', 'comunale',
  'granmadre', 'sanpietro', 'musini', 'stazione', 'stirone', 'obelisco',
  'piazza-garibaldi'
]);

function freeTest(buildings) {
  return (x, z, r = 0.6) => !buildings.some(b => pointInPoly(x, z, b.poly) || distToPoly(x, z, b.poly) < r);
}

function boundsFromMap(map) {
  const o = map.origin || map.center;
  const sw = project(map.bbox.south, map.bbox.west, o);
  const ne = project(map.bbox.north, map.bbox.east, o);
  return { minX: sw.x, maxX: ne.x, minZ: ne.z, maxZ: sw.z };
}

function inBounds(x, z, bounds) {
  return x >= bounds.minX && x <= bounds.maxX && z >= bounds.minZ && z <= bounds.maxZ;
}

export function validateMap(map, city) {
  const overrides = map.overrides || {};
  const patched = applyOverrides(city, overrides);
  const compiled = compileMap(map, patched);
  const free = freeTest(patched.buildings);
  const bounds = boundsFromMap(map);
  const rows = [];
  const add = (kind, id, ok, msg, extra = {}) => rows.push({ kind, id, ok, msg, ...extra });

  const placeIds = new Set();
  for (const p of compiled.places) {
    if (placeIds.has(p.id)) add('place', p.id, false, 'id duplicato');
    placeIds.add(p.id);
    if (!inBounds(p.x, p.z, bounds)) add('place', p.id, false, 'fuori dall’area giocabile', { x: p.x, z: p.z });
    if (!p.osm) add('place', p.id, true, 'nessun ID OSM (solo avviso)');
    if (p.collectible) {
      const bx = p.beaconX ?? p.x;
      const bz = p.beaconZ ?? p.z;
      const ok = free(bx, bz, 0.45);
      const near = Math.hypot(bx - p.x, bz - p.z) < 100;
      add('beacon', p.id, ok && near, !ok ? 'beacon dentro un edificio' : !near ? 'beacon troppo lontano dal POI' : 'beacon accessibile', { x: bx, z: bz });
    }
  }

  for (const l of compiled.landmarks) {
    if (!MODELS.has(l.model)) add('landmark', l.id, false, `modello sconosciuto: ${l.model}`);
    if (!inBounds(l.x + (l.offsetX || 0), l.z + (l.offsetZ || 0), bounds)) add('landmark', l.id, false, 'landmark fuori dall’area giocabile');
  }

  for (const s of compiled.stars) {
    const ok = free(s.x, s.z, 0.3);
    add('star', s.id, ok, ok ? 'stella accessibile' : 'stella dentro un edificio', { x: s.x, z: s.z });
  }

  for (const v of compiled.vehicles || []) {
    const ok = free(v.x, v.z, 1.0);
    add('vehicle', `${v.type}-${v.label}`, ok, ok ? 'veicolo accessibile' : 'veicolo dentro un edificio', { x: v.x, z: v.z });
  }

  if (compiled.spawn) {
    const ok = free(compiled.spawn.x, compiled.spawn.z, 0.5);
    add('spawn', 'spawn', ok, ok ? 'spawn accessibile' : 'spawn dentro un edificio', { x: compiled.spawn.x, z: compiled.spawn.z });
  }
  if (compiled.missionBoard) {
    const ok = free(compiled.missionBoard.x, compiled.missionBoard.z, 0.5);
    add('missionBoard', 'mission-board', ok, ok ? 'tabellone accessibile' : 'tabellone dentro un edificio', { x: compiled.missionBoard.x, z: compiled.missionBoard.z });
  }

  const PROP_TYPES = new Set(['sign', 'street-sign', 'tree', 'bench', 'lamp', 'bollard', 'planter', 'stall', 'parked-car']);
  for (const p of compiled.props || []) {
    if (!PROP_TYPES.has(p.type)) add('prop', p.id, false, `tipo sconosciuto: ${p.type}`);
    if (!inBounds(p.x, p.z, bounds)) add('prop', p.id, false, 'prop fuori dall’area giocabile', { x: p.x, z: p.z });
    const ok = free(p.x, p.z, 0.25);
    add('prop', p.id, ok, ok ? 'prop accessibile' : 'prop dentro un edificio', { x: p.x, z: p.z });
  }

  for (const m of compiled.missions) {
    if (!m.steps.length && !m.chase) add('mission', m.id, false, 'la missione non ha tappe');
    for (let i = 0; i < m.steps.length; i++) {
      const s = m.steps[i];
      const ok = free(s.x, s.z, 0.7);
      add('mission-step', `${m.id}:${i}`, ok, ok ? (s.name || 'target') : 'target dentro un edificio', { x: s.x, z: s.z });
    }
  }

  const buildingIds = new Set((city.buildings || []).map(b => String(b.id)));
  for (const id of Object.keys(overrides.buildings || {})) {
    if (!buildingIds.has(String(id))) add('override', `building:${id}`, false, 'edificio inesistente');
  }
  const roadIds = new Set((city.roads || []).map(r => String(r.id)));
  for (const id of Object.keys(overrides.roads || {})) {
    if (!roadIds.has(String(id))) add('override', `road:${id}`, false, 'strada inesistente');
  }

  const errors = rows.filter(r => !r.ok);
  return {
    rows,
    errors,
    warnings: rows.filter(r => r.ok && r.msg && r.msg.includes('avviso')),
    totals: {
      checks: rows.length,
      errors: errors.length,
      overrides: Object.values(overrides).reduce((n, g) => n + Object.keys(g || {}).length, 0)
    },
    compiled,
    patchedCity: patched
  };
}
