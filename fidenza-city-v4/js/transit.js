/**
 * Fidenza da Giocare v2.3 — transit
 *
 * Costruisce un grafo delle strade percorribili e calcola un percorso reale
 * per la navetta urbana. Nessuna dipendenza da Three.js o dal DOM.
 */

const BUS_ROADS = new Set([
  'primary', 'secondary', 'tertiary', 'residential', 'unclassified', 'living_street'
]);

const keyOf = (x, z, step = 1) => `${Math.round(x / step) * step},${Math.round(z / step) * step}`;

function addNode(graph, x, z) {
  const key = keyOf(x, z, 1);
  let node = graph.nodes.get(key);
  if (!node) {
    node = { id: key, x, z, adj: [] };
    graph.nodes.set(key, node);
  }
  return node;
}

function addEdge(a, b) {
  if (a === b) return;
  const cost = Math.hypot(a.x - b.x, a.z - b.z);
  if (cost < 0.01) return;
  if (!a.adj.some(e => e.to === b.id)) a.adj.push({ to: b.id, cost });
  if (!b.adj.some(e => e.to === a.id)) b.adj.push({ to: a.id, cost });
}

export function buildRoadGraph(city) {
  const graph = { nodes: new Map(), endpoints: [] };
  for (const road of city?.roads || []) {
    if (!BUS_ROADS.has(road.kind) || !road.pts?.length) continue;
    let prev = null;
    for (let i = 0; i < road.pts.length; i++) {
      const [x, z] = road.pts[i];
      const node = addNode(graph, x, z);
      if (prev) addEdge(prev, node);
      prev = node;
    }
    if (road.pts.length) {
      const first = graph.nodes.get(keyOf(road.pts[0][0], road.pts[0][1], 1));
      const last = graph.nodes.get(keyOf(road.pts[road.pts.length - 1][0], road.pts[road.pts.length - 1][1], 1));
      if (first) graph.endpoints.push(first);
      if (last) graph.endpoints.push(last);
    }
  }

  // Collega estremi di strade diverse che si toccano quasi.
  const buckets = new Map();
  const bucketKey = (x, z) => `${Math.floor(x / 8)},${Math.floor(z / 8)}`;
  for (const node of graph.endpoints) {
    const key = bucketKey(node.x, node.z);
    if (!buckets.has(key)) buckets.set(key, []);
    buckets.get(key).push(node);
  }
  const linked = new Set();
  for (const node of graph.endpoints) {
    const bx = Math.floor(node.x / 8);
    const bz = Math.floor(node.z / 8);
    for (let dx = -1; dx <= 1; dx++) {
      for (let dz = -1; dz <= 1; dz++) {
        for (const other of buckets.get(`${bx + dx},${bz + dz}`) || []) {
          if (other === node) continue;
          const pair = node.id < other.id ? `${node.id}|${other.id}` : `${other.id}|${node.id}`;
          if (linked.has(pair)) continue;
          if (Math.hypot(node.x - other.x, node.z - other.z) <= 7) {
            linked.add(pair);
            addEdge(node, other);
          }
        }
      }
    }
  }
  return graph;
}

export function nearestRoadNode(graph, x, z) {
  let best = null;
  for (const node of graph.nodes.values()) {
    const d = Math.hypot(node.x - x, node.z - z);
    if (!best || d < best.d) best = { node, d };
  }
  return best?.node || null;
}

