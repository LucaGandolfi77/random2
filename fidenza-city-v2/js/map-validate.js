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

const GEOMETRY_GROUPS = {
  buildings: { polygon: true, kind: 'building', minSize: 1, label: 'edificio' },
  areas: { polygon: true, kind: 'area', minSize: 1, label: 'area' },
  roads: { polygon: false, kind: 'road', minSize: 0.5, label: 'strada' },
  waterways: { polygon: false, kind: 'waterway', minSize: 0.5, label: 'corso d’acqua' },
  railways: { polygon: false, kind: 'railway', minSize: 1, label: 'ferrovia' }
};

function geometryPoints(item, polygon) {
  return polygon ? item?.poly : item?.pts;
}

function pointsFinite(points) {
  return Array.isArray(points) && points.every(p => Array.isArray(p) && Number.isFinite(Number(p[0])) && Number.isFinite(Number(p[1])));
}

function lineLength(points) {
  let length = 0;
  for (let i = 1; i < points.length; i++) {
    length += Math.hypot(Number(points[i][0]) - Number(points[i - 1][0]), Number(points[i][1]) - Number(points[i - 1][1]));
  }
  return length;
}

function polygonArea(poly) {
  let area = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    area += Number(poly[j][0]) * Number(poly[i][1]) - Number(poly[i][0]) * Number(poly[j][1]);
  }
  return Math.abs(area) / 2;
}

