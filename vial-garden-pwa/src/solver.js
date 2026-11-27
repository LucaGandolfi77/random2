import { CAPACITY } from "./config.js";
import { applyPour, canPour, isSolved, stateMetrics, tubeKey } from "./rules.js";

class MinHeap {
  constructor() { this.items = []; }
  get size() { return this.items.length; }
  push(item) {
    const items = this.items;
    items.push(item);
    let index = items.length - 1;
    while (index > 0) {
      const parent = (index - 1) >> 1;
      if (items[parent].priority <= item.priority) break;
      items[index] = items[parent];
      index = parent;
    }
    items[index] = item;
  }
  pop() {
    const items = this.items;
    if (!items.length) return null;
    const top = items[0];
    const last = items.pop();
    if (items.length) {
      let index = 0;
      while (true) {
        const left = index * 2 + 1;
        const right = left + 1;
        if (left >= items.length) break;
        let child = left;
        if (right < items.length && items[right].priority < items[left].priority) child = right;
        if (items[child].priority >= last.priority) break;
        items[index] = items[child];
        index = child;
      }
      items[index] = last;
    }
    return top;
  }
}

function heuristic(tubes, colorCount) {
  const metrics = stateMetrics(tubes);
  const extraGroups = Math.max(0, metrics.groups - colorCount);
  return extraGroups * 1.4 + metrics.mixed * 0.35;
}

function movesFor(tubes) {
  const moves = [];
  let emptyUsed = false;
  for (let from = 0; from < tubes.length; from++) {
    const source = tubes[from];
    if (!source.length) continue;
    const sourceUniform = source.every((unit) => unit === source[0]);
    for (let to = 0; to < tubes.length; to++) {
      if (!canPour(tubes, from, to)) continue;
      if (!tubes[to].length) {
        if (emptyUsed) continue;
        emptyUsed = true;
        if (sourceUniform && source.length === CAPACITY) continue;
      }
      moves.push({ from, to });
    }
  }
  return moves;
}

export function solveLevel(level, options = {}) {
  const maxNodes = options.maxNodes || 250000;
  const maxMoves = options.maxMoves || 180;
  const start = level.tubes.map((tube) => tube.slice());
  if (isSolved(start, level.colors)) return { ok: true, nodes: 0, solution: [] };
  const heap = new MinHeap();
  const best = new Map();
  const startNode = { tubes: start, moves: 0, priority: heuristic(start, level.colors), parent: null, move: null };
  heap.push(startNode);
  best.set(tubeKey(start), 0);
  let nodes = 0;

  while (heap.size && nodes < maxNodes) {
    const node = heap.pop();
    if (node.moves > (best.get(tubeKey(node.tubes)) ?? Infinity)) continue;
    nodes++;
    if (isSolved(node.tubes, level.colors)) {
      const solution = [];
      let cursor = node;
      while (cursor.parent) {
        solution.push(cursor.move);
        cursor = cursor.parent;
      }
      solution.reverse();
      return { ok: true, nodes, solution };
    }
    if (node.moves >= maxMoves) continue;

    for (const move of movesFor(node.tubes)) {
      const tubes = applyPour(node.tubes, move.from, move.to);
      if (!tubes) continue;
      const key = tubeKey(tubes);
      const moves = node.moves + 1;
      if (moves >= (best.get(key) ?? Infinity)) continue;
      best.set(key, moves);
      heap.push({
        tubes,
        moves,
        priority: moves + heuristic(tubes, level.colors),
        parent: node,
        move
      });
    }
  }
  return { ok: false, nodes, reason: heap.size ? "node-limit" : "dead-end" };
}
