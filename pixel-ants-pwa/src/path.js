export const DIRS = [
  { dx: 0, dy: -1 },
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 }
];

export function createPathfinder(board) {
  const width = board.width;
  const height = board.height;
  const gridW = width + 2;
  const gridH = height + 2;
  const size = gridW * gridH;

  function inside(x, y) {
    return x >= -1 && x <= width && y >= -1 && y <= height;
  }

  function key(x, y) {
    return (y + 1) * gridW + (x + 1);
  }

  function pointOf(index) {
    return { x: index % gridW - 1, y: ((index / gridW) | 0) - 1 };
  }

  function walkable(x, y) {
    return inside(x, y) && board.isOpen(x, y);
  }

  function distanceField(originX, originY) {
    const dist = new Int32Array(size);
    const prev = new Int32Array(size);
    dist.fill(-1);
    prev.fill(-1);
    if (!walkable(originX, originY)) return { dist, prev, origin: -1 };
    const queue = new Int32Array(size);
    let head = 0;
    let tail = 0;
    const origin = key(originX, originY);
    dist[origin] = 0;
    queue[tail++] = origin;
    while (head < tail) {
      const current = queue[head++];
      const point = pointOf(current);
      const nextDistance = dist[current] + 1;
      for (let d = 0; d < DIRS.length; d++) {
        const nx = point.x + DIRS[d].dx;
        const ny = point.y + DIRS[d].dy;
        if (!walkable(nx, ny)) continue;
        const next = key(nx, ny);
        if (dist[next] !== -1) continue;
        dist[next] = nextDistance;
        prev[next] = current;
        queue[tail++] = next;
      }
    }
    return { dist, prev, origin };
  }

  function pathFrom(field, x, y) {
    if (field.origin < 0) return null;
    const target = key(x, y);
    if (field.dist[target] < 0) return null;
    const reversed = [];
    let at = target;
    while (at !== -1) {
      reversed.push(pointOf(at));
      if (at === field.origin) break;
      at = field.prev[at];
    }
    reversed.reverse();
    return reversed;
  }

  function targetAccess(field, index) {
    const x = board.xOf(index);
    const y = board.yOf(index);
    let best = null;
    for (let d = 0; d < DIRS.length; d++) {
      const ax = x + DIRS[d].dx;
      const ay = y + DIRS[d].dy;
      if (!walkable(ax, ay)) continue;
      const distance = field.dist[key(ax, ay)];
      if (distance < 0) continue;
      if (!best || distance < best.distance) best = { x: ax, y: ay, distance };
    }
    return best;
  }

  function findTarget(originX, originY, color, rng) {
    const field = distanceField(originX, originY);
    if (field.origin < 0) return null;
    const candidates = board.availableIndices(color);
    if (!candidates.length) return null;

    let minShell = Infinity;
    const scored = [];
    for (let i = 0; i < candidates.length; i++) {
      const index = candidates[i];
      const access = targetAccess(field, index);
      if (!access) continue;
      /* Prefer the outer rings of the picture. Only when a colour has no
       * available pixel in the outermost ring do ants move one layer deeper. */
      const x = board.xOf(index);
      const y = board.yOf(index);
      const shell = Math.min(x, y, width - 1 - x, height - 1 - y);
      if (shell < minShell) minShell = shell;
      scored.push({ index, access, shell });
    }
    if (!scored.length) return null;

    const outer = scored.filter((entry) => entry.shell === minShell);
    let minDistance = Infinity;
    for (const entry of outer) {
      if (entry.access.distance < minDistance) minDistance = entry.access.distance;
    }
    const pool = outer.filter((entry) => entry.access.distance <= minDistance + 1);
    const chosen = pool[Math.min(pool.length - 1, Math.floor((rng ? rng() : 0) * pool.length))];
    const path = pathFrom(field, chosen.access.x, chosen.access.y);
    if (!path) return null;
    return {
      index: chosen.index,
      access: { x: chosen.access.x, y: chosen.access.y },
      distance: chosen.access.distance,
      shell: chosen.shell,
      path
    };
  }

  return {
    width,
    height,
    gridW,
    gridH,
    key,
    pointOf,
    walkable,
    distanceField,
    pathFrom,
    targetAccess,
    findTarget
  };
}
