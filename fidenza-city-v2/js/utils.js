import { WORLD } from './config.js';

export const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const lerp = (a, b, t) => a + (b - a) * t;
export const invLerp = (a, b, v) => (v - a) / (b - a);
export const smoothstep = t => t * t * (3 - 2 * t);
export const damp = (current, target, lambda, dt) => lerp(current, target, 1 - Math.exp(-lambda * dt));
export const TAU = Math.PI * 2;

export function normalizeAngle(a) {
  a = (a + Math.PI) % TAU;
  if (a < 0) a += TAU;
  return a - Math.PI;
}
export function angleDiff(a, b) { return normalizeAngle(b - a); }
export function lerpAngle(a, b, t) { return a + angleDiff(a, b) * t; }
export function dampAngle(a, b, lambda, dt) { return lerpAngle(a, b, 1 - Math.exp(-lambda * dt)); }

export function distance2D(ax, az, bx, bz) {
  return Math.hypot(bx - ax, bz - az);
}

export function seededRandom(seed = 1) {
  let s = seed >>> 0;
  return () => {
    s = (Math.imul(s, 1664525) + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function hashString(str) {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1];
    const xj = poly[j][0], zj = poly[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

export function closestPointOnSegment(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz;
  if (len2 < 1e-9) return { x: ax, z: az, t: 0, dist: Math.hypot(px - ax, pz - az) };
  const t = clamp(((px - ax) * dx + (pz - az) * dz) / len2, 0, 1);
  const x = ax + dx * t, z = az + dz * t;
  return { x, z, t, dist: Math.hypot(px - x, pz - z) };
}

/**
 * Spinge un cerchio fuori da un poligono. Restituisce il vettore di
 * correzione e la normale del lato più vicino.
 */
export function resolveCirclePolygon(px, pz, radius, poly) {
  let bestDist = Infinity;
  let bestX = 0, bestZ = 0, bestNx = 0, bestNz = 0;
  const inside = pointInPoly(px, pz, poly);
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], az = poly[j][1];
    const bx = poly[i][0], bz = poly[i][1];
    const cp = closestPointOnSegment(px, pz, ax, az, bx, bz);
    if (cp.dist < bestDist) {
      bestDist = cp.dist;
      bestX = cp.x; bestZ = cp.z;
      let nx = px - cp.x, nz = pz - cp.z;
      const nl = Math.hypot(nx, nz);
      if (nl > 1e-6) { nx /= nl; nz /= nl; }
      else {
        // centro esattamente sul bordo: usa la normale del segmento
        const dx = bx - ax, dz = bz - az;
        const dl = Math.hypot(dx, dz) || 1;
        nx = -dz / dl; nz = dx / dl;
      }
      bestNx = nx; bestNz = nz;
    }
  }
  if (inside) {
    // dentro il poligono: spingi verso il bordo più vicino
    return { pushX: bestNx * (bestDist + radius), pushZ: bestNz * (bestDist + radius), nx: bestNx, nz: bestNz, inside: true };
  }
  if (bestDist < radius) {
    const push = radius - bestDist;
    return { pushX: bestNx * push, pushZ: bestNz * push, nx: bestNx, nz: bestNz, inside: false };
  }
  return null;
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

export function polygonCentroid(poly) {
  let area = 0, cx = 0, cz = 0;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const f = poly[j][0] * poly[i][1] - poly[i][0] * poly[j][1];
    area += f;
    cx += (poly[j][0] + poly[i][0]) * f;
    cz += (poly[j][1] + poly[i][1]) * f;
  }
  if (Math.abs(area) < 1e-9) {
    return [poly.reduce((s, p) => s + p[0], 0) / poly.length, poly.reduce((s, p) => s + p[1], 0) / poly.length];
  }
  return [cx / (3 * area), cz / (3 * area)];
}

export function formatDistance(meters) {
  if (!Number.isFinite(meters)) return '';
  if (meters < 1000) return `${Math.round(meters)} m`;
  return `${(meters / 1000).toFixed(meters < 10000 ? 1 : 0)} km`;
}

export function formatTime(seconds) {
  const s = Math.max(0, Math.ceil(seconds));
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

export function formatNumber(n) {
  return new Intl.NumberFormat('it-IT').format(Math.round(n));
}

export function escapeHtml(str) {
  return String(str).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

export function projectLatLon(lat, lon) {
  return {
    x: (lon - WORLD.origin.lon) * WORLD.mPerDegLon,
    z: -(lat - WORLD.origin.lat) * WORLD.mPerDegLat
  };
}

export function unproject(x, z) {
  return {
    lat: WORLD.origin.lat - z / WORLD.mPerDegLat,
    lon: WORLD.origin.lon + x / WORLD.mPerDegLon
  };
}

export function terrainHeightAt(terrain, x, z) {
  if (!terrain) return 0;
  const meta = terrain.meta || terrain;
  const bounds = meta.bounds;
  const grid = meta.grid;
  const heights = terrain.heights;
  if (!bounds || !grid || !heights) return 0;
  const { lat, lon } = unproject(x, z);
  const u = clamp((lon - bounds.west) / (bounds.east - bounds.west), 0, 1);
  const v = clamp((bounds.north - lat) / (bounds.north - bounds.south), 0, 1);
  const gx = u * (grid - 1);
  const gz = v * (grid - 1);
  const x0 = Math.floor(gx), z0 = Math.floor(gz);
  const x1 = Math.min(x0 + 1, grid - 1), z1 = Math.min(z0 + 1, grid - 1);
  const fx = gx - x0, fz = gz - z0;
  const h00 = heights[z0 * grid + x0];
  const h10 = heights[z0 * grid + x1];
  const h01 = heights[z1 * grid + x0];
  const h11 = heights[z1 * grid + x1];
  return h00 * (1 - fx) * (1 - fz) + h10 * fx * (1 - fz) + h01 * (1 - fx) * fz + h11 * fx * fz;
}

export function groundHeightAt(terrain, x, z, base = 0) {
  // Dentro l'area urbana il suolo è piatto; fuori segue il rilievo reale.
  const f = WORLD.flat;
  const inside = x > f.minX && x < f.maxX && z > f.minZ && z < f.maxZ;
  if (inside) return base;
  const h = terrainHeightAt(terrain, x, z);
  const cx = clamp(x, f.minX, f.maxX);
  const cz = clamp(z, f.minZ, f.maxZ);
  const edgeDist = Math.hypot(x - cx, z - cz);
  const blend = clamp(edgeDist / 220, 0, 1);
  return base + (h - 72) * blend;
}

export function canvasRoundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

export function chooseWeighted(items) {
  let total = 0;
  for (const it of items) total += it.weight || 1;
  let r = Math.random() * total;
  for (const it of items) {
    r -= it.weight || 1;
    if (r <= 0) return it;
  }
  return items[items.length - 1];
}

export function makeSpatialHash(cells, cellSize) {
  const map = new Map();
  const key = (x, z) => `${Math.floor(x / cellSize)},${Math.floor(z / cellSize)}`;
  return {
    insert(item, minX, minZ, maxX, maxZ) {
      for (let x = Math.floor(minX / cellSize); x <= Math.floor(maxX / cellSize); x++) {
        for (let z = Math.floor(minZ / cellSize); z <= Math.floor(maxZ / cellSize); z++) {
          const k = `${x},${z}`;
          if (!map.has(k)) map.set(k, []);
          map.get(k).push(item);
        }
      }
    },
    query(x, z, radius = 0) {
      const out = new Set();
      for (let ix = Math.floor((x - radius) / cellSize); ix <= Math.floor((x + radius) / cellSize); ix++) {
        for (let iz = Math.floor((z - radius) / cellSize); iz <= Math.floor((z + radius) / cellSize); iz++) {
          const arr = map.get(`${ix},${iz}`);
          if (arr) for (const item of arr) out.add(item);
        }
      }
      return out;
    }
  };
}

export function bboxIntersects(a, b) {
  return a.minX <= b.maxX && a.maxX >= b.minX && a.minZ <= b.maxZ && a.maxZ >= b.minZ;
}
