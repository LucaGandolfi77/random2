import type {
  Customer,
  DailySpecial,
  Dish,
  Grade,
  GradeName,
  MiniGameResult,
  Order,
  OutcomeNotice,
  Recipe,
  SaveGame,
} from '@/types/game';
import type { ChefChallenge } from '@/data/chefs';
import { customerById } from '@/data/customers';
import { recipeById } from '@/data/recipes';
import { ingredientById } from '@/data/ingredients';
import { NEIGHBORHOODS, STORY_ORDER_BY_ID } from '@/data/story';
import {
  addPearls,
  calculateReward,
  customerAllergenConflict,
  earnCoins,
  friendshipLevel,
  type RewardBreakdown,
} from './rewards';
import { consumeIngredients } from '@/game/ingredient-system/stock';
import { gradeAtLeast, createDailySpecial, markDailyComplete } from '@/game/events/daily';
import { levelFromXp, levelUnlocks } from '@/game/progression/levels';
import { grantAchievements } from '@/game/progression/achievements';
import { applyProgressToAll, applyWeeklyProgress } from '@/game/missions/apply';
import { generateWeeklyMissions } from '@/game/missions/missions';
import { makeId } from '@/utils/id';
import { dateKey } from '@/utils/dates';
import { totalIngredientCount } from '@/game/sushi-making/match';

const gradeRank: Record<GradeName, number> = {
  Normal: 0,
  Good: 1,
  Delicious: 2,
  Perfect: 3,
  Masterpiece: 4,
};

export interface CompletionInput {
  order: Order;
  recipe: Recipe;
  dish: Dish;
  grade: Grade;
  customer?: Customer;
  miniGames: MiniGameResult[];
  dailySpecial?: DailySpecial;
  chefChallenge?: ChefChallenge;
  now?: Date;
  free?: boolean;
  replay?: boolean;
}

export interface CompletionResult {
  ok: boolean;
  error?: string;
  reward?: RewardBreakdown;
  notices: OutcomeNotice[];
  discoveredRecipe?: string;
  levelUps: number;
  dailyCompleted: boolean;
  chefCleared: boolean;
  coins: number;
  pearls: number;
  xp: number;
}

const notice = (
  kind: OutcomeNotice['kind'],
  title: string,
  description: string,
  extras: Partial<Pick<OutcomeNotice, 'coins' | 'pearls' | 'art'>> = {},
): OutcomeNotice => ({
  id: makeId('notice'),
  kind,
  title,
  description,
  ...extras,
});

const ingredientTags = (recipe: Recipe): string[] =>
  recipe.ingredients.flatMap((item) => ingredientById(item.id)?.tags ?? []);

