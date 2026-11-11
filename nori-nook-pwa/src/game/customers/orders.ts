import type { Customer, Dish, GameMode, Order, Recipe, SaveGame } from '@/types/game';
import { CUSTOMERS, customerById } from '@/data/customers';
import { RECIPES, recipeById } from '@/data/recipes';
import { INGREDIENTS, ingredientById } from '@/data/ingredients';
import { makeId } from '@/utils/id';
import { pickWeighted, type Rng } from '@/utils/rng';
import { customerAllergenConflict } from '@/game/economy/rewards';

export const getUnlockedRecipes = (save: SaveGame): Recipe[] =>
  RECIPES.filter((recipe) => recipe.unlockLevel <= save.player.level || save.bonusRecipes.includes(recipe.id));

export const getUnlockedCustomers = (save: SaveGame): Customer[] =>
  CUSTOMERS.filter((customer) => customer.unlockLevel <= save.player.level);

export const getUnlockedIngredients = (save: SaveGame) =>
  INGREDIENTS.filter((item) => item.unlockLevel <= save.player.level || save.bonusIngredients.includes(item.id));

export const safeRecipesForCustomer = (customer: Customer, recipes: Recipe[]): Recipe[] =>
  recipes.filter((recipe) => customerAllergenConflict(customer, recipe).length === 0);

export const recipeWeightForCustomer = (customer: Customer, recipe: Recipe): number => {
  const ids = recipe.ingredients.map((item) => item.id);
  const liked = ids.filter((id) => customer.preferences.includes(id)).length;
  const disliked = ids.filter((id) => customer.dislikes.includes(id)).length;
  const budgetFit = recipe.baseReward <= customer.budget ? 1.2 : 0.6;
  return Math.max(0.3, 1 + liked * 2.2 - disliked * 2.5 + budgetFit + recipe.difficulty * 0.1);
};

export const generateOrderForCustomer = (
  save: SaveGame,
  customer: Customer,
  mode: GameMode,
  rng: Rng,
  pool?: Recipe[],
): Order | undefined => {
  const recipes = safeRecipesForCustomer(customer, pool ?? getUnlockedRecipes(save));
  if (recipes.length === 0) return undefined;
  const weighted = recipes.map((recipe) => ({ recipe, weight: recipeWeightForCustomer(customer, recipe) }));
  const chosen = pickWeighted(weighted, rng)?.recipe ?? recipes[0];
  if (!chosen) return undefined;
  return {
    id: makeId('order'),
    customerId: customer.id,
    recipeId: chosen.id,
    mode,
    rewardMultiplier: 1,
    note: customer.greeting,
  };
};

export const generateCustomerOrder = (
  save: SaveGame,
  mode: GameMode,
  rng: Rng,
  customerPool?: Customer[],
): Order | undefined => {
  const customers = (customerPool ?? getUnlockedCustomers(save)).filter((customer) => customer.unlockLevel <= save.player.level);
  if (customers.length === 0) {
    const fallback = customerById('haru');
    return fallback ? generateOrderForCustomer(save, fallback, mode, rng) : undefined;
  }
  const weights = customers.map((customer) => ({
    customer,
    weight:
      1 +
      (save.customers[customer.id]?.friendship ?? 0) * 0.1 +
      (customer.vip ? -0.3 : 0) +
      (customer.mystery ? -0.5 : 0),
  }));
  const customer = pickWeighted(weights, rng)?.customer ?? customers[0];
  return customer ? generateOrderForCustomer(save, customer, mode, rng) : undefined;
};

export const orderRecipe = (order: Order): Recipe | undefined => recipeById(order.recipeId);

export const dishContainsAllergens = (dish: Dish, customer: Customer | undefined): string[] => {
  if (!customer) return [];
  return dish.ingredients
    .map((item) => item.id)
    .filter((id) => customer.allergies.includes(id));
};

export const orderAllergenNames = (customer: Customer | undefined): string[] => {
  if (!customer) return [];
  return customer.allergies
    .map((id) => ingredientById(id)?.name)
    .filter((name): name is string => Boolean(name));
};

export const orderIsExact = (dish: Dish, recipeId: string): boolean => dish.recipeId === recipeId;

export const suggestedMiniGames = (recipe: Recipe, mode: GameMode): Recipe['requiredMiniGames'] => {
  if (mode === 'rush' || mode === 'endless') return recipe.requiredMiniGames.slice(0, 1);
  if (mode === 'delivery') return recipe.requiredMiniGames.slice(0, 2);
  if (mode === 'chef') return recipe.requiredMiniGames;
  if (mode === 'daily') return recipe.requiredMiniGames.slice(0, 2);
  return recipe.requiredMiniGames.slice(0, 2);
};
