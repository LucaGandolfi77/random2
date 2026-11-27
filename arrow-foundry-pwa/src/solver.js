import { applyMove, buildSolverModel, isSolved, legalMoves, popcount } from "./rules.js";

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

function heuristic(remaining, weakened, model) {
  return popcount(remaining) + popcount(remaining & model.heavyMask & ~weakened);
}

function stateKey(remaining, weakened) {
  return `${remaining.toString(36)}|${weakened.toString(36)}`;
}

export function solveLevel(level, options = {}) {
  const model = buildSolverModel(level);
  let remaining = options.remaining == null ? (1n << BigInt(level.arrows.length)) - 1n : options.remaining;
  let weakened = options.weakened == null ? 0n : options.weakened;
  if (isSolved(remaining)) return { ok: true, nodes: 0, solution: [] };
  const maxNodes = options.maxNodes || 500000;
  const maxMoves = options.maxMoves || 160;
  const heap = new MinHeap();
  const best = new Map();
  const start = { remaining, weakened, moves: 0, priority: heuristic(remaining, weakened, model), parent: null, move: null };
  heap.push(start);
  best.set(stateKey(remaining, weakened), 0);
  let nodes = 0;

  while (heap.size && nodes < maxNodes) {
    const node = heap.pop();
    const key = stateKey(node.remaining, node.weakened);
    if (node.moves > (best.get(key) ?? Infinity)) continue;
    nodes++;
    if (isSolved(node.remaining)) {
      const solution = [];
      let cursor = node;
      while (cursor.parent) { solution.push(cursor.move); cursor = cursor.parent; }
      solution.reverse();
      return { ok: true, nodes, solution };
    }
    if (node.moves >= maxMoves) continue;
    for (const move of legalMoves(node.remaining, node.weakened, model)) {
      const next = applyMove(node.remaining, node.weakened, move, model);
      const nextKey = stateKey(next.remaining, next.weakened);
      const moves = node.moves + 1;
      if (moves >= (best.get(nextKey) ?? Infinity)) continue;
      best.set(nextKey, moves);
      heap.push({
        ...next,
        moves,
        priority: moves + heuristic(next.remaining, next.weakened, model),
        parent: node,
        move
      });
    }
  }
  return { ok: false, nodes, reason: heap.size ? "node-limit" : "dead-end" };
}
