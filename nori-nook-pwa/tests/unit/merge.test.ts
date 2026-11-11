import { describe, expect, it } from 'vitest';
import {
  allowedMergeTargets,
  createMergeGame,
  fillBoard,
  hasMergeMoves,
  mergeTiles,
  type MergeGameState,
} from '@/game/merge/merge';
import { createRng } from '@/utils/rng';
import { MERGE_ITEM_BY_ID, MERGE_RULES, findMergeRule } from '@/data/merge';

describe('sushi merge', () => {
  it('has commutative, valid merge rules', () => {
    const rule = findMergeRule('rice', 'salmon');
    expect(rule).toBeUndefined();
    const baseRule = findMergeRule('rice', 'rice');
    expect(baseRule?.result).toBe('rice_base');
    expect(findMergeRule('rice', 'nori')?.result).toBe('nori_base');
    MERGE_RULES.forEach((entry) => {
      expect(MERGE_ITEM_BY_ID.has(entry.a)).toBe(true);
      expect(MERGE_ITEM_BY_ID.has(entry.b)).toBe(true);
      expect(MERGE_ITEM_BY_ID.has(entry.result)).toBe(true);
      expect(entry.points).toBeGreaterThan(0);
    });
  });

  it('creates a board with at least one possible merge', () => {
    const board = fillBoard(createRng('merge-seed'), 14);
    expect(board.filter(Boolean).length).toBe(14);
    expect(hasMergeMoves(board)).toBe(true);
  });

  it('merges compatible tiles and spawns a replacement', () => {
    const cells = Array<string | null>(36).fill(null);
    cells[0] = 'rice';
    cells[1] = 'rice';
    const state: MergeGameState = { cells, score: 0, combo: 0, moves: 0, gameOver: false };
    const outcome = mergeTiles(state, 0, 1, createRng('merge'));
    expect(outcome.ok).toBe(true);
    expect(outcome.state.cells[1]).toBe('rice_base');
    expect(outcome.state.cells[0]).toBeNull();
    expect(outcome.gained).toBeGreaterThan(0);
    expect(outcome.state.combo).toBe(1);
    expect(outcome.state.score).toBe(outcome.gained);
    expect(outcome.state.cells.filter(Boolean).length).toBe(2);
  });

  it('refuses incompatible or empty merges', () => {
    const cells = Array<string | null>(36).fill(null);
    cells[0] = 'rice';
    cells[1] = 'salmon';
    cells[2] = 'tuna';
    const state: MergeGameState = { cells, score: 0, combo: 0, moves: 0, gameOver: false };
    const invalid = mergeTiles(state, 0, 2, createRng('merge'));
    expect(invalid.ok).toBe(false);
    expect(invalid.state).toBe(state);
    const empty = mergeTiles(state, 0, 10, createRng('merge'));
    expect(empty.ok).toBe(false);
  });

  it('lists only legal targets for a tile', () => {
    const cells = Array<string | null>(36).fill(null);
    cells[0] = 'rice';
    cells[1] = 'rice';
    cells[2] = 'nori';
    cells[3] = 'tuna';
    expect(allowedMergeTargets(cells, 0)).toContain(1);
    expect(allowedMergeTargets(cells, 0)).toContain(2);
    expect(allowedMergeTargets(cells, 0)).not.toContain(3);
  });

  it('starts a real game', () => {
    const game = createMergeGame(createRng('new-game'));
    expect(game.cells).toHaveLength(36);
    expect(game.score).toBe(0);
    expect(game.gameOver).toBe(false);
    expect(hasMergeMoves(game.cells)).toBe(true);
  });
});
