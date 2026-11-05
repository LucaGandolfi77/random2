/**
 * Fidenza da Giocare v2 — override geometrici
 *
 * Applica al volo le modifiche fatte nell'editor (edifici, strade, aree,
 * corsi d'acqua, ferrovie) senza toccare i dati OSM originali.
 *
 * Modulo puro: nessuna dipendenza da Three.js o dal DOM.
 */

export function polygonArea(poly) {
  let a = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    a += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(a) / 2;
}

export function polygonCentroid(poly) {
  let a = 0, cx = 0, cz = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    a += f;
    cx += (poly[j][0] + poly[i][0]) * f;
    cz += (poly[j][1] + poly[i][1]) * f;
  }
  if (Math.abs(a) < 1e-9) {
    return [
      poly.reduce((s, p) => s + p[0], 0) / poly.length,
      poly.reduce((s, p) => s + p[1], 0) / poly.length
    ];
  }
  return [cx / (3 * a), cz / (3 * a)];
}

function rotateAround(x, z, cx, cz, deg) {
  const r = deg * Math.PI / 180;
  const c = Math.cos(r), s = Math.sin(r);
  const dx = x - cx, dz = z - cz;
  return [cx + dx * c - dz * s, cz + dx * s + dz * c];
}

export function transformPolygon(poly, { moveX = 0, moveZ = 0, rotate = 0, scale = 1 } = {}) {
  const [cx, cz] = polygonCentroid(poly);
  return poly.map(([x, z]) => {
    let px = (x - cx) * scale + cx + moveX;
    let pz = (z - cz) * scale + cz + moveZ;
    if (rotate) [px, pz] = rotateAround(px, pz, cx + moveX, cz + moveZ, rotate);
    return [+px.toFixed(2), +pz.toFixed(2)];
  });
}

export function transformLine(points, { moveX = 0, moveZ = 0, rotate = 0, scale = 1 } = {}) {
  if (!points?.length) return points;
  const cx = points.reduce((s, p) => s + p[0], 0) / points.length;
  const cz = points.reduce((s, p) => s + p[1], 0) / points.length;
  return points.map(([x, z]) => {
    let px = (x - cx) * scale + cx + moveX;
    let pz = (z - cz) * scale + cz + moveZ;
    if (rotate) [px, pz] = rotateAround(px, pz, cx + moveX, cz + moveZ, rotate);
    return [+px.toFixed(2), +pz.toFixed(2)];
  });
}

function applyPolygonOverride(item, o) {
  if (!o) return item;
  if (o.hidden) return null;
  const poly = Array.isArray(o.poly) && o.poly.length >= 3
    ? o.poly.map(p => [+p[0], +p[1]])
    : transformPolygon(item.poly, {
        moveX: Number(o.moveX) || 0,
        moveZ: Number(o.moveZ) || 0,
        rotate: Number(o.rotate) || 0,
        scale: Number.isFinite(o.scale) ? o.scale : 1
      });
  const [cx, cz] = polygonCentroid(poly);
  return {
    ...item,
    poly,
    x: +cx.toFixed(1),
    z: +cz.toFixed(1),
    area: +polygonArea(poly).toFixed(1),
    ...(o.height != null ? { h: Number(o.height) } : {}),
    ...(o.levels != null ? { levels: Number(o.levels) } : {}),
    ...(o.roof ? { roof: o.roof, roofShape: o.roof } : {}),
    ...(o.color ? { color: o.color } : {}),
    ...(o.kind ? { kind: o.kind } : {}),
    ...(o.name ? { name: o.name } : {}),
    _override: true
  };
}

function applyRoadOverride(item, o) {
  if (!o) return item;
  if (o.hidden) return null;
  const pts = Array.isArray(o.pts) && o.pts.length >= 2
    ? o.pts.map(p => [+p[0], +p[1]])
    : transformLine(item.pts, {
        moveX: Number(o.moveX) || 0,
        moveZ: Number(o.moveZ) || 0,
        rotate: Number(o.rotate) || 0,
        scale: Number.isFinite(o.scale) ? o.scale : 1
      });
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  return {
    ...item,
    pts,
    w: o.width != null ? Number(o.width) : item.w,
    length: +length.toFixed(1),
    ...(o.kind ? { kind: o.kind } : {}),
    ...(o.name ? { name: o.name } : {}),
    ...(o.surface ? { surface: o.surface } : {}),
    ...(o.oneway != null ? { oneway: !!o.oneway } : {}),
    ...(o.bridge != null ? { bridge: !!o.bridge } : {}),
    ...(o.tunnel != null ? { tunnel: !!o.tunnel } : {}),
    ...(o.sidewalk != null ? { sidewalk: !!o.sidewalk } : {}),
    _override: true
  };
}

