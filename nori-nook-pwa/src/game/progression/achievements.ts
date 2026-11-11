import type { Achievement, SaveGame } from '@/types/game';
import { ACHIEVEMENTS } from '@/data/achievements';
import { friendshipLevel } from '@/game/economy/rewards';

export const achievementValue = (save: SaveGame, achievement: Achievement): number => {
  switch (achievement.metric) {
    case 'level':
      return save.player.level;
    case 'sushi_made':
      return save.stats.sushiMade;
    case 'nigiri_made':
      return save.stats.nigiriMade;
    case 'customers_served':
      return save.stats.customersServed;
    case 'perfects':
      return save.stats.perfects;
    case 'masterpieces':
      return save.stats.masterpieces;
    case 'coins_earned':
      return save.stats.coinsEarned;
    case 'coins_spent':
      return save.stats.coinsSpent;
    case 'mini_games':
      return save.stats.miniGamesPlayed;
    case 'recipes_discovered':
      return save.discoveredRecipes.length;
    case 'ingredients_bought':
      return save.stats.ingredientsBought;
    case 'decorations_placed':
      return save.stats.decorationsPlaced;
    case 'story_orders':
      return save.stats.storyOrders;
    case 'puzzles_solved':
      return Object.values(save.modes.puzzles).filter((entry) => entry.stars > 0).length;
    case 'merge_best':
      return Math.max(0, ...save.modes.merge.map((entry) => entry.score));
    case 'endless_best':
      return Math.max(0, ...save.modes.endless.map((entry) => entry.score));
    case 'friendship_max':
      return Math.max(
        0,
        ...Object.values(save.customers).map((customer) => friendshipLevel(customer.friendship, customer.visits)),
      );
    case 'rainbow_rolls':
      return save.stats.rainbowRolls;
    case 'daily_streak':
      return save.daily.streak;
    default:
      return 0;
  }
};

export const achievementProgress = (save: SaveGame, achievement: Achievement): number =>
  Math.min(1, achievementValue(save, achievement) / Math.max(1, achievement.target));

export const newlyUnlockedAchievements = (save: SaveGame): Achievement[] =>
  ACHIEVEMENTS.filter(
    (achievement) =>
      !save.achievements[achievement.id] && achievementValue(save, achievement) >= achievement.target,
  );

export const grantAchievements = (save: SaveGame): Achievement[] => {
  const unlocked = newlyUnlockedAchievements(save);
  unlocked.forEach((achievement) => {
    save.achievements[achievement.id] = { unlockedAt: Date.now() };
    save.player.coins += achievement.rewardCoins;
    save.player.pearls += achievement.rewardPearls;
  });
  return unlocked;
};

export const unlockedAchievementCount = (save: SaveGame): number => Object.keys(save.achievements).length;
