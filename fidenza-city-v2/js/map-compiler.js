/**
 * Fidenza da Giocare v2 — compilatore mappa condiviso
 *
 * Trasforma il manifest editabile + i dati geometrici in un bundle usato dal
 * gioco. Funziona sia in Node (tools/import-map.mjs) sia nel browser
 * (fidenza-editor).
 *
 * Modulo puro: nessuna dipendenza da Three.js o dal DOM.
 */

export function project(lat, lon, origin) {
  const mPerDegLat = 111132.0;
  const mPerDegLon = 111320.0 * Math.cos(origin.lat * Math.PI / 180);
  return {
    x: +((lon - origin.lon) * mPerDegLon).toFixed(2),
    z: +(-(lat - origin.lat) * mPerDegLat).toFixed(2)
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

export function distToPoly(x, z, poly) {
  let best = Infinity;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const ax = poly[j][0], az = poly[j][1], bx = poly[i][0], bz = poly[i][1];
    const dx = bx - ax, dz = bz - az;
    const l2 = dx * dx + dz * dz || 1;
    const t = Math.max(0, Math.min(1, ((x - ax) * dx + (z - az) * dz) / l2));
    best = Math.min(best, Math.hypot(x - (ax + dx * t), z - (az + dz * t)));
  }
  return best;
}

export function makeFreeTest(city) {
  const buildings = city?.buildings || [];
  return (x, z, r = 0.5) => !buildings.some(b => pointInPoly(x, z, b.poly) || distToPoly(x, z, b.poly) < r);
}

export function makeRoadPoints(city) {
  const out = [];
  for (const r of city?.roads || []) {
    for (const p of r.pts) out.push({ x: p[0], z: p[1] });
  }
  return out;
}

export function findSpot(place, free, roadPoints) {
  if (place.beacon && free(place.beacon.x, place.beacon.z, 0.4)) {
    return { x: +place.beacon.x.toFixed(2), z: +place.beacon.z.toFixed(2) };
  }
  const category = place.category || '';
  if (['park', 'square', 'museum', 'nature'].includes(category) && free(place.x, place.z, 0.4)) {
    return { x: +place.x.toFixed(2), z: +place.z.toFixed(2) };
  }
  const candidates = [];
  for (const p of roadPoints) {
    const d = Math.hypot(p.x - place.x, p.z - place.z);
    if (d < 60) candidates.push({ ...p, d });
  }
  candidates.sort((a, b) => a.d - b.d);
  for (const p of candidates.slice(0, 120)) {
    if (free(p.x, p.z, 0.4)) return { x: +p.x.toFixed(2), z: +p.z.toFixed(2) };
  }
  for (let r = 2; r <= 30; r += 2) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const x = place.x + Math.cos(a) * r;
      const z = place.z + Math.sin(a) * r;
      if (free(x, z, 0.4)) return { x: +x.toFixed(2), z: +z.toFixed(2) };
    }
  }
  return { x: +place.x.toFixed(2), z: +place.z.toFixed(2) };
}

export function adjustMissionPoint(x, z, free) {
  if (free(x, z, 0.7)) return { x: +x.toFixed(2), z: +z.toFixed(2) };
  for (let r = 2; r <= 30; r += 2) {
    for (let a = 0; a < Math.PI * 2; a += Math.PI / 8) {
      const nx = x + Math.cos(a) * r;
      const nz = z + Math.sin(a) * r;
      if (free(nx, nz, 0.7)) return { x: +nx.toFixed(2), z: +nz.toFixed(2) };
    }
  }
  return { x: +x.toFixed(2), z: +z.toFixed(2) };
}

