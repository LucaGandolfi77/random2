import { z } from 'zod';
import type { SaveGame } from '@/types/game';
import { SAVE_VERSION, createNewSave } from './defaults';
import { generateDailyMissions } from '@/game/missions/missions';

const metricSchema = z.enum([
  'serve_customer',
  'perfect_dish',
  'play_minigame',
  'discover_recipe',
  'spend_coins',
  'earn_coins',
  'use_ingredient',
  'cook_recipe',
  'decorate',
  'friendship',
]);

const gradeSchema = z.enum(['Normal', 'Good', 'Delicious', 'Perfect', 'Masterpiece']);

const missionSchema = z.object({
  id: z.string(),
  title: z.string(),
  description: z.string(),
  metric: metricSchema,
  target: z.number(),
  targetId: z.string().optional(),
  rewardCoins: z.number(),
  rewardPearls: z.number(),
});

const leaderboardSchema = z.object({
  score: z.number(),
  date: z.number(),
  detail: z.string(),
});

const portraitStyle = z.enum([
  'traditional',
  'matcha',
  'sakura',
  'tokyo',
  'midnight',
  'coastal',
  'autumn',
  'winter',
]);

export const saveSchema = z.object({
  version: z.number(),
  createdAt: z.number(),
  updatedAt: z.number(),
  player: z.object({
    name: z.string(),
    level: z.number(),
    xp: z.number(),
    coins: z.number(),
    pearls: z.number(),
    reputation: z.number(),
  }),
  inventory: z.record(
    z.string(),
    z.object({
      quantity: z.number(),
      freshness: z.number(),
    }),
  ),
  discoveredRecipes: z.array(z.string()),
  recipeDiscovery: z.record(z.string(), z.number()),
  bonusRecipes: z.array(z.string()),
  bonusIngredients: z.array(z.string()),
  ownedDecorations: z.array(z.string()),
  customers: z.record(
    z.string(),
    z.object({
      friendship: z.number(),
      visits: z.number(),
      lastOrder: z.string().optional(),
    }),
  ),
  restaurant: z.object({
    upgrades: z.record(z.string(), z.number()),
    decorations: z.array(
      z.object({
        uid: z.string(),
        decorationId: z.string(),
        x: z.number(),
        y: z.number(),
        flip: z.boolean(),
      }),
    ),
    style: portraitStyle,
  }),
  staff: z.object({
    hired: z.array(z.string()),
  }),
  story: z.object({
    completedOrders: z.array(z.string()),
    completedNeighborhoods: z.array(z.string()),
    seenDialogues: z.array(z.string()),
  }),
  daily: z.object({
    dateKey: z.string(),
    completed: z.boolean(),
    streak: z.number(),
    bestGrade: gradeSchema.optional(),
    lastCompletedDate: z.string().optional(),
  }),
  weekly: z.object({
    weekKey: z.string(),
    progress: z.record(z.string(), z.number()),
    claimed: z.array(z.string()),
  }),
  events: z.record(
    z.string(),
    z.object({
      progress: z.record(z.string(), z.number()),
      claimed: z.array(z.string()),
    }),
  ),
  missions: z.object({
    dateKey: z.string(),
    missions: z.array(missionSchema),
    progress: z.record(z.string(), z.number()),
    claimed: z.array(z.string()),
  }),
  achievements: z.record(z.string(), z.object({ unlockedAt: z.number() })),
  modes: z.object({
    puzzles: z.record(z.string(), z.object({ stars: z.number(), bestScore: z.number() })),
    merge: z.array(leaderboardSchema),
    endless: z.array(leaderboardSchema),
    rush: z.array(leaderboardSchema),
    delivery: z.array(leaderboardSchema),
    chef: z.record(z.string(), z.object({ cleared: z.boolean(), bestScore: z.number() })),
    zenCreations: z.number(),
  }),
  stats: z.object({
    sushiMade: z.number(),
    nigiriMade: z.number(),
    customersServed: z.number(),
    perfects: z.number(),
    masterpieces: z.number(),
    coinsEarned: z.number(),
    coinsSpent: z.number(),
    miniGamesPlayed: z.number(),
    ingredientsBought: z.number(),
    decorationsPlaced: z.number(),
    storyOrders: z.number(),
    rainbowRolls: z.number(),
    eventMissionsClaimed: z.number(),
  }),
  tutorial: z.object({
    completed: z.boolean(),
    step: z.number(),
    skipped: z.boolean(),
  }),
});

export interface SaveValidationResult {
  ok: boolean;
  save?: SaveGame;
  error?: string;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export const migrateSave = (input: unknown): SaveGame => {
  if (!isRecord(input)) throw new Error('Save file is not an object');
  const hasVersion = typeof input.version === 'number';
  const looksLegacy =
    'player' in input || 'discoveredRecipes' in input || 'inventory' in input || 'tutorial' in input;
  if (!hasVersion && !looksLegacy) throw new Error('Missing save version');
  const version = hasVersion ? (input.version as number) : 1;
  if (version > SAVE_VERSION) throw new Error('This save comes from a newer version of Nori Nook');
  if (version === SAVE_VERSION) {
    const parsed = saveSchema.parse(input);
    return parsed as SaveGame;
  }
  const legacyPlayer = isRecord(input.player) ? input.player : {};
  const fresh = createNewSave();
  const migrated: SaveGame = {
    ...fresh,
    createdAt: typeof input.createdAt === 'number' ? input.createdAt : fresh.createdAt,
    updatedAt: Date.now(),
    version: SAVE_VERSION,
    player: {
      ...fresh.player,
      level: typeof legacyPlayer.level === 'number' ? legacyPlayer.level : fresh.player.level,
      xp: typeof legacyPlayer.xp === 'number' ? legacyPlayer.xp : fresh.player.xp,
      coins: typeof legacyPlayer.coins === 'number' ? legacyPlayer.coins : fresh.player.coins,
      pearls: typeof legacyPlayer.pearls === 'number' ? legacyPlayer.pearls : fresh.player.pearls,
      reputation:
        typeof legacyPlayer.reputation === 'number' ? legacyPlayer.reputation : fresh.player.reputation,
    },
    discoveredRecipes: Array.isArray(input.discoveredRecipes)
      ? input.discoveredRecipes.filter((item): item is string => typeof item === 'string')
      : [],
    inventory: isRecord(input.inventory) ? (input.inventory as SaveGame['inventory']) : fresh.inventory,
    story: {
      completedOrders: [],
      completedNeighborhoods: [],
      seenDialogues: [],
    },
    tutorial: isRecord(input.tutorial)
      ? {
          completed: Boolean(input.tutorial.completed),
          step: typeof input.tutorial.step === 'number' ? input.tutorial.step : 0,
          skipped: Boolean(input.tutorial.skipped),
        }
      : fresh.tutorial,
  };
  migrated.missions = {
    ...fresh.missions,
    missions: generateDailyMissions(fresh.missions.dateKey, migrated.player.level),
  };
  return saveSchema.parse(migrated) as SaveGame;
};

export const validateSave = (input: unknown): SaveValidationResult => {
  try {
    const save = migrateSave(input);
    return { ok: true, save };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : 'Invalid save data' };
  }
};

export const isSaveGame = (value: unknown): value is SaveGame => saveSchema.safeParse(value).success;

export const migrateLegacySaveSafe = (input: unknown): SaveGame | null => {
  try {
    return migrateSave(input);
  } catch {
    return null;
  }
};
