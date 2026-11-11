import { MERGE_SPAWNS, findMergeRule, getMergeItem } from '@/data/merge';
import { type Rng, pickWeighted } from '@/utils/rng';

export const MERGE_BOARD_COLS = 6;
export const MERGE_BOARD_ROWS = 6;
export const MERGE_BOARD_SIZE = MERGE_BOARD_COLS * MERGE_BOARD_ROWS;

export type MergeCells = Array<string | null>;

export interface MergeGameState {
  cells: MergeCells;
  score: number;
  combo: number;
  moves: number;
  gameOver: boolean;
  lastResult?: string;
}

export const spawnMergeItem = (rng: Rng): string => {
  const picked = pickWeighted([...MERGE_SPAWNS], rng);
  return picked?.id ?? 'rice';
};

export const emptyCells = (cells: MergeCells): number[] =>
  cells.reduce<number[]>((acc, cell, index) => {
    if (cell === null) acc.push(index);
    return acc;
  }, []);

export const hasMergeMoves = (cells: MergeCells): boolean => {
  for (let index = 0; index < cells.length; index += 1) {
    const item = cells[index];
    if (!item) continue;
    const row = Math.floor(index / MERGE_BOARD_COLS);
    const col = index % MERGE_BOARD_COLS;
    const neighbours: number[] = [];
    if (col < MERGE_BOARD_COLS - 1) neighbours.push(index + 1);
    if (row < MERGE_BOARD_ROWS - 1) neighbours.push(index + MERGE_BOARD_COLS);
    for (const neighbour of neighbours) {
      const other = cells[neighbour];
      if (other && findMergeRule(item, other)) return true;
    }
  }
  return false;
};

export const allowedMergeTargets = (cells: MergeCells, from: number): number[] => {
  const item = cells[from];
  if (!item) return [];
  return cells.reduce<number[]>((acc, target, index) => {
    if (index !== from && target && findMergeRule(item, target)) acc.push(index);
    return acc;
  }, []);
};

export const fillBoard = (rng: Rng, count = 14): MergeCells => {
  const cells: MergeCells = Array.from({ length: MERGE_BOARD_SIZE }, () => null);
  const positions = emptyCells(cells);
  for (let index = positions.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(rng() * (index + 1));
    const current = positions[index];
    const target = positions[swap];
    if (current !== undefined && target !== undefined) {
      positions[index] = target;
      positions[swap] = current;
    }
  }
  positions.slice(0, count).forEach((position) => {
    cells[position] = spawnMergeItem(rng);
  });
  let attempts = 0;
  while (!hasMergeMoves(cells) && attempts < 30) {
    const filled = cells.reduce<number[]>((acc, cell, index) => {
      if (cell) acc.push(index);
      return acc;
    }, []);
    const target = filled[Math.floor(rng() * filled.length)];
    if (target !== undefined) cells[target] = spawnMergeItem(rng);
    attempts += 1;
  }
  return cells;
};

export const createMergeGame = (rng: Rng): MergeGameState => ({
  cells: fillBoard(rng),
  score: 0,
  combo: 0,
  moves: 0,
  gameOver: false,
});

export interface MergeOutcome {
  ok: boolean;
  state: MergeGameState;
  gained: number;
  result?: string;
  spawned?: string;
}

export const mergeTiles = (state: MergeGameState, from: number, to: number, rng: Rng): MergeOutcome => {
  const source = state.cells[from];
  const target = state.cells[to];
  if (!source || !target || from === to) return { ok: false, state, gained: 0 };
  const rule = findMergeRule(source, target);
  if (!rule) return { ok: false, state, gained: 0 };
  const cells = [...state.cells];
  cells[to] = rule.result;
  cells[from] = null;
  const nextCombo = Math.min(10, state.combo + 1);
  const gained = Math.round(rule.points * (1 + (nextCombo - 1) * 0.15));
  const empties = emptyCells(cells);
  let spawned: string | undefined;
  if (empties.length > 0) {
    const spawnAt = empties[Math.floor(rng() * empties.length)];
    if (spawnAt !== undefined) {
      spawned = spawnMergeItem(rng);
      cells[spawnAt] = spawned;
    }
  }
  const gameOver = !hasMergeMoves(cells) && emptyCells(cells).length === 0;
  return {
    ok: true,
    gained,
    result: rule.result,
    spawned,
    state: {
      cells,
      score: state.score + gained,
      combo: nextCombo,
      moves: state.moves + 1,
      gameOver,
      lastResult: rule.result,
    },
  };
};

export const mergeItemName = (id: string): string => getMergeItem(id)?.name ?? id;

export const bestMergeScore = (entries: { score: number }[]): number =>
  Math.max(0, ...entries.map((entry) => entry.score));
