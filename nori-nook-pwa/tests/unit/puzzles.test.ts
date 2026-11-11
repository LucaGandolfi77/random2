import { describe, expect, it } from 'vitest';
import { PUZZLE_LEVELS } from '@/data/puzzles';
import { evaluatePuzzle, solutionDish, constraintLabel } from '@/game/puzzles/puzzles';
import { makeDish } from '@/game/sushi-making/match';

describe('sushi puzzle mode', () => {
  it('gives every level a valid, solvable first-try solution', () => {
    PUZZLE_LEVELS.forEach((level) => {
      const dish = solutionDish(level);
      const result = evaluatePuzzle(level, level.solution, dish, 1);
      expect(result.passed, `level ${level.number}: ${result.unmet.join(', ')}`).toBe(true);
      expect(result.stars).toBe(3);
      expect(result.exactSolution).toBe(true);
    });
  });

  it('allows solution ingredients in the level pantry', () => {
    PUZZLE_LEVELS.forEach((level) => {
      const allowed = new Set(level.allowedIngredients);
      level.solution.forEach((item) => expect(allowed.has(item.id), `${level.id} missing ${item.id}`).toBe(true));
    });
  });

  it('fails when the plate ignores a constraint', () => {
    const level = PUZZLE_LEVELS[0]!;
    const wrongDish = makeDish([{ id: 'rice_white', qty: 1 }]);
    const result = evaluatePuzzle(level, [{ id: 'rice_white', qty: 1 }], wrongDish, 1);
    expect(result.passed).toBe(false);
    expect(result.stars).toBe(0);
    expect(result.unmet.length).toBeGreaterThan(0);
  });

  it('fails when using an ingredient outside the pantry', () => {
    const level = PUZZLE_LEVELS.find((item) => item.number === 11)!;
    const ingredient = level.allowedIngredients.includes('wagyu') ? 'tuna' : 'wagyu';
    const ingredients = [{ id: ingredient, qty: 1 }];
    const result = evaluatePuzzle(level, ingredients, makeDish(ingredients), 1);
    expect(result.passed).toBe(false);
    expect(result.unmet.some((item) => item.includes('pantry'))).toBe(true);
  });

  it('rewards precision with more stars on a first attempt', () => {
    const level = PUZZLE_LEVELS[20]!;
    const first = evaluatePuzzle(level, level.solution, solutionDish(level), 1);
    const later = evaluatePuzzle(level, level.solution, solutionDish(level), 3);
    expect(first.stars).toBeGreaterThanOrEqual(later.stars);
  });

  it('provides human-readable constraint labels', () => {
    expect(constraintLabel({ kind: 'only_category', category: 'fish' })).toContain('fish');
    expect(constraintLabel({ kind: 'min_value', value: 20 })).toContain('20');
  });
});
