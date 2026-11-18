export const ROAD_WIDTHS = {
  motorway: 14, motorway_link: 7, trunk: 13, trunk_link: 7,
  primary: 10, primary_link: 5.5, secondary: 8.5, secondary_link: 5,
  tertiary: 7, tertiary_link: 4.5, unclassified: 5.5, residential: 6,
  living_street: 5, service: 4, pedestrian: 6, footway: 2.1,
  path: 1.9, cycleway: 2.4, track: 3, steps: 2.2
};

export const WIDTH_MIN = 1.5;
export const WIDTH_MAX = 30;

export const EXCLUDED_HIGHWAYS = new Set([
  'proposed', 'construction', 'abandoned', 'disused', 'planned', 'razed'
]);

export function clampWidth(value) {
  return +Math.max(WIDTH_MIN, Math.min(WIDTH_MAX, value)).toFixed(2);
}

export function parseWidth(value) {
  if (value == null) return null;
  const text = String(value).trim().toLowerCase();
  if (!text) return null;
  const match = text.replace(',', '.').match(/-?\d+(?:\.\d+)?/);
  if (!match) return null;
  let number = Number(match[0]);
  if (/\b(ft|feet|foot)\b/.test(text)) number *= 0.3048;
  if (/\bcm\b/.test(text)) number /= 100;
  if (/\bmm\b/.test(text)) number /= 1000;
  return Number.isFinite(number) && number > 0 ? number : null;
}

export function parseLanes(value) {
  if (value == null) return 0;
  const match = String(value).replace(',', '.').match(/\d+(?:\.\d+)?/);
  return match ? Number(match[0]) : 0;
}

export function osmRoadWidth(tags = {}, kind = 'residential') {
  const taggedWidth = parseWidth(tags.width ?? tags['width:carriageway']);
  if (taggedWidth) return clampWidth(taggedWidth);
  const lanes = parseLanes(tags.lanes);
  if (lanes > 0) return clampWidth(lanes * 3.1 + 1.2);
  return ROAD_WIDTHS[kind] || 5.5;
}

function segmentDistance(p, a, b) {
  const dx = b[0] - a[0];
  const dz = b[1] - a[1];
  const length2 = dx * dx + dz * dz;
  if (length2 < 1e-9) return Math.hypot(p[0] - a[0], p[1] - a[1]);
  const t = Math.max(0, Math.min(1, ((p[0] - a[0]) * dx + (p[1] - a[1]) * dz) / length2));
  return Math.hypot(p[0] - (a[0] + dx * t), p[1] - (a[1] + dz * t));
}

export function distanceToPolyline(p, points) {
  let best = Infinity;
  for (let i = 1; i < points.length; i++) {
    const d = segmentDistance(p, points[i - 1], points[i]);
    if (d < best) best = d;
  }
  return best;
}

function samplePoints(points, count = 5) {
  if (points.length <= count) return points;
  const out = [];
  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    out.push(points[Math.round(t * (points.length - 1))]);
  }
  return out;
}

function lineDirection(points) {
  if (points.length < 2) return [0, 0];
  const [ax, az] = points[0];
  const [bx, bz] = points[points.length - 1];
  const length = Math.hypot(bx - ax, bz - az) || 1;
  return [(bx - ax) / length, (bz - az) / length];
}

function averageDistance(a, b) {
  const samples = samplePoints(a.pts);
  let total = 0;
  for (const point of samples) total += distanceToPolyline(point, b.pts);
  return total / samples.length;
}

function detectDualCarriageways(roads) {
  const groups = new Map();
  for (const road of roads) {
    if (!road.oneway || road.roundabout || road.length < 18 || !road.name) continue;
    const key = `${road.name.trim().toLowerCase()}|${road.kind}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(road);
  }
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    for (let i = 0; i < group.length; i++) {
      for (let j = i + 1; j < group.length; j++) {
        const a = group[i];
        const b = group[j];
        const [ax, az] = lineDirection(a.pts);
        const [bx, bz] = lineDirection(b.pts);
        if (ax * bx + az * bz > -0.25) continue;
        const ab = averageDistance(a, b);
        const ba = averageDistance(b, a);
        if (Math.max(ab, ba) > 24) continue;
        a.dual = true;
        b.dual = true;
      }
    }
  }
}

function weightedMedian(entries) {
  const sorted = entries.filter(entry => Number.isFinite(entry.value) && entry.weight > 0)
    .sort((a, b) => a.value - b.value);
  if (!sorted.length) return null;
  const total = sorted.reduce((sum, entry) => sum + entry.weight, 0);
  let seen = 0;
  for (const entry of sorted) {
    seen += entry.weight;
    if (seen >= total / 2) return entry.value;
  }
  return sorted[sorted.length - 1].value;
}

function widthCandidate(road) {
  if (Number.isFinite(road.widthTag) && road.widthTag > 0) {
    return road.dual && road.widthTag > 6.5 ? road.widthTag / 2 : road.widthTag;
  }
  if (road.lanes > 0) return road.lanes * 3.1 + 1.2;
  const fallback = ROAD_WIDTHS[road.kind] || 5.5;
  if (road.dual) return fallback / 2;
  return fallback;
}

function widthSource(road) {
  if (Number.isFinite(road.widthTag) && road.widthTag > 0) return 'tag';
  if (road.lanes > 0) return 'lanes';
  return 'class';
}

export function normalizeRoadWidths(roads) {
  for (const road of roads) {
    if (!Number.isFinite(road.wOsm)) road.wOsm = Number(road.w) || ROAD_WIDTHS[road.kind] || 5.5;
    if (!Number.isFinite(road.widthTag)) road.widthTag = null;
    if (!Number.isFinite(road.lanes)) road.lanes = 0;
    road.oneway = !!road.oneway;
    road.roundabout = !!road.roundabout;
    road.dual = road.dualCarriageway === true;
    road.wSource = widthSource(road);
  }

  detectDualCarriageways(roads);

  const groups = new Map();
  for (const road of roads) {
    const name = road.name?.trim().toLowerCase();
    const carriageway = road.dual ? 'dual' : 'normal';
    const key = name ? `${name}|${road.kind}|${carriageway}` : `__unnamed__|${road.kind}|${carriageway}`;
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(road);
  }

  const report = { groups: 0, dualSegments: 0, changed: 0 };
  for (const [key, group] of groups) {
    const entries = group.map(road => ({
      value: widthCandidate(road),
      weight: Math.max(1, Number(road.length) || 1)
    }));
    const median = weightedMedian(entries);
    if (median == null) continue;
    let groupWidth = clampWidth(median);
    if (key.startsWith('__unnamed__') && group.every(road => road.oneway && !road.dual)) {
      groupWidth = Math.min(groupWidth, 6);
    }
    report.groups++;
    for (const road of group) {
      let width = groupWidth;
      if (road.dual) {
        if (Number.isFinite(road.widthTag) && road.widthTag > 0) {
          width = road.widthTag > 6.5 ? road.widthTag / 2 : road.widthTag;
        } else {
          width = Math.max(3.8, groupWidth);
        }
        report.dualSegments++;
      }
      width = clampWidth(width);
      if (Math.abs(width - road.wOsm) >= 0.05) report.changed++;
      road.w = width;
      road.wGroup = key;
      road.wGroupWidth = groupWidth;
      road.wNormalized = true;
    }
  }

  return report;
}
