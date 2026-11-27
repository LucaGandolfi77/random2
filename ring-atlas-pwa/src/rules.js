export function normalizeOffset(value, segments) {
  return ((value % segments) + segments) % segments;
}

export function circularDistance(offset, segments) {
  const value = normalizeOffset(offset, segments);
  return Math.min(value, segments - value);
}

export function alignedCount(offsets, segments) {
  return offsets.reduce((sum, offset) => sum + (normalizeOffset(offset, segments) === 0 ? 1 : 0), 0);
}

export function isSolved(offsets, segments) {
  return offsets.every((offset) => normalizeOffset(offset, segments) === 0);
}

export function isRingLocked(index, offsets, level) {
  const lock = level.locks.find((candidate) => candidate.ring === index);
  if (!lock) return false;
  return normalizeOffset(offsets[lock.dependsOn], level.segments) !== 0;
}

export function legalMoves(offsets, level) {
  const moves = [];
  for (let ring = 0; ring < level.rings; ring++) {
    if (isRingLocked(ring, offsets, level)) continue;
    moves.push({ ring, delta: -1 });
    moves.push({ ring, delta: 1 });
  }
  return moves;
}

export function applyMove(offsets, level, move) {
  const next = offsets.slice();
  const segments = level.segments;
  next[move.ring] = normalizeOffset(next[move.ring] + move.delta, segments);
  for (const link of level.links) {
    if (link.a === move.ring) next[link.b] = normalizeOffset(next[link.b] + link.relation * move.delta, segments);
    else if (link.b === move.ring) next[link.a] = normalizeOffset(next[link.a] + link.relation * move.delta, segments);
  }
  return next;
}

export function stateKey(offsets) {
  return offsets.join(",");
}

export function heuristic(offsets, level) {
  let total = 0;
  for (let i = 0; i < offsets.length; i++) total += circularDistance(offsets[i], level.segments);
  for (const lock of level.locks) {
    if (normalizeOffset(offsets[lock.ring], level.segments) !== 0 && normalizeOffset(offsets[lock.dependsOn], level.segments) !== 0) total += 0.5;
  }
  return total;
}
