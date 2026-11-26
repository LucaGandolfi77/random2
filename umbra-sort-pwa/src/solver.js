/*
 * Umbra Sort — deterministic level solver.
 *
 * The solver proves static solvability. Lifts and blackout timers are removed
 * because they are periodic and can be waited out; every generator block is
 * placed up front, which is the most crowded version of the real level.
 */

const DIRS = [[1, 0], [-1, 0], [0, 1], [0, -1]];

function prepare(spec) {
  const width = spec.width;
  const height = spec.height;
  const walls = new Set(spec.walls.map((p) => p.y * width + p.x));
  const generators = new Set(spec.generators.map((g) => g.y * width + g.x));
  const doors = spec.doors.map((door) => ({ ...door, filled: 0 }));
  const doorAt = new Map(doors.map((door) => [`${door.x},${door.y}`, door]));
  const occupied = new Set([...walls, ...generators]);
  const blocks = spec.blocks.map((block) => ({ ...block }));
  blocks.forEach((block) => occupied.add(block.y * width + block.x));

  function nearestEmpty(generator, count) {
    const queue = [{ x: generator.x, y: generator.y, distance: 0 }];
    const seen = new Set([generator.y * width + generator.x]);
    const found = [];
    while (queue.length && found.length < count) {
      queue.sort((a, b) => a.distance - b.distance);
      const current = queue.shift();
      for (const [dx, dy] of DIRS) {
        const x = current.x + dx;
        const y = current.y + dy;
        if (x < 0 || y < 1 || x >= width || y >= height) continue;
        const key = y * width + x;
        if (seen.has(key) || occupied.has(key) || doorAt.has(`${x},${y}`)) continue;
        seen.add(key);
        found.push({ x, y });
        if (found.length >= count) break;
        queue.push({ x, y, distance: current.distance + 1 });
      }
    }
    return found;
  }

  for (const generator of spec.generators) {
    const cells = nearestEmpty(generator, generator.total);
    if (cells.length < generator.total) return null;
    cells.forEach((cell, index) => {
      const block = { id: `solved-${generator.id}-${index}`, x: cell.x, y: cell.y, color: generator.color, gray: false };
      blocks.push(block);
      occupied.add(cell.y * width + cell.x);
    });
  }

  return { width, height, walls, generators, doors, doorAt, blocks };
}

function cloneState(state) {
  return {
    ...state,
    blocks: state.blocks.map((block) => ({ ...block })),
    doors: state.doors.map((door) => ({ ...door }))
  };
}

function stateKey(state) {
  const grid = new Array(state.width * state.height).fill(".");
  for (const key of state.walls) grid[key] = "#";
  for (const key of state.generators) grid[key] = "G";
  for (const block of state.blocks) grid[block.y * state.width + block.x] = block.gray ? "g" : String(block.color + 1);
  return grid.join("") + "|" + state.doors.map((door) => door.filled).join(",");
}

function emptyPath(state, start, targetPredicate) {
  const startKey = start.y * state.width + start.x;
  const blocked = new Set([...state.walls, ...state.generators]);
  for (const block of state.blocks) {
    if (block.x === start.x && block.y === start.y) continue;
    blocked.add(block.y * state.width + block.x);
  }
  const queue = [{ x: start.x, y: start.y, path: [] }];
  const seen = new Set([startKey]);
  while (queue.length) {
    const current = queue.shift();
    for (const [dx, dy] of DIRS) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (x < 0 || y < 0 || x >= state.width || y >= state.height) continue;
      const key = y * state.width + x;
      if (seen.has(key) || blocked.has(key)) continue;
      const path = current.path.concat([{ x, y }]);
      if (targetPredicate(x, y, path)) return path;
      seen.add(key);
      queue.push({ x, y, path });
    }
  }
  return null;
}

function captureMoves(state) {
  const moves = [];
  for (const block of state.blocks) {
    if (block.gray) continue;
    const door = state.doors.find((candidate) => candidate.color === block.color && candidate.filled < candidate.capacity);
    if (!door) continue;
    const path = emptyPath(state, block, (x, y) => x === door.x && y === door.y);
    if (path) moves.push({ type: "capture", id: block.id, color: block.color, path });
  }
  return moves.sort((a, b) => a.path.length - b.path.length);
}

