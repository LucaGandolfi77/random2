import type { SaveGame } from '@/types/game';
import { starterInventory } from '@/game/ingredient-system/stock';
import { generateDailyMissions } from '@/game/missions/missions';
import { dateKey, getIsoWeekKey } from '@/utils/dates';

export const SAVE_VERSION = 2;

export const createNewSave = (now: Date = new Date()): SaveGame => {
  const today = dateKey(now);
  const week = getIsoWeekKey(now);
  return {
    version: SAVE_VERSION,
    createdAt: now.getTime(),
    updatedAt: now.getTime(),
    player: {
      name: 'Little Chef',
      level: 1,
      xp: 0,
      coins: 60,
      pearls: 2,
      reputation: 0,
    },
    inventory: starterInventory(),
    discoveredRecipes: [],
    recipeDiscovery: {},
    bonusRecipes: [],
    bonusIngredients: [],
    ownedDecorations: ['sign_open'],
    customers: {},
    restaurant: {
      upgrades: {},
      decorations: [
        { uid: 'starter_open_sign', decorationId: 'sign_open', x: 50, y: 22, flip: false },
      ],
      style: 'matcha',
    },
    staff: {
      hired: [],
    },
    story: {
      completedOrders: [],
      completedNeighborhoods: [],
      seenDialogues: [],
    },
    daily: {
      dateKey: today,
      completed: false,
      streak: 0,
    },
    weekly: {
      weekKey: week,
      progress: {},
      claimed: [],
    },
    events: {},
    missions: {
      dateKey: today,
      missions: generateDailyMissions(today, 1),
      progress: {},
      claimed: [],
    },
    achievements: {},
    modes: {
      puzzles: {},
      merge: [],
      endless: [],
      rush: [],
      delivery: [],
      chef: {},
      zenCreations: 0,
    },
    stats: {
      sushiMade: 0,
      nigiriMade: 0,
      customersServed: 0,
      perfects: 0,
      masterpieces: 0,
      coinsEarned: 0,
      coinsSpent: 0,
      miniGamesPlayed: 0,
      ingredientsBought: 0,
      decorationsPlaced: 0,
      storyOrders: 0,
      rainbowRolls: 0,
      eventMissionsClaimed: 0,
    },
    tutorial: {
      completed: false,
      step: 0,
      skipped: false,
    },
  };
};

export const starterSave = createNewSave;
