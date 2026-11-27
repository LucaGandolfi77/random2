import { DIRECTIONS } from "./config.js";

export function cellKey(x, y, size) {
  return y * size + x;
}

export function buildRay(arrow, size, walls, doors) {
  const direction = DIRECTIONS[arrow.dir];
  const cells = [];
  let x = arrow.x + direction.dx;
  let y = arrow.y + direction.dy;
  while (x >= 0 && y >= 0 && x < size && y < size) {
    const key = cellKey(x, y, size);
    cells.push({ x, y, key, wall: walls.has(key), door: doors.get(key) || null });
    x += direction.dx;
    y += direction.dy;
  }
  return cells;
}

export function pathClear(arrow, arrows, active, doors, size) {
  const direction = DIRECTIONS[arrow.dir];
  const activeById = new Map();
  for (let i = 0; i < arrows.length; i++) if (active[i]) activeById.set(arrows[i].id, true);
  let x = arrow.x + direction.dx;
  let y = arrow.y + direction.dy;
  while (x >= 0 && y >= 0 && x < size && y < size) {
    const key = cellKey(x, y, size);
    const other = arrows.find((candidate, index) => active[index] && candidate.x === x && candidate.y === y);
    if (other) return false;
    const door = doors.get(key);
    if (door && door.requires.some((id) => activeById.has(id))) return false;
    x += direction.dx;
    y += direction.dy;
  }
  return true;
}

export function popcount(value) {
  let count = 0;
  while (value) { value &= value - 1n; count++; }
  return count;
}

export function buildSolverModel(level) {
  const size = level.size;
  const walls = new Set(level.walls.map((p) => p.key));
  const doorMap = new Map(level.doors.map((door) => [door.key, door]));
  const indexById = new Map(level.arrows.map((arrow, index) => [arrow.id, index]));
  const occupancy = new Map();
  level.arrows.forEach((arrow, index) => occupancy.set(cellKey(arrow.x, arrow.y, size), index));
  const rays = level.arrows.map((arrow) => buildRay(arrow, size, walls, doorMap).map((cell) => ({
    ...cell,
    arrowIndex: occupancy.get(cell.key) ?? -1,
    requirementMask: cell.door ? cell.door.requires.reduce((mask, id) => mask | (1n << BigInt(indexById.get(id))), 0n) : 0n
  })));
  const heavyMask = level.arrows.reduce((mask, arrow, index) => arrow.heavy ? mask | (1n << BigInt(index)) : mask, 0n);
  return { size, rays, heavyMask };
}

export function legalMoves(remaining, weakened, model) {
  const moves = [];
  for (let i = 0; i < model.rays.length; i++) {
    const bit = 1n << BigInt(i);
    if (!(remaining & bit)) continue;
    let clear = true;
    for (const cell of model.rays[i]) {
      if (cell.wall) { clear = false; break; }
      if (cell.arrowIndex >= 0 && (remaining & (1n << BigInt(cell.arrowIndex)))) { clear = false; break; }
      if (cell.door && (remaining & cell.requirementMask)) { clear = false; break; }
    }
    if (!clear) continue;
    const heavy = !!(model.heavyMask & bit);
    if (heavy && !(weakened & bit)) moves.push({ index: i, type: "hit" });
    else moves.push({ index: i, type: "remove" });
  }
  return moves;
}

export function applyMove(remaining, weakened, move, model) {
  const bit = 1n << BigInt(move.index);
  if (move.type === "hit") return { remaining, weakened: weakened | bit };
  return { remaining: remaining & ~bit, weakened: weakened & ~bit };
}

export function isSolved(remaining) {
  return remaining === 0n;
}