export const completeOrder = (save: SaveGame, input: CompletionInput): CompletionResult => {
  const now = input.now ?? new Date();
  const { order, recipe, dish, grade } = input;
  const customer = input.customer ?? customerById(order.customerId);
  const notices: OutcomeNotice[] = [];
  const todayKey = dateKey(now);
  const coinsBefore = save.player.coins;
  const pearlsBefore = save.player.pearls;
  const xpBefore = save.player.xp;

  const allergens = dish.ingredients
    .map((item) => item.id)
    .filter((id) => customer?.allergies.includes(id));
  if (allergens.length > 0) {
    return {
      ok: false,
      error: 'This dish contains an allergen for this customer.',
      notices,
      levelUps: 0,
      dailyCompleted: false,
      chefCleared: false,
      coins: 0,
      pearls: 0,
      xp: 0,
    };
  }

  const storyEntry = STORY_ORDER_BY_ID.get(order.id);
  const wasStoryCompleted = save.story.completedOrders.includes(order.id);
  const replay = input.replay ?? (storyEntry ? wasStoryCompleted : false);
  const consume = !input.free && ['story', 'rush', 'endless', 'delivery'].includes(order.mode);
  if (consume) {
    const consumeResult = consumeIngredients(save, dish.ingredients);
    if (!consumeResult.ok) {
      return {
        ok: false,
        error: 'You are missing ingredients for this dish.',
        notices,
        levelUps: 0,
        dailyCompleted: false,
        chefCleared: false,
        coins: 0,
        pearls: 0,
        xp: 0,
      };
    }
  }

  if (customerAllergenConflict(customer, recipe).length > 0) {
    return {
      ok: false,
      error: 'This recipe is not safe for this customer.',
      notices,
      levelUps: 0,
      dailyCompleted: false,
      chefCleared: false,
      coins: 0,
      pearls: 0,
      xp: 0,
    };
  }

  const bonusCoins = order.bonusCoins ?? storyEntry?.order.rewardCoins ?? 0;
  const bonusXp = order.bonusXp ?? storyEntry?.order.rewardXp ?? 0;
  const reward = calculateReward({
    save,
    recipe,
    grade,
    customer,
    orderMultiplier: order.rewardMultiplier,
    bonusCoins,
    bonusXp,
    replay,
  });

  earnCoins(save, reward.coins);
  save.player.reputation += reward.reputation;
  const previousLevel = save.player.level;
  save.player.xp += reward.xp;
  const newLevel = levelFromXp(save.player.xp);
  save.player.level = newLevel;
  save.player.name = save.player.name || 'Little Chef';

  save.stats.sushiMade += 1;
  if (recipe.category === 'nigiri') save.stats.nigiriMade += 1;
  save.stats.customersServed += 1;
  if (grade.name === 'Perfect' || grade.name === 'Masterpiece') save.stats.perfects += 1;
  if (grade.name === 'Masterpiece') save.stats.masterpieces += 1;
  if (recipe.id === 'rainbow_roll') save.stats.rainbowRolls += 1;

  const newAchievementNotices: OutcomeNotice[] = [];
  if (newLevel > previousLevel) {
    notices.push(
      notice(
        'level',
        `Level ${newLevel}!`,
        `The nook feels a little bigger. ${levelUnlocks(newLevel).slice(0, 3).join(' · ')}`,
        { art: 'lantern' },
      ),
    );
  }

  let friendshipNotice: OutcomeNotice | undefined;
  if (customer) {
    const previous = save.customers[customer.id] ?? { friendship: 0, visits: 0 };
    const previousFriendshipLevel = friendshipLevel(previous.friendship, previous.visits);
    const updated = {
      friendship: previous.friendship + reward.friendshipGain,
      visits: previous.visits + 1,
      lastOrder: recipe.id,
    };
    save.customers[customer.id] = updated;
    const newFriendshipLevel = friendshipLevel(updated.friendship, updated.visits);
    if (newFriendshipLevel > previousFriendshipLevel) {
      const dialogue = customer.friendship[Math.min(customer.friendship.length - 1, newFriendshipLevel - 2)];
      friendshipNotice = notice(
        'friendship',
        `${customer.name} feels closer`,
        dialogue ?? `${customer.name} will remember this little plate.`,
        { art: 'heart' },
      );
      notices.push(friendshipNotice);
      if (newFriendshipLevel >= 5 && customer.friendshipGift) {
        if (!save.ownedDecorations.includes(customer.friendshipGift)) {
          save.ownedDecorations.push(customer.friendshipGift);
          notices.push(
            notice(
              'friendship',
              `${customer.name} left a gift`,
              'A new decoration is waiting in your storage.',
              { art: 'gift' },
            ),
          );
        } else {
          save.player.coins += 20;
          notices.push(
            notice('friendship', `${customer.name} left a little tip`, '+20 coins', { coins: 20 }),
          );
        }
      }
    }
  }

  let discoveredRecipe: string | undefined;
  if (dish.recipeId && !save.discoveredRecipes.includes(dish.recipeId)) {
    const discovered = recipeById(dish.recipeId);
    save.discoveredRecipes.push(dish.recipeId);
    save.recipeDiscovery[dish.recipeId] = now.getTime();
    const discoveryCoins = 15 + (discovered?.difficulty ?? 1) * 3;
    earnCoins(save, discoveryCoins);
    const pearls = (discovered?.difficulty ?? 1) >= 4 ? 1 : 0;
    addPearls(save, pearls);
    discoveredRecipe = dish.recipeId;
    notices.push(
      notice('recipe', 'New Recipe!', discovered?.name ?? dish.name, {
        coins: discoveryCoins,
        pearls,
        art: 'book',
      }),
    );
  }

  let dailyCompleted = false;
  if (order.mode === 'daily') {
    const special =
      input.dailySpecial && input.dailySpecial.dateKey === todayKey
        ? input.dailySpecial
        : createDailySpecial(todayKey);
    if (order.recipeId === special.recipeId) {
      const result = markDailyComplete(save, special, grade.name, todayKey);
      if (result.completed) {
        dailyCompleted = true;
        earnCoins(save, special.rewardCoins);
        addPearls(save, special.rewardPearls);
        notices.push(
          notice('event', 'Daily Special complete!', `A ${result.streak}-day little ritual.`, {
            coins: special.rewardCoins,
            pearls: special.rewardPearls,
            art: 'calendar',
          }),
        );
      }
    }
  }

  let chefCleared = false;
  if (order.mode === 'chef' && input.chefChallenge) {
    const challenge = input.chefChallenge;
    const tags = [...ingredientTags(recipe), ...recipe.tags];
    const forbidden = challenge.forbiddenTags.some((tag) => tags.includes(tag));
    const ingredientsCount = totalIngredientCount(dish.ingredients);
    const constraintMet =
      recipe.id === challenge.recipeId &&
      ingredientsCount <= challenge.maxIngredients &&
      !forbidden &&
      gradeRank[grade.name] >= gradeRank[challenge.minGrade];
    const previous = save.modes.chef[challenge.id] ?? { cleared: false, bestScore: 0 };
    save.modes.chef[challenge.id] = {
      cleared: previous.cleared || constraintMet,
      bestScore: Math.max(previous.bestScore, grade.total),
    };
    if (constraintMet && !previous.cleared) {
      chefCleared = true;
      earnCoins(save, challenge.rewardCoins);
      addPearls(save, challenge.rewardPearls);
      notices.push(
        notice('achievement', `${challenge.name} nods`, challenge.line, {
          coins: challenge.rewardCoins,
          pearls: challenge.rewardPearls,
          art: 'trophy',
        }),
      );
    }
  }

  if (order.mode === 'story' && storyEntry && !wasStoryCompleted) {
    save.story.completedOrders.push(storyEntry.order.id);
    save.stats.storyOrders += 1;
    const neighborhood = storyEntry.neighborhood;
    const allDone = neighborhood.orders.every((entry) => save.story.completedOrders.includes(entry.id));
    if (allDone && !save.story.completedNeighborhoods.includes(neighborhood.id)) {
      save.story.completedNeighborhoods.push(neighborhood.id);
      neighborhood.rewardRecipeIds.forEach((recipeId) => {
        if (!save.bonusRecipes.includes(recipeId)) save.bonusRecipes.push(recipeId);
      });
      neighborhood.rewardDecorationIds.forEach((decorationId) => {
        if (!save.ownedDecorations.includes(decorationId)) save.ownedDecorations.push(decorationId);
      });
      notices.push(
        notice('event', `${neighborhood.name} is proud of you`, 'New recipes and a decoration are in your collection.', {
          art: 'map',
        }),
      );
    }
  }

  const progressBase = {
    recipeId: recipe.id,
    ingredients: dish.ingredients,
    miniGameId: input.miniGames[0]?.gameId,
  };
  applyProgressToAll(save, { type: 'serve_customer', amount: 1 }, now);
  applyProgressToAll(save, { type: 'cook_recipe', ...progressBase }, now);
  applyProgressToAll(save, { type: 'use_ingredient', ...progressBase }, now);
  applyProgressToAll(save, { type: 'earn_coins', amount: reward.coins }, now);
  if (grade.name === 'Perfect' || grade.name === 'Masterpiece') {
    applyProgressToAll(save, { type: 'perfect_dish', amount: 1 }, now);
  }
  if (customer) {
    applyProgressToAll(save, { type: 'friendship', amount: 1 }, now);
  }
  if (discoveredRecipe) {
    applyProgressToAll(save, { type: 'discover_recipe', amount: 1, recipeId: discoveredRecipe }, now);
  }
  const weeklyMissions = generateWeeklyMissions(save.weekly.weekKey, save.player.level);
  applyWeeklyProgress(save, weeklyMissions, { type: 'serve_customer', amount: 1 });
  applyWeeklyProgress(save, weeklyMissions, { type: 'cook_recipe', ...progressBase });
  applyWeeklyProgress(save, weeklyMissions, { type: 'use_ingredient', ...progressBase });
  applyWeeklyProgress(save, weeklyMissions, { type: 'earn_coins', amount: reward.coins });
  if (grade.name === 'Perfect' || grade.name === 'Masterpiece') {
    applyWeeklyProgress(save, weeklyMissions, { type: 'perfect_dish', amount: 1 });
  }
  if (discoveredRecipe) {
    applyWeeklyProgress(save, weeklyMissions, {
      type: 'discover_recipe',
      amount: 1,
      recipeId: discoveredRecipe,
    });
  }
  if (customer) {
    applyWeeklyProgress(save, weeklyMissions, { type: 'friendship', amount: 1 });
  }

  const achievements = grantAchievements(save);
  achievements.forEach((achievement) => {
    newAchievementNotices.push(
      notice('achievement', `Achievement: ${achievement.name}`, achievement.description, {
        coins: achievement.rewardCoins,
        pearls: achievement.rewardPearls,
        art: achievement.icon,
      }),
    );
  });

  return {
    ok: true,
    reward,
    notices: [...notices, ...newAchievementNotices],
    discoveredRecipe,
    levelUps: Math.max(0, newLevel - previousLevel),
    dailyCompleted,
    chefCleared,
    coins: Math.max(0, save.player.coins - coinsBefore),
    pearls: Math.max(0, save.player.pearls - pearlsBefore),
    xp: Math.max(0, save.player.xp - xpBefore),
  };
};

export const nextStoryNeighborhood = (save: SaveGame): string | undefined => {
  const next = NEIGHBORHOODS.find((neighborhood) => !save.story.completedNeighborhoods.includes(neighborhood.id));
  return next?.id;
};

export const storyOrderIsUnlocked = (save: SaveGame, orderId: string): boolean => {
  const entry = STORY_ORDER_BY_ID.get(orderId);
  if (!entry) return false;
  const { neighborhood } = entry;
  if (neighborhood.unlockAfter && !save.story.completedNeighborhoods.includes(neighborhood.unlockAfter)) {
    return false;
  }
  const previousOrderIndex = neighborhood.orders.findIndex((item) => item.id === orderId) - 1;
  if (previousOrderIndex < 0) return true;
  const previousOrder = neighborhood.orders[previousOrderIndex];
  return previousOrder ? save.story.completedOrders.includes(previousOrder.id) || save.story.completedOrders.includes(orderId) : true;
};
