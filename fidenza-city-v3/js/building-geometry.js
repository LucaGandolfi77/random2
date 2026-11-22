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


function pointSegmentDistance(p, a, b) {
  const dx = b[0] - a[0], dz = b[1] - a[1];
  const len2 = dx * dx + dz * dz;
  const t = len2 < 1e-9 ? 0 : Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / len2));
  return Math.hypot(p[0] - (a[0] + t * dx), p[1] - (a[1] + t * dz));
}

function distanceToPolygon(p, poly) {
  let min = Infinity;
  for (let i = 0; i < poly.length; i++) {
    min = Math.min(min, pointSegmentDistance(p, poly[i], poly[(i + 1) % poly.length]));
  }
  return min;
}

/**
 * Quanto il rettangolo del tetto (asse + overhang) esce dal poligono dei muri.
 * Usato per evitare tetti che sembrano non avere una casa sotto.
 */
export function roofFootprintOverhang(poly, edge, bounds, overhang = 0.35) {
  if (!poly || poly.length < 3) return Infinity;
  const corners = [
    [bounds.minU - overhang, bounds.minN - overhang],
    [bounds.maxU + overhang, bounds.minN - overhang],
    [bounds.maxU + overhang, bounds.maxN + overhang],
    [bounds.minU - overhang, bounds.maxN + overhang]
  ];
  let max = 0;
  for (const [u, n] of corners) {
    const p = [u * edge.ux - n * edge.uz, u * edge.uz + n * edge.ux];
    max = Math.max(max, distanceToPolygon(p, poly));
  }
  return max;
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

  // Un tetto a falde viene costruito come rettangolo orientato: se il
  // footprint e' irregolare, il rettangolo sporge dai muri e sembra un tetto
  // senza casa. In quei casi si usa il tetto piano, che segue il poligono.
  const tooIrregular = !convex || rectangularity < 0.82 ||
    roofFootprintOverhang(poly, edge, bounds, 0.35) > 0.9;
  if (explicit === 'flat' || FLAT_KINDS.has(building.kind) || building.h < 4.2 ||
      area < 36 || tooIrregular) {
    style = 'flat';
  } else if (explicit === 'gabled' || explicit === 'gambrel') {
    style = 'gabled';
  } else if (explicit === 'half-hipped' || explicit === 'hipped' || explicit === 'many') {
    style = 'hipped';
  } else if (edge.len >= 3.2) {
    style = 'gabled';
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
    flatKind: FLAT_KINDS.has(building.kind),
    tooIrregular,
    footprintOverhang: +roofFootprintOverhang(poly, edge, bounds, 0.35).toFixed(2)
  };
}

/**
 * Decide lo stile del tetto tenendo conto anche del roofType di Arnis.
 *
 * Arnis usa "stairs" e "slab" per quasi tutti i tetti a falde, ma non sono
 * abbastanza specifici: un tetto a falde viene costruito come rettangolo
 * orientato e, su un footprint irregolare, sporge dai muri sembrando una
 * casa senza tetto (o un tetto senza casa). classifyBuildingRoof() ha già
 * deciso in base a forma e area del poligono, quindi l'unica informazione
 * che aggiungiamo è il caso esplicito "flat". Gli altri roofType non
 * forzano più falde sui footprint irregolari.
 */
export function resolveBuildingRoof(building, roofType = '') {
  const info = classifyBuildingRoof(building);
  const style = roofType === 'flat' ? 'flat' : info.style;
  return {
    ...info,
    style,
    requestedStyle: info.style,
    roofType: roofType || null
  };
}

/**
 * Anello di un tetto a padiglione in coordinate Shape.
 *
 * THREE.Shape usa (x, y) e rotateX(-PI/2) mappa (x, y, 0) in (x, 0, -y):
 * per questo la z del mondo va negata. Senza la negazione il tetto finisce
 * specchiato rispetto all'edificio e galleggia dall'altra parte della citta'.
 */
export function hippedRoofRing(poly, factor = 1) {
  const centroid = polygonCentroid(poly);
  return poly.map(([x, z]) => [
    centroid.x + (x - centroid.x) * factor,
    -(centroid.z + (z - centroid.z) * factor)
  ]);
}
