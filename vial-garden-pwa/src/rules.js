import { CAPACITY } from "./config.js";

export function cloneTubes(tubes) {
  return tubes.map((tube) => tube.slice());
}

export function topRun(tube) {
  if (!tube.length) return { color: -1, count: 0 };
  const color = tube[tube.length - 1];
  let count = 0;
  for (let i = tube.length - 1; i >= 0 && tube[i] === color; i--) count++;
  return { color, count };
}

export function canPour(tubes, from, to) {
  if (from === to || from < 0 || to < 0 || from >= tubes.length || to >= tubes.length) return false;
  const source = tubes[from];
  const target = tubes[to];
  if (!source.length || target.length >= CAPACITY) return false;
  const run = topRun(source);
  if (target.length && target[target.length - 1] !== run.color) return false;
  return true;
}

export function pourAmount(tubes, from, to) {
  if (!canPour(tubes, from, to)) return 0;
  const source = tubes[from];
  const target = tubes[to];
  return Math.min(topRun(source).count, CAPACITY - target.length);
}

export function applyPour(tubes, from, to, amount = null) {
  if (!canPour(tubes, from, to)) return null;
  const next = cloneTubes(tubes);
  const count = amount == null ? pourAmount(next, from, to) : amount;
  if (count <= 0) return null;
  const color = next[from][next[from].length - 1];
  for (let i = 0; i < count; i++) {
    next[to].push(next[from].pop());
    if (next[from][next[from].length - 1] !== color) break;
  }
  return next;
}

export function isSolved(tubes, colorCount) {
  let filled = 0;
  for (const tube of tubes) {
    if (!tube.length) continue;
    if (tube.length !== CAPACITY) return false;
    const color = tube[0];
    if (tube.some((unit) => unit !== color)) return false;
    filled++;
  }
  return filled === colorCount;
}

export function tubeKey(tubes) {
  return tubes.map((tube) => tube.join("")).sort().join("|");
}

export function stateMetrics(tubes) {
  let mixed = 0;
  let groups = 0;
  let empties = 0;
  for (const tube of tubes) {
    if (!tube.length) { empties++; continue; }
    let tubeGroups = 1;
    for (let i = 1; i < tube.length; i++) if (tube[i] !== tube[i - 1]) tubeGroups++;
    if (tubeGroups > 1) mixed++;
    groups += tubeGroups;
  }
  return { mixed, groups, empties };
}
