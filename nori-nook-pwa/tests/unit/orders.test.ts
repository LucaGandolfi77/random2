import { describe, expect, it } from 'vitest';
import { createTestSave } from './helpers';
import {
  generateCustomerOrder,
  generateOrderForCustomer,
  getUnlockedRecipes,
  safeRecipesForCustomer,
  suggestedMiniGames,
  dishContainsAllergens,
} from '@/game/customers/orders';
import { createRng } from '@/utils/rng';
import { customerById } from '@/data/customers';
import { recipeById } from '@/data/recipes';
import { makeDish } from '@/game/sushi-making/match';
import { createDailySpecial } from '@/game/events/daily';

describe('customer orders and allergen safety', () => {
  it('never offers a recipe containing a customer allergy', () => {
    const save = createTestSave({ level: 5, coins: 5000 });
    const emma = customerById('emma')!;
    const safe = safeRecipesForCustomer(emma, getUnlockedRecipes(save));
    expect(safe.length).toBeGreaterThan(0);
    safe.forEach((recipe) => {
      expect(recipe.ingredients.some((item) => item.id === 'crab')).toBe(false);
    });
    for (let seed = 0; seed < 50; seed += 1) {
      const order = generateOrderForCustomer(save, emma, 'story', createRng(`emma-${seed}`));
      expect(order).toBeTruthy();
      const recipe = recipeById(order!.recipeId)!;
      expect(recipe.ingredients.some((item) => item.id === 'crab')).toBe(false);
    }
  });

  it('uses only unlocked recipes for generated orders', () => {
    const save = createTestSave({ level: 2 });
    const unlocked = new Set(getUnlockedRecipes(save).map((recipe) => recipe.id));
    for (let seed = 0; seed < 40; seed += 1) {
      const order = generateCustomerOrder(save, 'endless', createRng(`unlocked-${seed}`));
      if (order) expect(unlocked.has(order.recipeId)).toBe(true);
    }
  });

  it('is deterministic for the same seed', () => {
    const save = createTestSave({ level: 4 });
    const a = generateCustomerOrder(save, 'rush', createRng('same-seed'));
    const b = generateCustomerOrder(save, 'rush', createRng('same-seed'));
    expect(a?.customerId).toBe(b?.customerId);
    expect(a?.recipeId).toBe(b?.recipeId);
  });

  it('detects allergens in a built dish', () => {
    const emma = customerById('emma')!;
    const dish = makeDish(recipeById('california_roll')!.ingredients);
    expect(dishContainsAllergens(dish, emma)).toContain('crab');
  });

  it('adjusts mini-game count by mode', () => {
    const recipe = recipeById('rainbow_roll')!;
    expect(suggestedMiniGames(recipe, 'rush').length).toBe(1);
    expect(suggestedMiniGames(recipe, 'delivery').length).toBe(2);
    expect(suggestedMiniGames(recipe, 'chef').length).toBe(recipe.requiredMiniGames.length);
  });

  it('keeps daily specials allergen-safe', () => {
    for (let day = 1; day <= 28; day += 1) {
      const special = createDailySpecial(`2026-05-${String(day).padStart(2, '0')}`);
      const recipe = recipeById(special.recipeId)!;
      const customer = customerById(special.customerId)!;
      expect(recipe.ingredients.some((item) => customer.allergies.includes(item.id))).toBe(false);
    }
  });
});