export function compileMap(map, city) {
  const origin = map.origin || map.center;
  const free = makeFreeTest(city);
  const roadPoints = makeRoadPoints(city);

  const places = (map.places || []).map(p => {
    const xy = project(p.lat, p.lon, origin);
    const place = { ...p, x: xy.x, z: xy.z };
    const spot = findSpot(place, free, roadPoints);
    return { ...place, beaconX: spot.x, beaconZ: spot.z };
  });
  const byId = new Map(places.map(p => [p.id, p]));

  const landmarks = (map.landmarks || []).map(l => {
    const place = byId.get(l.place);
    if (!place) return null;
    return {
      id: l.id,
      placeId: place.id,
      name: place.name,
      short: place.short || place.name,
      type: l.model || l.type,
      model: l.model || l.type,
      rotation: Number(l.rotation) || 0,
      offsetX: Number(l.offsetX) || 0,
      offsetZ: Number(l.offsetZ) || 0,
      scale: Number.isFinite(l.scale) ? l.scale : 1,
      hidden: !!l.hidden,
      x: place.x,
      z: place.z,
      lat: place.lat,
      lon: place.lon,
      radius: place.radius || 8,
      collectible: !!place.collectible,
      description: place.description || '',
      fact: place.fact || ''
    };
  }).filter(Boolean);

  const missions = (map.missions || []).map(m => {
    const steps = (m.steps || []).map(s => {
      let x = s.x, z = s.z;
      if (s.place) {
        const p = byId.get(s.place);
        if (p) {
          const baseX = p.beaconX ?? p.x;
          const baseZ = p.beaconZ ?? p.z;
          x = baseX + (Number(s.offsetX) || 0);
          z = baseZ + (Number(s.offsetZ) || 0);
        }
      }
      const adjusted = adjustMissionPoint(Number(x) || 0, Number(z) || 0, free);
      return {
        x: adjusted.x,
        z: adjusted.z,
        name: s.name || '',
        prompt: s.prompt || 'interagisci',
        comment: s.comment || '',
        radius: Number(s.radius) || 12,
        photo: !!s.photo,
        photoRequired: !!s.photoRequired,
        placeId: s.place || null
      };
    });
    return {
      id: m.id,
      type: m.type || m.id,
      title: m.title || m.id,
      short: m.short || '',
      event: m.event || null,
      time: Number(m.time) || 150,
      reward: Number(m.reward) || 500,
      chase: !!m.chase,
      steps
    };
  });

  const stars = (map.stars?.length ? map.stars : (city?.stars || []))
    .map((s, i) => ({ id: s.id || `star-${i}`, x: +Number(s.x).toFixed(2), z: +Number(s.z).toFixed(2) }));

  const vehicles = Array.isArray(map.vehicles)
    ? map.vehicles.map(v => ({
        type: v.type || 'car',
        label: v.label || (v.type === 'vespa' ? 'Vespa' : 'Auto'),
        x: +Number(v.x).toFixed(2),
        z: +Number(v.z).toFixed(2),
        yaw: Number(v.yaw) || 0,
        color: v.color || '#c2684b',
        taxi: !!v.taxi
      }))
    : null;

  const props = (map.props || []).map((p, i) => ({
    id: p.id || `prop-${i + 1}`,
    type: p.type || 'sign',
    x: +Number(p.x || 0).toFixed(2),
    z: +Number(p.z || 0).toFixed(2),
    rotation: Number(p.rotation) || 0,
    scale: Number.isFinite(p.scale) ? Number(p.scale) : 1,
    color: p.color || '',
    text: p.text || '',
    sub: p.sub || '',
    width: Number(p.width) || 0,
    height: Number(p.height) || 0,
    hidden: !!p.hidden
  })).filter(p => !p.hidden);

  const districts = (map.districts || []).map(d => ({
    id: d.id,
    name: d.name || d.id,
    x: +Number(d.x || 0).toFixed(2),
    z: +Number(d.z || 0).toFixed(2),
    color: d.color || '#8a7f6a',
    ambience: d.ambience || 'city',
    description: d.description || ''
  }));

  const venues = (map.venues || []).map(v => ({
    id: v.id,
    type: v.type || 'bar',
    name: v.name || v.id,
    x: +Number(v.x || 0).toFixed(2),
    z: +Number(v.z || 0).toFixed(2),
    color: v.color || '#2f6fa8',
    description: v.description || '',
    hours: v.hours || null,
    existing: !!v.existing,
    custom: !!v.custom
  }));

  const custom = map.custom || {};
  const customCounts = Object.fromEntries(
    ['buildings', 'roads', 'areas', 'waterways', 'railways']
      .map(group => [group, Array.isArray(custom[group]) ? custom[group].length : 0])
  );

  return {
    meta: {
      id: map.id,
      name: map.name,
      version: map.version || '2.0.0',
      generated: new Date().toISOString(),
      center: map.center,
      origin,
      bbox: map.bbox,
      projection: map.projection || 'local-tangent',
      attribution: map.attribution || {},
      counts: {
        places: places.length,
        collectibles: places.filter(p => p.collectible).length,
        landmarks: landmarks.length,
        missions: missions.length,
        stars: stars.length,
        vehicles: vehicles?.length ?? 0,
        props: props.length,
        districts: districts.length,
        venues: venues.length,
        buildings: city?.buildings?.length || 0,
        roads: city?.roads?.length || 0,
        areas: city?.areas?.length || 0,
        waterways: city?.waterways?.length || 0,
        railways: city?.railways?.length || 0,
        customFeatures: Object.values(customCounts).reduce((n, v) => n + v, 0)
      }
    },
    places,
    landmarks,
    missions,
    stars,
    vehicles,
    props,
    districts,
    venues,
    spawn: map.spawn || null,
    missionBoard: map.missionBoard || null,
    overrides: map.overrides || {},
    custom,
    seasons: map.seasons || { default: 'auto', styles: {} }
  };
}