function heapPush(heap, item) {
  heap.push(item);
  let i = heap.length - 1;
  while (i > 0) {
    const p = (i - 1) >> 1;
    if (heap[p].f <= heap[i].f) break;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}

function heapPop(heap) {
  const top = heap[0];
  const last = heap.pop();
  if (heap.length && last) {
    heap[0] = last;
    let i = 0;
    for (;;) {
      const l = i * 2 + 1;
      const r = l + 1;
      let m = i;
      if (l < heap.length && heap[l].f < heap[m].f) m = l;
      if (r < heap.length && heap[r].f < heap[m].f) m = r;
      if (m === i) break;
      [heap[m], heap[i]] = [heap[i], heap[m]];
      i = m;
    }
  }
  return top;
}

export function findRoadPath(graph, start, goal) {
  if (!start || !goal) return [];
  if (start === goal) return [{ x: start.x, z: start.z }];
  const gScore = new Map([[start.id, 0]]);
  const came = new Map();
  const closed = new Set();
  const open = [];
  heapPush(open, { id: start.id, f: Math.hypot(start.x - goal.x, start.z - goal.z) });
  while (open.length) {
    const current = heapPop(open);
    if (!current || closed.has(current.id)) continue;
    if (current.id === goal.id) break;
    closed.add(current.id);
    const node = graph.nodes.get(current.id);
    if (!node) continue;
    for (const edge of node.adj) {
      if (closed.has(edge.to)) continue;
      const next = graph.nodes.get(edge.to);
      if (!next) continue;
      const score = (gScore.get(node.id) || 0) + edge.cost;
      if (score >= (gScore.get(next.id) ?? Infinity)) continue;
      gScore.set(next.id, score);
      came.set(next.id, node.id);
      const h = Math.hypot(next.x - goal.x, next.z - goal.z);
      heapPush(open, { id: next.id, f: score + h });
    }
  }
  if (!gScore.has(goal.id)) return [];
  const ids = [goal.id];
  let cursor = goal.id;
  while (cursor !== start.id) {
    cursor = came.get(cursor);
    if (!cursor) return [];
    ids.push(cursor);
  }
  ids.reverse();
  return ids.map(id => {
    const n = graph.nodes.get(id);
    return { x: n.x, z: n.z };
  });
}

export function makeLoopRoute(points) {
  const clean = [];
  for (const p of points || []) {
    const last = clean[clean.length - 1];
    if (!last || Math.hypot(last.x - p.x, last.z - p.z) > 0.4) clean.push({ x: p.x, z: p.z });
  }
  if (clean.length > 1) {
    const first = clean[0];
    const last = clean[clean.length - 1];
    if (Math.hypot(first.x - last.x, first.z - last.z) > 0.4) clean.push({ x: first.x, z: first.z });
  }
  const segs = [];
  let total = 0;
  for (let i = 1; i < clean.length; i++) {
    const a = clean[i - 1];
    const b = clean[i];
    const len = Math.hypot(b.x - a.x, b.z - a.z);
    if (len < 0.01) continue;
    segs.push({ ax: a.x, az: a.z, bx: b.x, bz: b.z, len, start: total });
    total += len;
  }
  return {
    points: clean,
    segs,
    total,
    pose(t) {
      if (!total) return { x: 0, z: 0, dx: 0, dz: 1 };
      const d = ((t % total) + total) % total;
      for (const s of segs) {
        if (d <= s.start + s.len || s === segs[segs.length - 1]) {
          const u = Math.max(0, Math.min(1, (d - s.start) / s.len));
          const dx = s.bx - s.ax;
          const dz = s.bz - s.az;
          return { x: s.ax + dx * u, z: s.az + dz * u, dx, dz };
        }
      }
      return { x: 0, z: 0, dx: 0, dz: 1 };
    }
  };
}

export function buildBusRoute(city, stops) {
  const graph = buildRoadGraph(city);
  const nodes = stops.map(s => nearestRoadNode(graph, s.x, s.z)).filter(Boolean);
  if (nodes.length < 2) return null;
  const legs = [];
  for (let i = 0; i < nodes.length; i++) {
    const from = nodes[i];
    const to = nodes[(i + 1) % nodes.length];
    const path = findRoadPath(graph, from, to);
    legs.push(path.length ? path : [{ x: from.x, z: from.z }, { x: to.x, z: to.z }]);
  }
  const points = [];
  for (const leg of legs) {
    for (let i = 0; i < leg.length; i++) {
      if (points.length && i === 0) continue;
      points.push(leg[i]);
    }
  }
  const route = makeLoopRoute(points);
  if (!route.total) return null;

  // Distanza di ogni fermata lungo il percorso.
  const routeStops = stops.map(stop => {
    let best = { d: Infinity, t: 0 };
    let acc = 0;
    for (let i = 1; i < route.points.length; i++) {
      const a = route.points[i - 1];
      const b = route.points[i];
      const len = Math.hypot(b.x - a.x, b.z - a.z);
      const d = Math.hypot(stop.x - a.x, stop.z - a.z);
      if (d < best.d) best = { d, t: acc };
      acc += len;
    }
    return { ...stop, t: best.t };
  }).sort((a, b) => a.t - b.t);

  return { ...route, stops: routeStops };
}