function applyLineOverride(item, o) {
  if (!o) return item;
  if (o.hidden) return null;
  const pts = Array.isArray(o.pts) && o.pts.length >= 2
    ? o.pts.map(p => [+p[0], +p[1]])
    : transformLine(item.pts, {
        moveX: Number(o.moveX) || 0,
        moveZ: Number(o.moveZ) || 0,
        rotate: Number(o.rotate) || 0,
        scale: Number.isFinite(o.scale) ? o.scale : 1
      });
  return {
    ...item,
    pts,
    ...(o.kind ? { kind: o.kind } : {}),
    ...(o.name ? { name: o.name } : {}),
    ...(o.width != null ? { w: Number(o.width) } : {}),
    _override: true
  };
}

function customPolygon(item, group, index = 0) {
  if (!item || item.hidden) return null;
  if (!item.poly || item.poly.length < 3) return null;
  const poly = item.poly.map(p => [+p[0], +p[1]]);
  const [x, z] = polygonCentroid(poly);
  return {
    ...item,
    id: item.id || `custom-${group}-${index + 1}`,
    poly,
    x: +x.toFixed(1),
    z: +z.toFixed(1),
    area: +polygonArea(poly).toFixed(1),
    kind: item.kind || (group === 'buildings' ? 'building' : 'urban'),
    h: item.h ?? item.height ?? 8,
    color: item.color || '#d8c6ae',
    ...(item.roof ? { roofShape: item.roof } : {}),
    _custom: true
  };
}

function customLine(item, group, index = 0) {
  if (!item || item.hidden) return null;
  if (!item.pts || item.pts.length < 2) return null;
  const pts = item.pts.map(p => [+p[0], +p[1]]);
  let length = 0;
  for (let i = 1; i < pts.length; i++) length += Math.hypot(pts[i][0] - pts[i - 1][0], pts[i][1] - pts[i - 1][1]);
  const defaultKind = group === 'railways' ? 'rail' : group === 'waterways' ? 'stream' : 'residential';
  const defaultWidth = group === 'railways' ? 3.5 : group === 'waterways' ? 4 : 6;
  return {
    ...item,
    id: item.id || `custom-${group}-${index + 1}`,
    pts,
    length: +length.toFixed(1),
    kind: item.kind || defaultKind,
    w: item.w ?? item.width ?? defaultWidth,
    _custom: true
  };
}

export function applyOverrides(city, overrides = {}, custom = {}) {
  const ob = overrides?.buildings || {};
  const or = overrides?.roads || {};
  const oa = overrides?.areas || {};
  const ow = overrides?.waterways || {};
  const ol = overrides?.railways || {};

  const buildings = [];
  for (const b of city.buildings || []) {
    const patched = applyPolygonOverride(b, ob[String(b.id)]);
    if (patched) buildings.push(patched);
  }
  for (const [i, b] of (custom.buildings || []).entries()) {
    const patched = customPolygon(b, 'buildings', i);
    if (patched) buildings.push(patched);
  }

  const roads = [];
  for (const r of city.roads || []) {
    const patched = applyRoadOverride(r, or[String(r.id)]);
    if (patched) roads.push(patched);
  }
  for (const [i, r] of (custom.roads || []).entries()) {
    const patched = customLine(r, 'roads', i);
    if (patched) roads.push(patched);
  }

  const areas = [];
  for (const a of city.areas || []) {
    const patched = applyPolygonOverride(a, oa[String(a.id)]);
    if (patched) areas.push(patched);
  }
  for (const [i, a] of (custom.areas || []).entries()) {
    const patched = customPolygon(a, 'areas', i);
    if (patched) areas.push(patched);
  }

  const waterways = [];
  for (const w of city.waterways || []) {
    const patched = applyLineOverride(w, ow[String(w.id)]);
    if (patched) waterways.push(patched);
  }
  for (const [i, w] of (custom.waterways || []).entries()) {
    const patched = customLine(w, 'waterways', i);
    if (patched) waterways.push(patched);
  }

  const railways = [];
  for (const r of city.railways || []) {
    const patched = applyLineOverride(r, ol[String(r.id)]);
    if (patched) railways.push(patched);
  }
  for (const [i, r] of (custom.railways || []).entries()) {
    const patched = customLine(r, 'railways', i);
    if (patched) railways.push(patched);
  }

  return {
    ...city,
    buildings,
    roads,
    areas,
    waterways,
    railways,
    meta: {
      ...(city.meta || {}),
      counts: {
        ...((city.meta || {}).counts || {}),
        buildings: buildings.length,
        roads: roads.length,
        areas: areas.length,
        waterways: waterways.length,
        railways: railways.length
      },
      overridesApplied: true
    }
  };
}

export function overrideCount(overrides = {}) {
  return Object.values(overrides || {}).reduce((n, group) => n + Object.keys(group || {}).length, 0);
}
