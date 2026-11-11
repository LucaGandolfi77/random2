import type { Dish, Recipe, RecipeIngredient } from '@/types/game';
import { RECIPES, recipeById } from '@/data/recipes';
import { MINI_GAMES } from '@/data/miniGames';
import { ingredientById } from '@/data/ingredients';

export const normalizeIngredients = (ingredients: RecipeIngredient[]): RecipeIngredient[] => {
  const map = new Map<string, number>();
  ingredients.forEach((item) => {
    map.set(item.id, (map.get(item.id) ?? 0) + Math.max(0, item.qty));
  });
  return [...map.entries()]
    .filter(([, qty]) => qty > 0)
    .map(([id, qty]) => ({ id, qty }))
    .sort((a, b) => a.id.localeCompare(b.id));
};

export const ingredientSignature = (ingredients: RecipeIngredient[]): string =>
  normalizeIngredients(ingredients)
    .map((item) => `${item.id}:${item.qty}`)
    .join('|');

export const findRecipeForIngredients = (
  ingredients: RecipeIngredient[],
  recipes: Recipe[] = RECIPES,
): Recipe | undefined => {
  const signature = ingredientSignature(ingredients);
  return recipes.find((recipe) => ingredientSignature(recipe.ingredients) === signature);
};

export const recipeMatchScore = (ingredients: RecipeIngredient[], recipe: Recipe): number => {
  const normalized = normalizeIngredients(ingredients);
  const wanted = new Map(recipe.ingredients.map((item) => [item.id, item.qty]));
  const actual = new Map(normalized.map((item) => [item.id, item.qty]));
  let matched = 0;
  let required = 0;
  wanted.forEach((qty, id) => {
    required += qty;
    matched += Math.min(qty, actual.get(id) ?? 0);
  });
  let extras = 0;
  actual.forEach((qty, id) => {
    if (!wanted.has(id)) extras += qty;
  });
  if (required === 0) return 0;
  const coverage = matched / required;
  const exact = ingredientSignature(ingredients) === ingredientSignature(recipe.ingredients);
  if (exact) return 100;
  return Math.max(0, Math.round(coverage * 80 - extras * 8));
};

export const isOrderAccurate = (dish: Dish, recipeId: string): boolean =>
  dish.recipeId === recipeId && Boolean(recipeById(recipeId));

export const totalIngredientCount = (ingredients: RecipeIngredient[]): number =>
  ingredients.reduce((sum, item) => sum + item.qty, 0);

export const dishValue = (ingredients: RecipeIngredient[]): number =>
  ingredients.reduce((sum, item) => sum + (ingredientById(item.id)?.price ?? 0) * item.qty, 0);

const mainIngredient = (ingredients: RecipeIngredient[]): string => {
  const sorted = [...ingredients].sort((a, b) => b.qty - a.qty || a.id.localeCompare(b.id));
  return ingredientById(sorted[0]?.id ?? '')?.name ?? 'Mystery';
};

export const freeformName = (ingredients: RecipeIngredient[]): string => {
  const normalized = normalizeIngredients(ingredients);
  if (normalized.length === 0) return 'Empty Little Plate';
  const wasabi = normalized.find((item) => item.id === 'wasabi')?.qty ?? 0;
  if (wasabi >= 2) return 'Tearful Wasabi Surprise';
  const premium = normalized.some((item) => ingredientById(item.id)?.premium);
  if (normalized.length >= 6) return 'Overstuffed Dream Bundle';
  if (normalized.every((item) => ingredientById(item.id)?.category === 'rice')) return 'Very Humble Rice';
  if (normalized.some((item) => item.id === 'nori') && normalized.length >= 4) return 'Chaotic Nori Bundle';
  if (normalized.some((item) => item.id === 'salmon') && normalized.some((item) => item.id === 'avocado')) {
    return 'Creamy Green Salmon Hug';
  }
  if (normalized.some((item) => item.id === 'tuna') && normalized.some((item) => item.id === 'mango')) {
    return 'Sunset Tuna Surprise';
  }
  if (premium) return 'Golden Little Accident';
  if (normalized.some((item) => item.id === 'nori')) return 'Freeform Nori Roll';
  return `${mainIngredient(normalized)} Improv Nigiri`;
};

export const makeDish = (ingredients: RecipeIngredient[]): Dish => {
  const normalized = normalizeIngredients(ingredients);
  const recipe = findRecipeForIngredients(normalized);
  return {
    ingredients: normalized,
    recipeId: recipe?.id,
    name: recipe?.name ?? freeformName(normalized),
    custom: !recipe,
  };
};

export const validateContent = (): string[] => {
  const issues: string[] = [];
  const ingredientIds = new Set<string>();
  const miniGameIds = new Set(MINI_GAMES.map((game) => game.id));
  RECIPES.forEach((recipe) => {
    if (!recipe.id) issues.push('Recipe without id');
    if (ingredientIds.has(recipe.id)) issues.push(`Duplicate recipe id ${recipe.id}`);
    recipe.ingredients.forEach((item) => {
      if (!ingredientById(item.id)) issues.push(`Recipe ${recipe.id} uses unknown ingredient ${item.id}`);
      if (item.qty <= 0) issues.push(`Recipe ${recipe.id} has invalid quantity for ${item.id}`);
    });
    recipe.requiredMiniGames.forEach((gameId) => {
      if (!miniGameIds.has(gameId)) issues.push(`Recipe ${recipe.id} uses unknown mini-game ${gameId}`);
    });
    if (recipe.baseReward <= 0) issues.push(`Recipe ${recipe.id} has invalid reward`);
    if (recipe.difficulty < 1 || recipe.difficulty > 5) issues.push(`Recipe ${recipe.id} has invalid difficulty`);
  });
  return issues;
};
