import type { Customer, Dish, Grade, GradeName, Recipe, SaveGame } from '@/types/game';
import { recipeById } from '@/data/recipes';
import { average, clamp } from '@/utils/math';
import { getUpgradeEffect } from '@/game/ingredient-system/stock';
import { recipeMatchScore } from './match';

export interface GradeInput {
  save: SaveGame;
  dish: Dish;
  orderRecipeId?: string;
  freshness: number;
  plateScore: number;
  miniGameScores: number[];
  customer?: Customer;
}

export const gradeFromTotal = (total: number): GradeName => {
  if (total >= 95) return 'Masterpiece';
  if (total >= 85) return 'Perfect';
  if (total >= 72) return 'Delicious';
  if (total >= 55) return 'Good';
  return 'Normal';
};

export const gradeDish = (input: GradeInput): Grade => {
  const { save, dish, orderRecipeId, freshness, plateScore, miniGameScores } = input;
  const orderRecipe: Recipe | undefined = orderRecipeId ? recipeById(orderRecipeId) : undefined;
  const matchedRecipe = dish.recipeId ? recipeById(dish.recipeId) : undefined;

  let match = 70;
  if (orderRecipe) {
    match = dish.recipeId === orderRecipe.id ? 100 : recipeMatchScore(dish.ingredients, orderRecipe);
  } else if (matchedRecipe) {
    match = 100;
  }

  const techniqueBonus = save.staff.hired.includes('ren') ? 4 : 0;
  const sliceBonus = getUpgradeEffect(save, 'slice_bonus');
  const baseTechnique = miniGameScores.length > 0 ? average(miniGameScores) : 72;
  const technique = clamp(
    baseTechnique + techniqueBonus + (orderRecipe?.requiredMiniGames.includes('perfect_slice') ? sliceBonus : 0),
  );

  const presentation = clamp(plateScore);
  const fresh = clamp(freshness);
  let accuracy = 100;
  if (orderRecipe) {
    accuracy = dish.recipeId === orderRecipe.id ? 100 : recipeMatchScore(dish.ingredients, orderRecipe);
  } else if (dish.custom) {
    accuracy = 82;
  }

  const total = Math.round(
    presentation * 0.2 + match * 0.3 + fresh * 0.15 + technique * 0.25 + accuracy * 0.1,
  );
  return {
    name: gradeFromTotal(total),
    total,
    presentation: Math.round(presentation),
    match: Math.round(match),
    freshness: Math.round(fresh),
    technique: Math.round(technique),
    accuracy: Math.round(accuracy),
  };
};

export const gradeFeedback: Record<GradeName, string> = {
  Normal: 'A brave little plate. The rice is doing its best.',
  Good: 'A lovely bite. The nook is getting warmer.',
  Delicious: 'The flavors are holding hands. Lovely work.',
  Perfect: 'Everything is in its little place. Beautiful.',
  Masterpiece: 'The whole street feels this one. A true little dream.',
};

export const gradeColor = (grade: GradeName): string => {
  switch (grade) {
    case 'Masterpiece':
      return '#F4C36B';
    case 'Perfect':
      return '#607B62';
    case 'Delicious':
      return '#EF9D91';
    case 'Good':
      return '#A7B99A';
    default:
      return '#80614E';
  }
};

export const gradeIcon = (grade: GradeName): string => {
  switch (grade) {
    case 'Masterpiece':
      return 'crown';
    case 'Perfect':
      return 'star';
    case 'Delicious':
      return 'heart';
    case 'Good':
      return 'sparkle';
    default:
      return 'rice';
  }
};

export const gradeMultiplier = (grade: GradeName): number => {
  switch (grade) {
    case 'Masterpiece':
      return 2.2;
    case 'Perfect':
      return 1.7;
    case 'Delicious':
      return 1.35;
    case 'Good':
      return 1;
    default:
      return 0.7;
  }
};
