import { describe, expect, it } from 'vitest';
import {
  findRecipeForIngredients,
  freeformName,
  ingredientSignature,
  makeDish,
  recipeMatchScore,
  totalIngredientCount,
  normalizeIngredients,
} from '@/game/sushi-making/match';
import { recipeById } from '@/data/recipes';
import { ingredientById } from '@/data/ingredients';

describe('recipe matching and discovery', () => {
  it('matches a known recipe regardless of ingredient order', () => {
    const found = findRecipeForIngredients([
      { id: 'salmon', qty: 1 },
      { id: 'rice_white', qty: 1 },
    ]);
    expect(found?.id).toBe('salmon_nigiri');
  });

  it('normalizes duplicate ingredient entries', () => {
    const normalized = normalizeIngredients([
      { id: 'salmon', qty: 1 },
      { id: 'salmon', qty: 2 },
      { id: 'rice_white', qty: 1 },
      { id: 'wasabi', qty: 0 },
    ]);
    expect(normalized).toEqual([
      { id: 'rice_white', qty: 1 },
      { id: 'salmon', qty: 3 },
    ]);
    expect(totalIngredientCount(normalized)).toBe(4);
  });

  it('does not match a recipe when extra ingredients are added', () => {
    const found = findRecipeForIngredients([
      { id: 'rice_white', qty: 1 },
      { id: 'salmon', qty: 1 },
      { id: 'wasabi', qty: 1 },
    ]);
    expect(found).toBeUndefined();
    const dish = makeDish([
      { id: 'rice_white', qty: 1 },
      { id: 'salmon', qty: 1 },
      { id: 'wasabi', qty: 1 },
    ]);
    expect(dish.custom).toBe(true);
    expect(dish.name.length).toBeGreaterThan(2);
  });

  it('scores recipe overlap and exact matches', () => {
    const recipe = recipeById('salmon_avocado_roll')!;
    expect(recipeMatchScore(recipe.ingredients, recipe)).toBe(100);
    const partial = recipeMatchScore([{ id: 'nori', qty: 1 }, { id: 'salmon', qty: 1 }], recipe);
    expect(partial).toBeGreaterThan(0);
    expect(partial).toBeLessThan(100);
  });

  it('creates funny but safe freeform results', () => {
    expect(freeformName([{ id: 'wasabi', qty: 3 }])).toBe('Tearful Wasabi Surprise');
    expect(freeformName([{ id: 'rice_white', qty: 2 }])).toBe('Very Humble Rice');
    expect(freeformName([{ id: 'nori', qty: 1 }, { id: 'salmon', qty: 1 }, { id: 'avocado', qty: 1 }, { id: 'wasabi', qty: 1 }])).toContain('Nori');
  });

  it('canonical signatures are stable', () => {
    expect(ingredientSignature([{ id: 'salmon', qty: 1 }, { id: 'rice_white', qty: 1 }])).toBe(
      ingredientSignature([{ id: 'rice_white', qty: 1 }, { id: 'salmon', qty: 1 }]),
    );
    expect(ingredientById('salmon')?.name).toBe('Salmon');
  });
});
