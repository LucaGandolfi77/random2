/**
 * Fidenza da Giocare v2.11 — pianificazione del traffico ambientale
 *
 * Le auto possono circolare solo su strade carrabili principali. Le strade
 * pedonali, ciclabili, di servizio e residenziali restano libere. Il modulo è
 * puro e viene usato sia dal mondo 3D sia dagli strumenti di audit.
 */

export const TRAFFIC_ROAD_KINDS = ['primary', 'secondary', 'tertiary'];

export const FORBIDDEN_TRAFFIC_KINDS = [
  'pedestrian', 'footway', 'cycleway', 'path', 'steps',
  'living_street', 'service', 'track', 'residential', 'unclassified'
];

export const TRAFFIC_COUNTS = {
  low: { total: 8, primary: 4, secondary: 2, tertiary: 2 },
  medium: { total: 14, primary: 6, secondary: 5, tertiary: 3 },
  high: { total: 22, primary: 8, secondary: 8, tertiary: 6 }
};

export function eligibleTrafficRoads(city) {
  return (city.roads || []).filter(road =>
    TRAFFIC_ROAD_KINDS.includes(road.kind) &&
    (road.length || 0) > 70 &&
    !road.tunnel &&
    Array.isArray(road.pts) &&
    road.pts.length >= 2
  );
}

function pickUnique(roads, count, rnd) {
  const picked = [];
  if (!roads.length) return picked;
  const pool = roads.slice();
  for (let i = 0; i < count; i++) {
    if (!pool.length) pool.push(...roads);
    const index = Math.floor(rnd() * pool.length);
    picked.push(pool.splice(index, 1)[0]);
  }
  return picked;
}

export function planTraffic(city, quality = 'high', rnd = Math.random) {
  const roads = eligibleTrafficRoads(city);
  if (!roads.length) return [];

  const counts = TRAFFIC_COUNTS[quality] || TRAFFIC_COUNTS.high;
  const byKind = {};
  for (const kind of TRAFFIC_ROAD_KINDS) byKind[kind] = roads.filter(r => r.kind === kind);

  // Assegna le auto per tipo di strada, ridistribuendo se una categoria è vuota.
  const allocation = {};
  let assigned = 0;
  for (const kind of TRAFFIC_ROAD_KINDS) {
    const wanted = counts[kind] || 0;
    const available = byKind[kind].length;
    allocation[kind] = Math.min(wanted, available);
    assigned += allocation[kind];
  }
  let remaining = Math.max(0, counts.total - assigned);
  const spareKinds = TRAFFIC_ROAD_KINDS.filter(kind => allocation[kind] < byKind[kind].length);
  let cursor = 0;
  while (remaining > 0 && spareKinds.length) {
    const kind = spareKinds[cursor % spareKinds.length];
    if (allocation[kind] < byKind[kind].length) {
      allocation[kind]++;
      remaining--;
    }
    cursor++;
    if (cursor > 10000) break;
  }

  const plans = [];
  for (const kind of TRAFFIC_ROAD_KINDS) {
    const count = allocation[kind] || 0;
    if (!count) continue;
    const chosen = pickUnique(byKind[kind], count, rnd);
    for (const road of chosen) {
      plans.push({
        roadId: road.id,
        kind: road.kind,
        offset: rnd() * Math.max(1, Math.min(90, (road.length || 90) - 1)),
        direction: rnd() > 0.5 ? 1 : -1,
        speed: 4.2 + rnd() * 2.5
      });
    }
  }
  return plans;
}

export function summarizeTraffic(plans) {
  const byKind = { primary: 0, secondary: 0, tertiary: 0 };
  const roads = new Set();
  for (const plan of plans) {
    if (byKind[plan.kind] !== undefined) byKind[plan.kind]++;
    roads.add(plan.roadId);
  }
  return {
    total: plans.length,
    byKind,
    uniqueRoads: roads.size,
    forbidden: plans.filter(plan => !TRAFFIC_ROAD_KINDS.includes(plan.kind)).length
  };
}
