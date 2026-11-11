import { describe, expect, it } from 'vitest';
import { createTestSave, dishFor, TEST_DATE } from './helpers';
import { completeOrder } from '@/game/economy/completion';
import { gradeDish } from '@/game/sushi-making/grading';
import { customerById } from '@/data/customers';
import { recipeById } from '@/data/recipes';
import { makeDish } from '@/game/sushi-making/match';
import { createDailySpecial } from '@/game/events/daily';
import type { Grade, Order } from '@/types/game';

const perfectGrade: Grade = {
  name: 'Masterpiece',
  total: 100,
  presentation: 100,
  match: 100,
  freshness: 100,
  technique: 100,
  accuracy: 100,
};

describe('order completion', () => {
  it('completes a story order and updates every progression system', () => {
    const save = createTestSave();
    const recipe = recipeById('salmon_nigiri')!;
    const dish = dishFor('salmon_nigiri');
    const grade = gradeDish({
      save,
      dish,
      orderRecipeId: recipe.id,
      freshness: 100,
      plateScore: 100,
      miniGameScores: [100, 100],
      customer: customerById('haru'),
    });
    const order: Order = {
      id: 'little_lane_1',
      customerId: 'haru',
      recipeId: 'salmon_nigiri',
      mode: 'story',
      rewardMultiplier: 1,
      bonusCoins: 28,
      bonusXp: 16,
    };
    const coinsBefore = save.player.coins;
    const result = completeOrder(save, {
      order,
      recipe,
      dish,
      grade,
      customer: customerById('haru'),
      miniGames: [{ gameId: 'perfect_rice', score: 100 }],
      free: true,
      now: TEST_DATE,
    });
    expect(result.ok).toBe(true);
    expect(result.coins).toBeGreaterThan(0);
    expect(save.player.coins).toBeGreaterThan(coinsBefore);
    expect(save.story.completedOrders).toContain('little_lane_1');
    expect(save.stats.storyOrders).toBe(1);
    expect(save.stats.customersServed).toBe(1);
    expect(save.discoveredRecipes).toContain('salmon_nigiri');
    expect(save.customers.haru?.visits).toBe(1);
    expect(save.achievements.first_sushi).toBeTruthy();
    expect(result.notices.some((item) => item.title.includes('New Recipe'))).toBe(true);
    expect(save.missions.progress).toBeTruthy();
  });

  it('does not complete when required ingredients are missing', () => {
    const save = createTestSave();
    save.inventory = {};
    const recipe = recipeById('salmon_nigiri')!;
    const dish = dishFor('salmon_nigiri');
    const order: Order = {
      id: 'missing',
      customerId: 'haru',
      recipeId: 'salmon_nigiri',
      mode: 'rush',
      rewardMultiplier: 1,
    };
    const result = completeOrder(save, {
      order,
      recipe,
      dish,
      grade: perfectGrade,
      customer: customerById('haru'),
      miniGames: [],
      free: false,
      now: TEST_DATE,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/missing/i);
  });

  it('blocks an allergen dish', () => {
    const save = createTestSave();
    const recipe = recipeById('california_roll')!;
    const dish = makeDish(recipe.ingredients);
    const order: Order = {
      id: 'allergy',
      customerId: 'emma',
      recipeId: 'california_roll',
      mode: 'story',
      rewardMultiplier: 1,
    };
    const result = completeOrder(save, {
      order,
      recipe,
      dish,
      grade: perfectGrade,
      customer: customerById('emma'),
      miniGames: [],
      free: true,
      now: TEST_DATE,
    });
    expect(result.ok).toBe(false);
    expect(result.error).toMatch(/allergen/i);
  });

  it('reduces rewards on a story replay and does not double-count story progression', () => {
    const save = createTestSave();
    const recipe = recipeById('salmon_nigiri')!;
    const dish = dishFor('salmon_nigiri');
    const order: Order = {
      id: 'little_lane_1',
      customerId: 'haru',
      recipeId: 'salmon_nigiri',
      mode: 'story',
      rewardMultiplier: 1,
      bonusCoins: 28,
      bonusXp: 16,
    };
    const input = {
      order,
      recipe,
      dish,
      grade: perfectGrade,
      customer: customerById('haru'),
      miniGames: [],
      free: true,
      now: TEST_DATE,
    };
    completeOrder(save, input);
    const firstCoins = save.player.coins;
    const second = completeOrder(save, input);
    expect(second.ok).toBe(true);
    expect(save.player.coins - firstCoins).toBeLessThan(firstCoins);
    expect(save.stats.storyOrders).toBe(1);
    expect(save.story.completedOrders.filter((id) => id === 'little_lane_1')).toHaveLength(1);
  });

  it('marks a daily special complete and grows the streak', () => {
    const save = createTestSave();
    const special = createDailySpecial('2026-05-10');
    const recipe = recipeById(special.recipeId)!;
    const dish = makeDish(recipe.ingredients);
    const grade = gradeDish({
      save,
      dish,
      orderRecipeId: recipe.id,
      freshness: 100,
      plateScore: 100,
      miniGameScores: [100, 100],
    });
    const boosted: Grade = { ...grade, name: 'Masterpiece', total: 100, technique: 100, match: 100, accuracy: 100, presentation: 100, freshness: 100 };
    const order: Order = {
      id: 'daily-test',
      customerId: special.customerId,
      recipeId: special.recipeId,
      mode: 'daily',
      rewardMultiplier: 1.1,
    };
    const result = completeOrder(save, {
      order,
      recipe,
      dish,
      grade: boosted,
      customer: customerById(special.customerId),
      miniGames: [{ gameId: special.miniGameId, score: 100 }],
      dailySpecial: special,
      free: true,
      now: TEST_DATE,
    });
    expect(result.ok).toBe(true);
    expect(result.dailyCompleted).toBe(true);
    expect(save.daily.completed).toBe(true);
    expect(save.daily.streak).toBe(1);
  });

  it('applies progress to active event missions', () => {
    const save = createTestSave();
    const recipe = recipeById('salmon_nigiri')!;
    const dish = dishFor('salmon_nigiri');
    const order: Order = {
      id: 'event-test',
      customerId: 'haru',
      recipeId: 'salmon_nigiri',
      mode: 'story',
      rewardMultiplier: 1,
    };
    completeOrder(save, {
      order,
      recipe,
      dish,
      grade: perfectGrade,
      customer: customerById('haru'),
      miniGames: [],
      free: true,
      now: TEST_DATE,
    });
    const sakura = save.events.sakura_festival;
    expect(sakura).toBeTruthy();
    expect(Object.values(sakura!.progress).some((value) => value > 0)).toBe(true);
  });
});
