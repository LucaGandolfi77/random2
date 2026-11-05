/**
 * Fidenza da Giocare v2.11 — insegne delle attività
 *
 * Associa i POI commerciali all'edificio più vicino e calcola la posizione
 * dell'insegna sulla facciata. Funzioni pure condivise da mondo e audit.
 */

export const POI_SIGN_TYPES = {
  restaurant: { label: 'RISTORANTE', color: '#8a3f2f', glyph: 'R' },
  cafe: { label: 'CAFFÈ', color: '#7a5a3a', glyph: 'C' },
  bar: { label: 'BAR', color: '#5b3a5a', glyph: 'B' },
  pub: { label: 'PUB', color: '#6b4a2f', glyph: 'P' },
  fast_food: { label: 'FAST FOOD', color: '#9a4a34', glyph: 'F' },
  bakery: { label: 'PANIFICIO', color: '#a8865b', glyph: 'P' },
  pharmacy: { label: 'FARMACIA', color: '#2f6b4f', glyph: '+' },
  bank: { label: 'BANCA', color: '#3f5f7a', glyph: '€' },
  hotel: { label: 'HOTEL', color: '#7a5a8a', glyph: 'H' },
  museum: { label: 'MUSEO', color: '#5d7a52', glyph: 'M' },
  shop: { label: 'NEGOZIO', color: '#6b5a43', glyph: 'S' },
  supermarket: { label: 'SUPERMERCATO', color: '#3f748a', glyph: 'S' }
};

function pointInPoly(x, z, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const xi = poly[i][0], zi = poly[i][1], xj = poly[j][0], zj = poly[j][1];
    if (((zi > z) !== (zj > z)) && (x < (xj - xi) * (z - zi) / (zj - zi) + xi)) inside = !inside;
  }
  return inside;
}

function segmentDistance(px, pz, ax, az, bx, bz) {
  const dx = bx - ax, dz = bz - az;
  const len2 = dx * dx + dz * dz || 1;
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (pz - az) * dz) / len2));
  return { d: Math.hypot(px - (ax + dx * t), pz - (az + dz * t)), t };
}

function buildingDistance(x, z, building) {
  let best = Infinity;
  const poly = building.poly || [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const d = segmentDistance(x, z, a[0], a[1], b[0], b[1]).d;
    if (d < best) best = d;
  }
  return pointInPoly(x, z, poly) ? 0 : best;
}

function buildingEdges(building, x, z) {
  const edges = [];
  const poly = building.poly || [];
  for (let i = 0; i < poly.length; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const dx = b[0] - a[0], dz = b[1] - a[1];
    const len = Math.hypot(dx, dz);
    if (len < 1.2) continue;
    const seg = segmentDistance(x, z, a[0], a[1], b[0], b[1]);
    const edge = {
      d: seg.d,
      t: seg.t,
      ax: a[0], az: a[1], bx: b[0], bz: b[1],
      ux: dx / len, uz: dz / len,
      nx: -dz / len, nz: dx / len,
      len
    };
    // Normale rivolta verso l'esterno dell'edificio.
    const mx = edge.ax + (edge.bx - edge.ax) * edge.t;
    const mz = edge.az + (edge.bz - edge.az) * edge.t;
    if ((mx - building.x) * edge.nx + (mz - building.z) * edge.nz < 0) {
      edge.nx = -edge.nx;
      edge.nz = -edge.nz;
    }
    edges.push(edge);
  }
  return edges.sort((a, b) => a.d - b.d);
}

export function findSignType(poi) {
  return POI_SIGN_TYPES[poi.subtype] || POI_SIGN_TYPES[poi.kind] || null;
}

export function planPoiSigns(city) {
  const buildings = city.buildings || [];
  const signs = [];
  const skipped = [];
  const placedByBuilding = new Map();
  for (const poi of city.pois || []) {
    const type = findSignType(poi);
    if (!type) continue;
    if (!poi.name) { skipped.push({ poi, reason: 'no-name' }); continue; }
    let best = null;
    for (const b of buildings) {
      if (!b.poly || b.poly.length < 3 || b.h < 4.2 || b.kind === 'roof') continue;
      const d = buildingDistance(poi.x, poi.z, b);
      if (!best || d < best.d) best = { b, d };
    }
    if (!best || best.d > 28) {
      skipped.push({ poi, reason: 'no-building' });
      continue;
    }
    const edges = buildingEdges(best.b, poi.x, poi.z);
    if (!edges.length) {
      skipped.push({ poi, reason: 'no-edge' });
      continue;
    }
    const existing = placedByBuilding.get(best.b.id) || [];
    let placed = null;
    for (const edge of edges) {
      const t = Math.max(0.25, Math.min(0.75, edge.t));
      const maxWidth = Math.max(0, 2 * Math.min(t * edge.len, (1 - t) * edge.len) - 0.35);
      const desired = Math.min(4.8, Math.max(1.55, poi.name.length * 0.26 + 1.15));
      const width = Math.min(desired, maxWidth);
      if (width < 1.15) continue;
      const y = Math.min(3.45, best.b.h - 0.95);
      if (y < 2.4) continue;
      const px = edge.ax + (edge.bx - edge.ax) * t + edge.nx * 0.09;
      const pz = edge.az + (edge.bz - edge.az) * t + edge.nz * 0.09;
      const overlap = existing.some(other =>
        Math.hypot(other.x - px, other.z - pz) < (other.width + width) / 2 + 0.2
      );
      if (overlap) continue;
      placed = {
        poi,
        building: best.b,
        type,
        x: +px.toFixed(2),
        y: +y.toFixed(2),
        z: +pz.toFixed(2),
        width: +width.toFixed(2),
        height: 0.78,
        rotation: Math.atan2(edge.nx, edge.nz),
        awning: ['restaurant', 'cafe', 'bar', 'pub', 'fast_food'].includes(poi.subtype)
      };
      break;
    }
    if (!placed) {
      skipped.push({ poi, reason: 'overlap' });
      continue;
    }
    signs.push(placed);
    existing.push(placed);
    placedByBuilding.set(best.b.id, existing);
  }
  return {
    signs,
    skipped,
    totals: {
      pois: (city.pois || []).length,
      eligible: signs.length + skipped.filter(s => s.reason !== 'no-name').length,
      signs: signs.length,
      skipped: skipped.length
    }
  };
}
