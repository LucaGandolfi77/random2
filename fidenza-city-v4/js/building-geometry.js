/**
 * Fidenza da Giocare v2.9 — geometria edifici
 *
 * Funzioni pure condivise da mondo 3D, tool di audit e futuri importer.
 * Classificano la footprint e scelgono un tetto coerente con la forma reale.
 */

export const FLAT_KINDS = new Set([
  'commercial', 'industrial', 'warehouse', 'factory', 'garage', 'garages',
  'roof', 'shed', 'train_station', 'hospital', 'school', 'sport'
]);

export function polygonArea(poly) {
  let area = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    area += poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
  }
  return Math.abs(area) / 2;
}

export function polygonCentroid(poly) {
  let area = 0;
  let cx = 0;
  let cz = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    area += f;
    cx += (poly[j][0] + poly[i][0]) * f;
    cz += (poly[j][1] + poly[i][1]) * f;
  }
  if (Math.abs(area) < 1e-6) {
    return {
      x: poly.reduce((sum, p) => sum + p[0], 0) / poly.length,
      z: poly.reduce((sum, p) => sum + p[1], 0) / poly.length
    };
  }
  return { x: cx / (3 * area), z: cz / (3 * area) };
}

export function isConvexPolygon(poly) {
  if (poly.length < 4) return true;
  let sign = 0;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[(i + poly.length - 1) % poly.length];
    const b = poly[i];
    const c = poly[(i + 1) % poly.length];
    const cross = (b[0] - a[0]) * (c[1] - b[1]) - (b[1] - a[1]) * (c[0] - b[0]);
    if (Math.abs(cross) < 1e-6) continue;
    const s = Math.sign(cross);
    if (sign && s !== sign) return false;
    sign = s;
  }
  return true;
}

export function longestEdge(poly) {
  let best = null;
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0];
    const dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1e-6) continue;
    if (!best || len > best.len) {
      best = { ax: a[0], az: a[1], bx: b[0], bz: b[1], ux: dx / len, uz: dz / len, len };
    }
  }
  return best || { ax: poly[0][0], az: poly[0][1], bx: poly[0][0] + 1, bz: poly[0][1], ux: 1, uz: 0, len: 1 };
}

export function orientedBounds(poly, ux, uz) {
  let minU = Infinity, maxU = -Infinity, minN = Infinity, maxN = -Infinity;
  for (const [x, z] of poly) {
    const u = x * ux + z * uz;
    const n = -x * uz + z * ux;
    if (u < minU) minU = u;
    if (u > maxU) maxU = u;
    if (n < minN) minN = n;
    if (n > maxN) maxN = n;
  }
  const centerU = (minU + maxU) / 2;
  const centerN = (minN + maxN) / 2;
  return {
    minU, maxU, minN, maxN,
    centerU, centerN,
    centerX: ux * centerU - uz * centerN,
    centerZ: uz * centerU + ux * centerN,
    width: maxN - minN,
    length: maxU - minU
  };
}

export function classifyBuildingRoof(building) {
  const poly = building.poly || [];
  const area = Number(building.area) || polygonArea(poly);
  const edge = longestEdge(poly);
  const bounds = orientedBounds(poly, edge.ux, edge.uz);
  const rectArea = Math.max(0.01, bounds.width * bounds.length);
  const rectangularity = area / rectArea;
  const convex = isConvexPolygon(poly);
  const explicit = building.roofShape || '';
  let style = 'flat';

  if (explicit === 'flat' || FLAT_KINDS.has(building.kind) || building.h < 4.2 || area < 36) {
    style = 'flat';
  } else if (explicit === 'gabled' || explicit === 'gambrel') {
    style = rectangularity >= 0.68 ? 'gabled' : (convex ? 'hipped' : 'flat');
  } else if (explicit === 'half-hipped' || explicit === 'hipped' || explicit === 'many') {
    style = convex ? 'hipped' : 'flat';
  } else if (rectangularity >= 0.78 && edge.len >= 3.2) {
    style = 'gabled';
  } else if (convex) {
    style = 'hipped';
  }

  const span = Math.min(bounds.width, bounds.length);
  const ridgeHeight = Number(building.roofHeight) > 0
    ? Number(building.roofHeight)
    : Math.max(0.9, Math.min(4.8, span * (style === 'hipped' ? 0.18 : 0.22)));

  return {
    style,
    explicit,
    convex,
    rectangularity: +rectangularity.toFixed(3),
    area: +area.toFixed(1),
    edge,
    bounds,
    span: +span.toFixed(2),
    length: +bounds.length.toFixed(2),
    ridgeHeight: +ridgeHeight.toFixed(2),
    flatKind: FLAT_KINDS.has(building.kind)
  };
}
