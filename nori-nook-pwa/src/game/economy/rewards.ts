import type { Customer, Grade, GradeName, Recipe, SaveGame } from '@/types/game';
import { gradeMultiplier } from '@/game/sushi-making/grading';
import { getUpgradeEffect } from '@/game/ingredient-system/stock';
import { recipeById } from '@/data/recipes';

export interface RewardInput {
  save: SaveGame;
  recipe: Recipe;
  grade: Grade;
  customer?: Customer;
  orderMultiplier?: number;
  bonusCoins?: number;
  bonusXp?: number;
  replay?: boolean;
}

export interface RewardBreakdown {
  base: number;
  gradeBonus: number;
  preferenceBonus: number;
  ambianceTip: number;
  storyBonus: number;
  coins: number;
  xp: number;
  reputation: number;
  friendshipGain: number;
  multiplier: number;
}

export const preferenceMultiplier = (customer: Customer | undefined, recipe: Recipe): number => {
  if (!customer) return 1;
  const ids = recipe.ingredients.map((item) => item.id);
  const liked = ids.some((id) => customer.preferences.includes(id));
  const disliked = ids.some((id) => customer.dislikes.includes(id));
  let multiplier = 1;
  if (liked) multiplier += 0.15;
  if (disliked) multiplier -= 0.1;
  return Math.max(0.7, multiplier);
};

export const customerAllergenConflict = (customer: Customer | undefined, recipe: Recipe): string[] => {
  if (!customer) return [];
  return recipe.ingredients
    .map((item) => item.id)
    .filter((id) => customer.allergies.includes(id));
};

export const friendshipLevel = (friendshipPoints: number, visits: number): number => {
  if (visits <= 0) return 0;
  return Math.min(5, 1 + Math.floor(friendshipPoints / 2));
};

export const calculateReward = (input: RewardInput): RewardBreakdown => {
  const { save, recipe, grade, customer, orderMultiplier = 1, bonusCoins = 0, bonusXp = 0, replay = false } = input;
  const gradeFactor = gradeMultiplier(grade.name);
  const preference = preferenceMultiplier(customer, recipe);
  const aoiBonus = save.staff.hired.includes('aoi') ? 1.08 : 1;
  const base = recipe.baseReward;
  const gradeBonus = Math.round(base * (gradeFactor - 1));
  const preferenceBonus = Math.round(base * gradeFactor * (preference - 1));
  const ambiance = getUpgradeEffect(save, 'ambiance');
  const ambianceTip =
    grade.name === 'Normal' ? 0 : Math.round(grade.total / 25 + ambiance * 0.4 + (customer?.vip ? 3 : 0));
  const replayFactor = replay ? 0.35 : 1;
  const rawCoins = (base * gradeFactor * orderMultiplier * (customer?.rewardMultiplier ?? 1) * preference * aoiBonus + ambianceTip) * replayFactor;
  const storyBonus = Math.round(bonusCoins * (replay ? 0.35 : 1));
  const coins = Math.max(1, Math.round(rawCoins + storyBonus));
  const xpBase = 8 + recipe.difficulty * 3 + grade.total / 10;
  const xp = Math.max(1, Math.round((xpBase * (replay ? 0.35 : 1) + bonusXp) * (1 + getUpgradeEffect(save, 'xp_bonus') / 100)));
  const reputation = grade.name === 'Masterpiece' || grade.name === 'Perfect' ? 2 : grade.name === 'Delicious' ? 1 : 0;
  const friendshipGain = grade.name === 'Delicious' || grade.name === 'Perfect' || grade.name === 'Masterpiece' ? 2 : 1;

  return {
    base,
    gradeBonus,
    preferenceBonus,
    ambianceTip,
    storyBonus,
    coins,
    xp,
    reputation,
    friendshipGain,
    multiplier: Number((orderMultiplier * (customer?.rewardMultiplier ?? 1) * preference * gradeFactor).toFixed(2)),
  };
};

export const dishRewardPreview = (recipeId: string, grade: GradeName): number => {
  const recipe = recipeById(recipeId);
  if (!recipe) return 0;
  return Math.round(recipe.baseReward * gradeMultiplier(grade));
};

export const canAfford = (save: SaveGame, coins: number): boolean => save.player.coins >= coins;

export const spendCoins = (save: SaveGame, coins: number): boolean => {
  if (coins < 0 || !canAfford(save, coins)) return false;
  save.player.coins -= coins;
  save.stats.coinsSpent += coins;
  return true;
};

export const earnCoins = (save: SaveGame, coins: number): void => {
  const amount = Math.max(0, Math.round(coins));
  save.player.coins += amount;
  save.stats.coinsEarned += amount;
};

export const addPearls = (save: SaveGame, pearls: number): void => {
  save.player.pearls += Math.max(0, Math.round(pearls));
};
