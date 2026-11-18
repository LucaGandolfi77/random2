/**
 * Fidenza da Giocare v2.13 — macro-quartieri
 *
 * I quartieri sono definiti da semi (centri) nel manifest e da confini
 * Voronoi calcolati sui limiti della mappa. I confini sono indicativi e
 * modificabili: servono per HUD, mappa, audio e scoperta dei quartieri.
 */

export const DISTRICT_FALLBACK = {
  id: 'fidenza',
  name: 'Fidenza',
  color: '#8a7f6a',
  description: 'La campagna ai margini della città.',
  ambience: 'city'
};

function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1];
    const xj = poly[j][0], zj = poly[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

function clipHalfPlane(poly, a, b, c) {
  const out = [];
  for (let i = 0; i < poly.length; i++) {
    const p = poly[i];
    const q = poly[(i + 1) % poly.length];
    const fp = a * p[0] + b * p[1] + c;
    const fq = a * q[0] + b * q[1] + c;
    const pin = fp <= 1e-7;
    const qin = fq <= 1e-7;
    if (pin) out.push(p);
    if (pin !== qin) {
      const t = fp / (fp - fq);
      out.push([
        p[0] + (q[0] - p[0]) * t,
        p[1] + (q[1] - p[1]) * t
      ]);
    }
  }
  return out;
}

export function voronoiPolygons(seeds, bounds) {
  const frame = [
    [bounds.minX, bounds.minZ],
    [bounds.maxX, bounds.minZ],
    [bounds.maxX, bounds.maxZ],
    [bounds.minX, bounds.maxZ]
  ];
  return seeds.map(seed => {
    let poly = frame.map(p => p.slice());
    for (const other of seeds) {
      if (other.id === seed.id) continue;
      const mx = (seed.x + other.x) / 2;
      const mz = (seed.z + other.z) / 2;
      const dx = other.x - seed.x;
      const dz = other.z - seed.z;
      const a = dx;
      const b = dz;
      const c = -(dx * mx + dz * mz);
      poly = clipHalfPlane(poly, a, b, c);
      if (poly.length < 3) break;
    }
    return { ...seed, poly };
  });
}

export function buildDistricts(defs = [], bounds) {
  const seeds = defs
    .filter(d => d && d.id && Number.isFinite(d.x) && Number.isFinite(d.z))
    .map(d => ({
      id: d.id,
      name: d.name || d.id,
      color: d.color || '#8a7f6a',
      description: d.description || '',
      ambience: d.ambience || 'city',
      x: Number(d.x),
      z: Number(d.z)
    }));
  if (!seeds.length || !bounds) return [];
  return voronoiPolygons(seeds, bounds);
}

export function getDistrictAt(districts, x, z) {
  if (!districts?.length) return DISTRICT_FALLBACK;
  for (const d of districts) {
    if (pointInPoly(x, z, d.poly)) return d;
  }
  let best = null;
  for (const d of districts) {
    const dist = Math.hypot(x - d.x, z - d.z);
    if (!best || dist < best.dist) best = { d, dist };
  }
  return best ? best.d : DISTRICT_FALLBACK;
}

export { pointInPoly as districtPointInPoly };
