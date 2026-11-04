export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export function project(lat, lon, origin) {
  const mPerDegLat = 111132.0;
  const mPerDegLon = 111320.0 * Math.cos(origin.lat * Math.PI / 180);
  return {
    x: (lon - origin.lon) * mPerDegLon,
    z: -(lat - origin.lat) * mPerDegLat
  };
}

export function unproject(x, z, origin) {
  const mPerDegLat = 111132.0;
  const mPerDegLon = 111320.0 * Math.cos(origin.lat * Math.PI / 180);
  return {
    lat: origin.lat - z / mPerDegLat,
    lon: origin.lon + x / mPerDegLon
  };
}

export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

export function distanceToSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const l2 = dx * dx + dz * dz;
  if (l2 < 1e-9) return Math.hypot(px - ax, pz - az);
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / l2, 0, 1);
  return Math.hypot(px - (ax + dx * t), pz - (az + dz * t));
}

export function distanceToPolyline(px, pz, pts) {
  let best = Infinity;
  for (let i = 1; i < pts.length; i++) {
    best = Math.min(best, distanceToSegment(px, pz, pts[i - 1][0], pts[i - 1][1], pts[i][0], pts[i][1]));
  }
  return best;
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
    return [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  }
  return [cx / (3 * a), cz / (3 * a)];
}

export function polygonBounds(poly) {
  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (const [x, z] of poly) {
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (z < minZ) minZ = z;
    if (z > maxZ) maxZ = z;
  }
  return { minX, maxX, minZ, maxZ };
}

export function formatMeters(v) {
  return `${v.toFixed(1)} m`;
}
