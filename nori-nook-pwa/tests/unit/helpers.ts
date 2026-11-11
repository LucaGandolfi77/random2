import { createNewSave } from '@/storage/defaults';
import type { Dish, SaveGame } from '@/types/game';
import { makeDish } from '@/game/sushi-making/match';
import { recipeById } from '@/data/recipes';

export const TEST_DATE = new Date(2026, 4, 10, 12, 0, 0);

export const createTestSave = (overrides: {
  level?: number;
  coins?: number;
  pearls?: number;
  xp?: number;
  coinsSpent?: number;
  decorationPlaced?: number;
} = {}): SaveGame => {
  const save = createNewSave(TEST_DATE);
  save.player.level = overrides.level ?? 1;
  save.player.coins = overrides.coins ?? 500;
  save.player.pearls = overrides.pearls ?? 10;
  save.player.xp = overrides.xp ?? 0;
  save.stats.coinsSpent = overrides.coinsSpent ?? 0;
  save.stats.decorationsPlaced = overrides.decorationPlaced ?? 0;
  return save;
};

export const dishFor = (recipeId: string): Dish => {
  const recipe = recipeById(recipeId);
  return makeDish(recipe?.ingredients ?? []);
};
