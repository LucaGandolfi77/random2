/**
 * Utility geometriche dell'editor.
 *
 * Lavorano sempre su coordinate locali [x, z] e non hanno dipendenze dal DOM.
 */

export const FEATURE_GROUP = {
  building: 'buildings',
  road: 'roads',
  area: 'areas',
  waterway: 'waterways',
  railway: 'railways'
};

export const GROUP_FEATURE = Object.fromEntries(
  Object.entries(FEATURE_GROUP).map(([kind, group]) => [group, kind])
);

export const FEATURE_LABEL = {
  building: 'edificio',
  road: 'strada',
  area: 'area',
  waterway: 'corso d’acqua',
  railway: 'ferrovia'
};

export const LINE_KINDS = new Set(['road', 'waterway', 'railway']);

export function featureGroup(kind) {
  return FEATURE_GROUP[kind] || null;
}

export function featureLabel(kind) {
  return FEATURE_LABEL[kind] || kind;
}

export function isLineKind(kind) {
  return LINE_KINDS.has(kind);
}

export function pointsFor(kind, item) {
  if (!item) return null;
  return isLineKind(kind) ? item.pts || null : item.poly || null;
}

export function normalizePoints(points, decimals = 2) {
  if (!Array.isArray(points)) return [];
  const out = [];
  for (const point of points) {
    if (!Array.isArray(point) || !Number.isFinite(Number(point[0])) || !Number.isFinite(Number(point[1]))) continue;
    const next = [+Number(point[0]).toFixed(decimals), +Number(point[1]).toFixed(decimals)];
    const prev = out[out.length - 1];
    if (prev && Math.hypot(next[0] - prev[0], next[1] - prev[1]) < 0.001) continue;
    out.push(next);
  }
  return out;
}

export function pointsBounds(points) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of points || []) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

export function lineLength(points) {
  let length = 0;
  for (let i = 1; i < (points || []).length; i++) {
    length += Math.hypot(points[i][0] - points[i - 1][0], points[i][1] - points[i - 1][1]);
  }
  return +length.toFixed(2);
}

export function translatePoints(points, dx, dz) {
  return (points || []).map(([x, z]) => [+(x + dx).toFixed(2), +(z + dz).toFixed(2)]);
}

export function rotatePoints(points, cx, cz, deg) {
  const rad = deg * Math.PI / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  return (points || []).map(([x, z]) => {
    const dx = x - cx, dz = z - cz;
    return [+(cx + dx * cos - dz * sin).toFixed(2), +(cz + dx * sin + dz * cos).toFixed(2)];
  });
}

export function scalePoints(points, cx, cz, factor) {
  return (points || []).map(([x, z]) => [
    +(cx + (x - cx) * factor).toFixed(2),
    +(cz + (z - cz) * factor).toFixed(2)
  ]);
}

export function midpoint(points) {
  if (!points?.length) return { x: 0, z: 0 };
  if (points.length === 1) return { x: points[0][0], z: points[0][1] };
  let total = lineLength(points);
  let target = total / 2;
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1], b = points[i];
    const len = Math.hypot(b[0] - a[0], b[1] - a[1]);
    if (target <= len || i === points.length - 1) {
      const t = len ? Math.max(0, Math.min(1, target / len)) : 0;
      return { x: a[0] + (b[0] - a[0]) * t, z: a[1] + (b[1] - a[1]) * t };
    }
    target -= len;
  }
  const last = points[points.length - 1];
  return { x: last[0], z: last[1] };
}

export function nearestSegment(points, x, z, closed = false) {
  let best = null;
  if (!points?.length) return best;
  const count = closed && points.length > 2 ? points.length : points.length - 1;
  for (let i = 0; i < count; i++) {
    const a = points[i];
    const b = points[(i + 1) % points.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const l2 = dx * dx + dz * dz;
    const t = l2 ? Math.max(0, Math.min(1, ((x - a[0]) * dx + (z - a[1]) * dz) / l2)) : 0;
    const px = a[0] + dx * t;
    const pz = a[1] + dz * t;
    const distance = Math.hypot(x - px, z - pz);
    if (!best || distance < best.distance) best = { index: i, distance, x: px, z: pz, t };
  }
  return best;
}

function distanceToSegmentSq(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const l2 = dx * dx + dz * dz;
  if (!l2) return (p[0] - a[0]) ** 2 + (p[1] - a[1]) ** 2;
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / l2));
  const x = a[0] + dx * t, z = a[1] + dz * t;
  return (p[0] - x) ** 2 + (p[1] - z) ** 2;
}

function simplifyStep(points, first, last, toleranceSq, keep) {
  let maxDist = toleranceSq;
  let index = -1;
  for (let i = first + 1; i < last; i++) {
    const dist = distanceToSegmentSq(points[i], points[first], points[last]);
    if (dist > maxDist) {
      index = i;
      maxDist = dist;
    }
  }
  if (index === -1) return;
  if (index - first > 1) simplifyStep(points, first, index, toleranceSq, keep);
  keep.add(index);
  if (last - index > 1) simplifyStep(points, index, last, toleranceSq, keep);
}

export function simplifyPoints(points, tolerance = 1.5) {
  if (!points || points.length <= 3) return normalizePoints(points);
  const keep = new Set([0, points.length - 1]);
  simplifyStep(points, 0, points.length - 1, tolerance * tolerance, keep);
  const simplified = points.filter((_, index) => keep.has(index));
  return normalizePoints(simplified.length >= 3 ? simplified : points);
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

export function selfIntersects(poly) {
  const n = poly?.length || 0;
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

export function reversePoints(points) {
  return [...(points || [])].reverse();
}
