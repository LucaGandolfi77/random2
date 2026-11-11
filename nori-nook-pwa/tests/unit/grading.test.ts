import { describe, expect, it } from 'vitest';
import { createTestSave, dishFor } from './helpers';
import {
  gradeDish,
  gradeFromTotal,
  gradeMultiplier,
} from '@/game/sushi-making/grading';
import { calculateReward, customerAllergenConflict, preferenceMultiplier } from '@/game/economy/rewards';
import { customerById } from '@/data/customers';
import { recipeById } from '@/data/recipes';
import { makeDish } from '@/game/sushi-making/match';

describe('sushi grading and economy', () => {
  it('maps totals to the five grades', () => {
    expect(gradeFromTotal(100)).toBe('Masterpiece');
    expect(gradeFromTotal(90)).toBe('Perfect');
    expect(gradeFromTotal(75)).toBe('Delicious');
    expect(gradeFromTotal(60)).toBe('Good');
    expect(gradeFromTotal(20)).toBe('Normal');
    expect(gradeMultiplier('Masterpiece')).toBeGreaterThan(gradeMultiplier('Normal'));
  });

  it('awards a Masterpiece for a perfect order', () => {
    const save = createTestSave();
    const dish = dishFor('salmon_nigiri');
    const grade = gradeDish({
      save,
      dish,
      orderRecipeId: 'salmon_nigiri',
      freshness: 100,
      plateScore: 100,
      miniGameScores: [100, 100, 100],
      customer: customerById('haru'),
    });
    expect(grade.name).toBe('Masterpiece');
    expect(grade.total).toBe(100);
    expect(grade.match).toBe(100);
    expect(grade.accuracy).toBe(100);
  });

  it('grades a freeform mistake lower than the requested dish', () => {
    const save = createTestSave();
    const dish = makeDish([
      { id: 'rice_white', qty: 1 },
      { id: 'tuna', qty: 1 },
      { id: 'wasabi', qty: 2 },
    ]);
    const grade = gradeDish({
      save,
      dish,
      orderRecipeId: 'salmon_nigiri',
      freshness: 55,
      plateScore: 40,
      miniGameScores: [30, 40],
      customer: customerById('haru'),
    });
    const perfect = gradeDish({
      save,
      dish: dishFor('salmon_nigiri'),
      orderRecipeId: 'salmon_nigiri',
      freshness: 100,
      plateScore: 100,
      miniGameScores: [100, 100],
    });
    expect(grade.total).toBeLessThan(perfect.total);
    expect(grade.match).toBeLessThan(100);
    expect(grade.accuracy).toBeLessThan(100);
  });

  it('boosts rewards for a customer preference and lowers disliked dishes', () => {
    const save = createTestSave();
    const recipe = recipeById('salmon_avocado_roll')!;
    const haru = customerById('haru')!;
    const tatsu = customerById('tatsu')!;
    expect(preferenceMultiplier(haru, recipe)).toBeGreaterThan(1);
    expect(preferenceMultiplier(tatsu, recipe)).toBeLessThanOrEqual(1);
    const grade = gradeDish({
      save,
      dish: dishFor('salmon_avocado_roll'),
      orderRecipeId: recipe.id,
      freshness: 100,
      plateScore: 100,
      miniGameScores: [100, 100, 100],
      customer: haru,
    });
    const withHaru = calculateReward({ save, recipe, grade, customer: haru, bonusCoins: 20, bonusXp: 10 });
    const without = calculateReward({ save, recipe, grade, bonusCoins: 20, bonusXp: 10 });
    expect(withHaru.coins).toBeGreaterThan(without.coins);
    expect(withHaru.xp).toBeGreaterThan(0);
    expect(withHaru.reputation).toBe(2);
  });

  it('detects customer allergens', () => {
    const emma = customerById('emma')!;
    const california = recipeById('california_roll')!;
    expect(customerAllergenConflict(emma, california)).toContain('crab');
    const salmon = recipeById('salmon_nigiri')!;
    expect(customerAllergenConflict(emma, salmon)).toEqual([]);
  });

  it('caps scores into a valid range', () => {
    const save = createTestSave();
    save.staff.hired.push('ren');
    save.restaurant.upgrades.knives = 3;
    const grade = gradeDish({
      save,
      dish: dishFor('salmon_nigiri'),
      orderRecipeId: 'salmon_nigiri',
      freshness: 100,
      plateScore: 100,
      miniGameScores: [100, 100],
      customer: customerById('haru'),
    });
    expect(grade.technique).toBeLessThanOrEqual(100);
    expect(grade.presentation).toBeLessThanOrEqual(100);
  });
});