function prismMoves(state) {
  const moves = [];
  for (const block of state.blocks) {
    if (!block.gray) continue;
    const colors = state.doors
      .filter((door) => door.filled < door.capacity)
      .sort((a, b) => (b.capacity - b.filled) - (a.capacity - a.filled))
      .map((door) => door.color);
    for (const color of colors) moves.push({ type: "prism", id: block.id, color });
  }
  return moves;
}

function staticDistance(state, block) {
  if (block.gray) return 1;
  const door = state.doors.find((candidate) => candidate.color === block.color && candidate.filled < candidate.capacity);
  if (!door) return 0;
  const blocked = new Set([...state.walls, ...state.generators]);
  const queue = [{ x: block.x, y: block.y, distance: 0 }];
  const seen = new Set([block.y * state.width + block.x]);
  while (queue.length) {
    const current = queue.shift();
    if (current.x === door.x && current.y === door.y) return current.distance;
    for (const [dx, dy] of DIRS) {
      const x = current.x + dx;
      const y = current.y + dy;
      if (x < 0 || y < 0 || x >= state.width || y >= state.height) continue;
      const key = y * state.width + x;
      if (seen.has(key) || blocked.has(key)) continue;
      seen.add(key);
      queue.push({ x, y, distance: current.distance + 1 });
    }
  }
  return 99;
}

function heuristic(state) {
  return state.blocks.reduce((sum, block) => sum + staticDistance(state, block), 0);
}

function repositionMoves(state, limit) {
  const moves = [];
  for (const block of state.blocks) {
    const paths = [];
    const collect = (x, y, path) => {
      if (x === block.x && y === block.y) return false;
      let space = 0;
      for (const [dx, dy] of DIRS) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= state.width || ny >= state.height) continue;
        const key = ny * state.width + nx;
        if (state.walls.has(key) || state.generators.has(key)) continue;
        if (state.blocks.some((other) => other.x === nx && other.y === ny)) continue;
        space++;
      }
      paths.push({ type: "move", id: block.id, x, y, path, space });
      return paths.length >= 80;
    };
    emptyPath(state, block, collect);
    for (const move of paths) {
      const next = cloneState(state);
      const target = next.blocks.find((candidate) => candidate.id === move.id);
      target.x = move.x;
      target.y = move.y;
      move.score = heuristic(next) * 10 - move.space;
      moves.push(move);
    }
  }
  moves.sort((a, b) => a.score - b.score || a.path.length - b.path.length);
  return moves.slice(0, limit);
}

function applyMove(state, move) {
  const next = cloneState(state);
  const block = next.blocks.find((candidate) => candidate.id === move.id);
  if (move.type === "capture") {
    next.blocks = next.blocks.filter((candidate) => candidate.id !== move.id);
    const door = next.doors.find((candidate) => candidate.color === move.color);
    door.filled++;
  } else if (move.type === "prism") {
    block.gray = false;
    block.color = move.color;
  } else {
    block.x = move.x;
    block.y = move.y;
  }
  return next;
}

function solved(state) {
  return state.blocks.length === 0 && state.doors.every((door) => door.filled >= door.capacity);
}

export function solveLevel(spec, options = {}) {
  const initial = prepare(spec);
  if (!initial) return { ok: false, reason: "generator-space" };
  const maxNodes = options.maxNodes || 120000;
  const maxDepth = options.maxDepth || 80 + initial.blocks.length * 5;
  const repositionLimit = options.repositionLimit || 18;
  const visited = new Set();
  const path = [];
  let nodes = 0;
  let aborted = false;

  function search(state, depth) {
    if (solved(state)) return true;
    if (++nodes > maxNodes || depth > maxDepth) { aborted = true; return false; }
    const key = stateKey(state);
    if (visited.has(key)) return false;
    visited.add(key);

    for (const move of captureMoves(state)) {
      path.push(move);
      if (search(applyMove(state, move), depth + 1)) return true;
      path.pop();
      if (aborted) return false;
    }

    for (const move of prismMoves(state)) {
      path.push(move);
      if (search(applyMove(state, move), depth + 1)) return true;
      path.pop();
      if (aborted) return false;
    }

    for (const move of repositionMoves(state, repositionLimit)) {
      path.push(move);
      if (search(applyMove(state, move), depth + 1)) return true;
      path.pop();
      if (aborted) return false;
    }
    return false;
  }

  const ok = search(initial, 0);
  return {
    ok,
    nodes,
    reason: ok ? "" : (aborted ? "search-limit" : "dead-end"),
    solution: ok ? path.slice() : null
  };
}
