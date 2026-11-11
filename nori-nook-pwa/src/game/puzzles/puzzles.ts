import type { Dish, PuzzleConstraint, PuzzleLevel, RecipeIngredient } from '@/types/game';
import { ingredientById } from '@/data/ingredients';
import { recipeById } from '@/data/recipes';
import { ingredientSignature, normalizeIngredients, totalIngredientCount } from '@/game/sushi-making/match';
import { dishValue } from '@/game/sushi-making/match';

const ingredientsOfCategory = (ingredients: RecipeIngredient[], category: string): number =>
  ingredients.reduce((sum, item) => {
    const ingredient = ingredientById(item.id);
    return ingredient?.category === category ? sum + item.qty : sum;
  }, 0);

export const defaultDish = (ingredients: RecipeIngredient[], recipeId?: string): Dish => ({
  ingredients: normalizeIngredients(ingredients),
  recipeId,
  name: recipeId ? (recipeById(recipeId)?.name ?? 'Puzzle Dish') : 'Puzzle Dish',
  custom: !recipeId,
});

export const checkConstraint = (
  constraint: PuzzleConstraint,
  ingredients: RecipeIngredient[],
  dish: Dish,
): boolean => {
  const normalized = normalizeIngredients(ingredients);
  const ids = normalized.map((item) => item.id);
  switch (constraint.kind) {
    case 'only_category':
      return normalized.length > 0 && normalized.every((item) => ingredientById(item.id)?.category === constraint.category);
    case 'forbid_ingredient':
      return !ids.includes(constraint.ingredientId ?? '');
    case 'forbid_tag':
      return normalized.every((item) => !(ingredientById(item.id)?.tags ?? []).includes(constraint.tag ?? ''));
    case 'min_ingredients':
      return totalIngredientCount(normalized) >= (constraint.count ?? 0);
    case 'max_ingredients':
      return totalIngredientCount(normalized) <= (constraint.count ?? Infinity);
    case 'min_value':
      return dishValue(normalized) >= (constraint.value ?? 0);
    case 'exact_recipe':
      return dish.recipeId === constraint.recipeId;
    case 'category_count':
      return ingredientsOfCategory(normalized, constraint.category ?? '') >= (constraint.count ?? 0);
    case 'must_include':
      return ids.includes(constraint.ingredientId ?? '');
    case 'no_duplicates':
      return normalized.every((item) => item.qty === 1);
    default:
      return false;
  }
};

export const constraintLabel = (constraint: PuzzleConstraint): string => {
  switch (constraint.kind) {
    case 'only_category':
      return `Only ${constraint.category}`;
    case 'forbid_ingredient':
      return `No ${ingredientById(constraint.ingredientId ?? '')?.name ?? constraint.ingredientId}`;
    case 'forbid_tag':
      return `Nothing ${constraint.tag}`;
    case 'min_ingredients':
      return `At least ${constraint.count} ingredients`;
    case 'max_ingredients':
      return `At most ${constraint.count} ingredients`;
    case 'min_value':
      return `Value at least ${constraint.value} coins`;
    case 'exact_recipe':
      return `Exact recipe: ${recipeById(constraint.recipeId ?? '')?.name ?? constraint.recipeId}`;
    case 'category_count':
      return `At least ${constraint.count} ${constraint.category}`;
    case 'must_include':
      return `Include ${ingredientById(constraint.ingredientId ?? '')?.name ?? constraint.ingredientId}`;
    case 'no_duplicates':
      return 'No duplicate ingredients';
    default:
      return 'Mystery rule';
  }
};

export interface PuzzleEvaluation {
  passed: boolean;
  unmet: string[];
  stars: number;
  score: number;
  usedIngredients: number;
  exactSolution: boolean;
}

export const evaluatePuzzle = (
  level: PuzzleLevel,
  ingredients: RecipeIngredient[],
  dish: Dish,
  attempts = 1,
): PuzzleEvaluation => {
  const normalized = normalizeIngredients(ingredients);
  const unmet: string[] = [];
  const allowed = new Set(level.allowedIngredients);
  if (normalized.some((item) => !allowed.has(item.id))) {
    unmet.push('Only use ingredients from this puzzle pantry');
  }
  level.constraints.forEach((constraint) => {
    if (!checkConstraint(constraint, normalized, dish)) {
      unmet.push(constraintLabel(constraint));
    }
  });
  const usedIngredients = totalIngredientCount(normalized);
  const exactSolution =
    ingredientSignature(normalized) === ingredientSignature(level.solution);
  const passed = unmet.length === 0;
  let stars = 0;
  if (passed) {
    stars = 1;
    if (usedIngredients <= totalIngredientCount(level.solution)) stars = 2;
    if (exactSolution && attempts === 1) stars = 3;
  }
  const score = passed
    ? Math.max(40, 100 - Math.max(0, usedIngredients - totalIngredientCount(level.solution)) * 7 - (attempts - 1) * 6 + (exactSolution ? 5 : 0))
    : Math.max(0, 30 - unmet.length * 8);
  return { passed, unmet, stars, score, usedIngredients, exactSolution };
};

export const solutionDish = (level: PuzzleLevel): Dish => {
  const recipe = level.constraints.find((constraint) => constraint.kind === 'exact_recipe')?.recipeId;
  return defaultDish(level.solution, recipe);
};