function orientation(a, b, c) {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function onSegment(a, b, c) {
  return Math.min(a[0], b[0]) - 1e-9 <= c[0] && c[0] <= Math.max(a[0], b[0]) + 1e-9 &&
    Math.min(a[1], b[1]) - 1e-9 <= c[1] && c[1] <= Math.max(a[1], b[1]) + 1e-9;
}

function segmentsIntersect(a, b, c, d) {
  const o1 = orientation(a, b, c);
  const o2 = orientation(a, b, d);
  const o3 = orientation(c, d, a);
  const o4 = orientation(c, d, b);
  if (((o1 > 0 && o2 < 0) || (o1 < 0 && o2 > 0)) && ((o3 > 0 && o4 < 0) || (o3 < 0 && o4 > 0))) return true;
  if (Math.abs(o1) < 1e-9 && onSegment(a, b, c)) return true;
  if (Math.abs(o2) < 1e-9 && onSegment(a, b, d)) return true;
  if (Math.abs(o3) < 1e-9 && onSegment(c, d, a)) return true;
  if (Math.abs(o4) < 1e-9 && onSegment(c, d, b)) return true;
  return false;
}

function polygonSelfIntersects(poly) {
  const n = poly.length;
  if (n < 4) return false;
  for (let i = 0; i < n; i++) {
    const a = poly[i], b = poly[(i + 1) % n];
    for (let j = i + 1; j < n; j++) {
      if (i === j || (i + 1) % n === j || (j + 1) % n === i) continue;
      if (segmentsIntersect(a, b, poly[j], poly[(j + 1) % n])) return true;
    }
  }
  return false;
}

function duplicateVertices(points) {
  let duplicates = 0;
  for (let i = 1; i < points.length; i++) {
    if (Math.hypot(Number(points[i][0]) - Number(points[i - 1][0]), Number(points[i][1]) - Number(points[i - 1][1])) < 0.01) duplicates++;
  }
  if (points.length > 1) {
    const first = points[0], last = points[points.length - 1];
    if (Math.hypot(Number(first[0]) - Number(last[0]), Number(first[1]) - Number(last[1])) < 0.01) duplicates++;
  }
  return duplicates;
}

function geometryProblems(item, spec) {
  const points = geometryPoints(item, spec.polygon);
  if (!Array.isArray(points)) return [`${spec.label} senza geometria`];
  if (!pointsFinite(points)) return [`${spec.label} con coordinate non valide`];
  if (points.length < (spec.polygon ? 3 : 2)) return [`${spec.label} con troppi pochi vertici`];
  if (duplicateVertices(points)) return [`${spec.label} con vertici duplicati`];
  if (spec.polygon && polygonArea(points) < spec.minSize) return [`${spec.label} troppo piccolo`];
  if (!spec.polygon && lineLength(points) < spec.minSize) return [`${spec.label} troppo corta`];
  if (spec.polygon && polygonSelfIntersects(points)) return [`${spec.label} con lati che si incrociano`];
  return [];
}

export function validateMap(map, city) {
  const overrides = map.overrides || {};
  const custom = map.custom || {};
  const patched = applyOverrides(city, overrides, custom);
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
  const areaIds = new Set((city.areas || []).map(a => String(a.id)));
  for (const id of Object.keys(overrides.areas || {})) {
    if (!areaIds.has(String(id))) add('override', `area:${id}`, false, 'area inesistente');
  }
  const waterwayIds = new Set((city.waterways || []).map(w => String(w.id)));
  for (const id of Object.keys(overrides.waterways || {})) {
    if (!waterwayIds.has(String(id))) add('override', `waterway:${id}`, false, 'corso d’acqua inesistente');
  }
  const railwayIds = new Set((city.railways || []).map(r => String(r.id)));
  for (const id of Object.keys(overrides.railways || {})) {
    if (!railwayIds.has(String(id))) add('override', `railway:${id}`, false, 'ferrovia inesistente');
  }

  // Geometriche create dall'editor: devono essere valide e non duplicare
  // feature già presenti nel dato OSM.
  let customFeatures = 0;
  for (const [group, spec] of Object.entries(GEOMETRY_GROUPS)) {
    const list = Array.isArray(custom[group]) ? custom[group] : [];
    if (custom[group] != null && !Array.isArray(custom[group])) {
      add('geometry', group, false, `${group} deve essere un array`);
      continue;
    }
    const existing = new Set((city[group] || []).map(item => String(item.id)));
    const ids = new Set();
    for (const item of list) {
      customFeatures++;
      const id = String(item?.id || '(senza id)');
      const key = `${group}:${id}`;
      if (!item?.id) add('geometry', key, false, `${spec.label} senza id`);
      else if (ids.has(id) || existing.has(id)) add('geometry', key, false, `${spec.label} con id duplicato`);
      ids.add(id);
      const problems = geometryProblems(item || {}, spec);
      for (const problem of problems) add('geometry', key, false, problem, { custom: true, group });
      if (!problems.length) add('geometry', key, true, `${spec.label} valido`, { custom: true, group });
      const points = geometryPoints(item || {}, spec.polygon) || [];
      if (pointsFinite(points)) {
        const outside = points.some(p => !inBounds(Number(p[0]), Number(p[1]), bounds));
        if (outside) add('geometry', key, true, 'avviso: geometria fuori dall’area giocabile', { custom: true, group });
      }
      if (group === 'roads') {
        const width = Number(item?.w ?? item?.width ?? 6);
        if (!(width > 0.5 && width < 80)) add('geometry', key, false, 'larghezza strada non valida', { custom: true, group });
      }
      if (group === 'buildings') {
        const height = Number(item?.h ?? item?.height ?? 8);
        if (!(height >= 1 && height <= 300)) add('geometry', key, false, 'altezza edificio non valida', { custom: true, group });
      }
    }
  }

  // Override geometrici assoluti: se presenti devono essere completi.
  let absoluteOverrides = 0;
  for (const [group, spec] of Object.entries(GEOMETRY_GROUPS)) {
    for (const [id, override] of Object.entries(overrides[group] || {})) {
      if (!override || override.hidden) continue;
      const points = geometryPoints(override, spec.polygon);
      if (!points) continue;
      absoluteOverrides++;
      for (const problem of geometryProblems(override, spec)) {
        add('override', `${spec.kind}:${id}`, false, problem);
      }
    }
  }

  const errors = rows.filter(r => !r.ok);
  return {
    rows,
    errors,
    warnings: rows.filter(r => r.ok && r.msg && r.msg.startsWith('avviso')),
    totals: {
      checks: rows.length,
      errors: errors.length,
      overrides: Object.values(overrides).reduce((n, g) => n + Object.keys(g || {}).length, 0),
      absoluteOverrides,
      customFeatures
    },
    compiled,
    patchedCity: patched
  };
}
