import { create } from 'zustand';
import { immer } from 'zustand/middleware/immer';
import type {
  Achievement,
  Customer,
  Dish,
  GameMode,
  Grade,
  KitchenSession,
  MiniGameResult,
  Order,
  OutcomeNotice,
  SaveGame,
  ToastMessage,
} from '@/types/game';
import { createNewSave } from '@/storage/defaults';
import {
  importSaveString,
  readSave,
  writeSave,
  addGalleryEntry,
  deleteGalleryEntry,
  clearSave,
  clearAllData,
} from '@/storage/db';
import { customerById } from '@/data/customers';
import { recipeById } from '@/data/recipes';
import { STORY_ORDER_BY_ID } from '@/data/story';
import { CHEF_BY_ID } from '@/data/chefs';
import { PUZZLE_BY_ID } from '@/data/puzzles';
import { upgradeById, upgradeCost } from '@/data/upgrades';
import { staffById } from '@/data/staff';
import { decorationById } from '@/data/decorations';
import {
  buyIngredient,
  averageFreshness,
  getUpgradeEffect,
} from '@/game/ingredient-system/stock';
import {
  buyDecoration,
  buyUpgrade,
  hireStaff,
  placeDecoration,
  removeDecoration,
} from '@/game/restaurant/decor';
import {
  generateCustomerOrder,
  suggestedMiniGames,
} from '@/game/customers/orders';
import {
  completeOrder,
  storyOrderIsUnlocked,
  type CompletionResult,
} from '@/game/economy/completion';
import { createDailySpecial, syncDailyState } from '@/game/events/daily';
import { getActiveEvents, claimEventFinalReward } from '@/game/events/events';
import { ensureEventSave } from '@/game/events/eventState';
import { evaluatePuzzle, type PuzzleEvaluation } from '@/game/puzzles/puzzles';
import { gradeDish } from '@/game/sushi-making/grading';
import { makeDish } from '@/game/sushi-making/match';
import { levelFromXp } from '@/game/progression/levels';
import { grantAchievements } from '@/game/progression/achievements';
import {
  claimMission,
  generateWeeklyMissions,
  refreshMissions,
  type MissionProgressEvent,
} from '@/game/missions/missions';
import { applyProgressToAll, applyWeeklyProgress } from '@/game/missions/apply';
import { earnCoins, addPearls } from '@/game/economy/rewards';
import { dateKey, getIsoWeekKey } from '@/utils/dates';
import { makeId } from '@/utils/id';
import type { GalleryEntry, LeaderboardEntry } from '@/types/game';

export interface ServiceResultView {
  id: string;
  kind: 'service' | 'free';
  mode: GameMode;
  dish: Dish;
  grade: Grade;
  coins: number;
  pearls: number;
  xp: number;
  customerName?: string;
  customer?: Customer;
  notices: OutcomeNotice[];
  dailyCompleted?: boolean;
  chefCleared?: boolean;
}

export interface RushRun {
  mode: 'rush';
  startedAt: number;
  durationMs: number;
  queue: Order[];
  score: number;
  combo: number;
  served: number;
  finished: boolean;
  recorded: boolean;
}

export interface EndlessRun {
  mode: 'endless';
  hearts: number;
  score: number;
  served: number;
  finished: boolean;
  recorded: boolean;
}

export interface DeliveryRun {
  mode: 'delivery';
  startedAt: number;
  durationMs: number;
  deliveries: number;
  score: number;
  finished: boolean;
  recorded: boolean;
}

export type RunState = RushRun | EndlessRun | DeliveryRun;

export interface PuzzleCompletion {
  ok: boolean;
  locked?: boolean;
  evaluation?: PuzzleEvaluation;
  alreadyCleared?: boolean;
  coins?: number;
  pearls?: number;
  achievements?: Achievement[];
}

export interface GameStore {
  loaded: boolean;
  loading: boolean;
  save: SaveGame;
  session: KitchenSession | null;
  run: RunState | null;
  lastResult: ServiceResultView | null;
  toasts: ToastMessage[];
  hydrationError?: string;
  hydrate: () => Promise<void>;
  newGame: () => Promise<void>;
  persistNow: () => Promise<void>;
  importGame: (text: string) => Promise<void>;
  resetGame: () => Promise<void>;
  pushToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;
  clearLastResult: () => void;
  startStorySession: (orderId: string) => boolean;
  startDailySession: () => boolean;
  startZenSession: () => void;
  startChefSession: (chefId: string) => boolean;
  startRun: (mode: 'rush' | 'endless' | 'delivery') => void;
  startRunOrder: (orderId?: string) => boolean;
  endRun: () => void;
  clearRun: () => void;
  recordMiniGame: (result: MiniGameResult) => void;
  recordPracticeMiniGame: (result: MiniGameResult) => void;
  serveDish: (dish: Dish, plateScore: number) => { ok: boolean; result?: ServiceResultView; error?: string };
  abandonSession: () => void;
  recordMergeScore: (score: number) => void;
  completePuzzleLevel: (
    levelId: string,
    ingredients: { id: string; qty: number }[],
    attempts: number,
  ) => PuzzleCompletion;
  buyIngredientAction: (ingredientId: string, quantity?: number) => { ok: boolean; reason?: string; spent: number };
  buyUpgradeAction: (upgradeId: string) => { ok: boolean; reason?: string };
  hireStaffAction: (staffId: string) => { ok: boolean; reason?: string };
  buyDecorationAction: (decorationId: string) => { ok: boolean; reason?: string };
  placeDecorationAction: (decorationId: string, x: number, y: number, uid?: string) => { ok: boolean; reason?: string };
  removeDecorationAction: (uid: string) => void;
  claimDailyMission: (missionId: string) => boolean;
  claimWeeklyMission: (missionId: string) => boolean;
  claimEventMission: (eventId: string, missionId: string) => boolean;
  claimEventFinal: (eventId: string) => void;
  saveGalleryEntry: (entry: Omit<GalleryEntry, 'id' | 'createdAt'>) => Promise<GalleryEntry>;
  deleteGalleryImage: (id: string) => Promise<void>;
  advanceTutorial: () => void;
  completeTutorial: () => void;
  skipTutorial: () => void;
  replayTutorial: () => void;
  markDialogueSeen: (id: string) => void;
}

const toast = (
  title: string,
  message?: string,
  tone: ToastMessage['tone'] = 'cozy',
  icon = 'sparkle',
): ToastMessage => ({ id: makeId('toast'), title, message, tone, icon });

const addLeaderboard = (list: LeaderboardEntry[], score: number, detail: string): LeaderboardEntry[] =>
  [...list, { score, date: Date.now(), detail }]
    .sort((a, b) => b.score - a.score)
    .slice(0, 10);

const recordRun = (save: SaveGame, run: RunState): void => {
  if (run.recorded) return;
  run.recorded = true;
  run.finished = true;
  const detail =
    run.mode === 'rush'
      ? `${run.served} served · combo x${run.combo}`
      : run.mode === 'endless'
        ? `${run.served} orders`
        : `${run.deliveries} deliveries`;
  if (run.mode === 'rush') save.modes.rush = addLeaderboard(save.modes.rush, run.score, detail);
  if (run.mode === 'endless') save.modes.endless = addLeaderboard(save.modes.endless, run.score, detail);
  if (run.mode === 'delivery') save.modes.delivery = addLeaderboard(save.modes.delivery, run.score, detail);
};

const advanceMissions = (save: SaveGame, event: MissionProgressEvent): void => {
  applyProgressToAll(save, event);
  const weekly = generateWeeklyMissions(save.weekly.weekKey, save.player.level);
  applyWeeklyProgress(save, weekly, event);
};

const grantAndCollect = (save: SaveGame): Achievement[] => {
  const unlocked = grantAchievements(save);
  return unlocked;
};

const initialState = () => ({
  loaded: false,
  loading: false,
  save: createNewSave(),
  session: null as KitchenSession | null,
  run: null as RunState | null,
  lastResult: null as ServiceResultView | null,
  toasts: [] as ToastMessage[],
  hydrationError: undefined as string | undefined,
});

let hydrationPromise: Promise<void> | null = null;

export const useGameStore = create<GameStore>()(
  immer((set, get) => ({
    ...initialState(),

    hydrate: async () => {
      if (get().loaded) return;
      if (hydrationPromise) return hydrationPromise;
      hydrationPromise = (async () => {
        set((state) => {
          state.loading = true;
        });
        try {
          const existing = await readSave();
          set((state) => {
            const save = existing ?? createNewSave();
            const today = dateKey(new Date());
            const week = getIsoWeekKey(new Date());
            syncDailyState(save, today);
            refreshMissions(save, today, week);
            state.save = save;
            state.loaded = true;
            state.loading = false;
            state.hydrationError = undefined;
          });
        } catch (error) {
          set((state) => {
            state.save = createNewSave();
            state.loaded = true;
            state.loading = false;
            state.hydrationError = error instanceof Error ? error.message : 'Could not load your save';
            state.toasts.push(
              toast('Welcome back anyway', 'A fresh little save has been made for you.', 'pink', 'heart'),
            );
          });
        }
      })();
      return hydrationPromise;
    },

    newGame: async () => {
      const save = createNewSave();
      await writeSave(save);
      set((state) => {
        state.save = save;
        state.loaded = true;
        state.session = null;
        state.run = null;
        state.lastResult = null;
      });
    },

    persistNow: async () => {
      await writeSave(get().save);
    },

    importGame: async (text) => {
      const save = await importSaveString(text);
      set((state) => {
        state.save = save;
        state.loaded = true;
        state.session = null;
        state.run = null;
        state.lastResult = null;
        state.toasts.push(toast('Save restored', 'Your little nook is back.', 'gold', 'sparkle'));
      });
    },

    resetGame: async () => {
      await clearSave();
      await clearAllData();
      await get().newGame();
    },

    pushToast: (message) => {
      set((state) => {
        state.toasts.push({ ...message, id: makeId('toast') });
      });
    },

    removeToast: (id) => {
      set((state) => {
        state.toasts = state.toasts.filter((item) => item.id !== id);
      });
    },

    clearLastResult: () => {
      set((state) => {
        state.lastResult = null;
      });
    },

    startStorySession: (orderId) => {
      const state = get();
      if (!storyOrderIsUnlocked(state.save, orderId)) {
        state.pushToast({ title: 'Not just yet', message: 'Finish the previous order first.', tone: 'pink' });
        return false;
      }
      const entry = STORY_ORDER_BY_ID.get(orderId);
      if (!entry) return false;
      const recipe = recipeById(entry.order.recipeId);
      const customer = customerById(entry.order.customerId);
      if (!recipe || !customer) return false;
      set((draft) => {
        draft.session = {
          id: makeId('session'),
          mode: 'story',
          order: {
            id: entry.order.id,
            customerId: customer.id,
            recipeId: recipe.id,
            mode: 'story',
            rewardMultiplier: 1,
            bonusCoins: entry.order.rewardCoins,
            bonusXp: entry.order.rewardXp,
            note: entry.order.objective,
          },
          free: true,
          startedAt: Date.now(),
          miniGames: suggestedMiniGames(recipe, 'story'),
          completedMiniGames: [],
        };
        draft.run = null;
        draft.lastResult = null;
      });
      return true;
    },

    startDailySession: () => {
      const state = get();
      const special = createDailySpecial(dateKey(new Date()));
      if (state.save.daily.completed && state.save.daily.dateKey === special.dateKey) {
        state.pushToast({
          title: 'Today is already delicious',
          message: 'Come back tomorrow for a new Daily Special.',
          tone: 'pink',
          icon: 'calendar',
        });
        return false;
      }
      const recipe = recipeById(special.recipeId);
      const customer = customerById(special.customerId);
      if (!recipe || !customer) return false;
      set((draft) => {
        draft.session = {
          id: makeId('session'),
          mode: 'daily',
          order: {
            id: makeId('daily-order'),
            customerId: customer.id,
            recipeId: recipe.id,
            mode: 'daily',
            rewardMultiplier: 1.1,
            note: special.objective,
          },
          free: true,
          startedAt: Date.now(),
          miniGames: Array.from(
            new Set([special.miniGameId, ...suggestedMiniGames(recipe, 'daily')]),
          ).slice(0, 3),
          completedMiniGames: [],
        };
        draft.run = null;
        draft.lastResult = null;
      });
      return true;
    },

    startZenSession: () => {
      set((draft) => {
        draft.session = {
          id: makeId('session'),
          mode: 'zen',
          free: true,
          startedAt: Date.now(),
          miniGames: [],
          completedMiniGames: [],
        };
        draft.run = null;
        draft.lastResult = null;
      });
    },

    startChefSession: (chefId) => {
      const state = get();
      const chef = CHEF_BY_ID.get(chefId);
      if (!chef) return false;
      if (chef.unlockLevel > state.save.player.level) {
        state.pushToast({ title: 'A tougher chef', message: 'Reach a higher level to face this challenge.', tone: 'pink' });
        return false;
      }
      const recipe = recipeById(chef.recipeId);
      if (!recipe) return false;
      set((draft) => {
        draft.session = {
          id: makeId('session'),
          mode: 'chef',
          order: {
            id: makeId('chef-order'),
            customerId: 'quiet_chef',
            recipeId: recipe.id,
            mode: 'chef',
            rewardMultiplier: 1,
            note: chef.description,
          },
          chefId,
          free: true,
          startedAt: Date.now(),
          miniGames: recipe.requiredMiniGames,
          completedMiniGames: [],
        };
        draft.run = null;
        draft.lastResult = null;
      });
      return true;
    },

    startRun: (mode) => {
      set((state) => {
        state.session = null;
        state.lastResult = null;
        if (mode === 'rush') {
          const slots = 2 + getUpgradeEffect(state.save as SaveGame, 'rush_slots');
          const queue: Order[] = [];
          for (let index = 0; index < slots; index += 1) {
            const order = generateCustomerOrder(state.save as SaveGame, 'rush', Math.random);
            if (order) queue.push(order);
          }
          state.run = {
            mode: 'rush',
            startedAt: Date.now(),
            durationMs: (75 + getUpgradeEffect(state.save as SaveGame, 'rush_seconds')) * 1000,
            queue,
            score: 0,
            combo: 0,
            served: 0,
            finished: false,
            recorded: false,
          };
        } else if (mode === 'endless') {
          state.run = {
            mode: 'endless',
            hearts:
              3 +
              (state.save.staff.hired.includes('yuki') ? 1 : 0) +
              Math.min(2, Math.floor(getUpgradeEffect(state.save as SaveGame, 'patience_bonus') / 20)),
            score: 0,
            served: 0,
            finished: false,
            recorded: false,
          };
        } else {
          state.run = {
            mode: 'delivery',
            startedAt: Date.now(),
            durationMs: 150000,
            deliveries: 0,
            score: 0,
            finished: false,
            recorded: false,
          };
        }
      });
    },

    startRunOrder: (orderId) => {
      const state = get();
      const run = state.run;
      if (!run || run.finished) return false;
      let order: Order | undefined;
      if (run.mode === 'rush') {
        order = orderId ? run.queue.find((item) => item.id === orderId) : run.queue[0];
      } else {
        order = generateCustomerOrder(
          state.save,
          run.mode === 'endless' ? 'endless' : 'delivery',
          Math.random,
        );
      }
      if (!order) return false;
      const recipe = recipeById(order.recipeId);
      if (!recipe) return false;
      const enhancedOrder: Order = {
        ...order,
        rewardMultiplier:
          run.mode === 'rush' ? 1 + run.combo * 0.06 : run.mode === 'endless' ? 1 + run.served * 0.04 : 1,
      };
      let miniGames = suggestedMiniGames(recipe, run.mode === 'endless' ? 'endless' : run.mode);
      if (run.mode === 'delivery') {
        miniGames = Array.from(new Set([miniGames[0] ?? 'perfect_rice', 'delivery_pack'])) as typeof miniGames;
      }
      set((draft) => {
        draft.session = {
          id: makeId('session'),
          mode: run.mode === 'endless' ? 'endless' : run.mode,
          order: enhancedOrder,
          free: false,
          startedAt: Date.now(),
          miniGames,
          completedMiniGames: [],
        };
        draft.lastResult = null;
      });
      return true;
    },

    endRun: () => {
      set((state) => {
        if (!state.run) return;
        recordRun(state.save as SaveGame, state.run);
      });
    },

    clearRun: () => {
      set((state) => {
        state.run = null;
      });
    },

    recordMiniGame: (result) => {
      set((state) => {
        state.save.stats.miniGamesPlayed += 1;
        advanceMissions(state.save as SaveGame, {
          type: 'play_minigame',
          amount: 1,
          miniGameId: result.gameId,
        });
        if (state.session) {
          state.session.completedMiniGames = state.session.completedMiniGames.filter(
            (item) => item.gameId !== result.gameId,
          );
          state.session.completedMiniGames.push(result);
        }
        const unlocked = grantAndCollect(state.save as SaveGame);
        unlocked.forEach((achievement) => {
          state.toasts.push(
            toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
          );
        });
      });
    },

    recordPracticeMiniGame: (result) => {
      set((state) => {
        state.save.stats.miniGamesPlayed += 1;
        advanceMissions(state.save as SaveGame, {
          type: 'play_minigame',
          amount: 1,
          miniGameId: result.gameId,
        });
        const unlocked = grantAndCollect(state.save as SaveGame);
        unlocked.forEach((achievement) => {
          state.toasts.push(
            toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
          );
        });
      });
    },

    serveDish: (dish, plateScore) => {
      const state = get();
      const session = state.session;
      if (!session) return { ok: false, error: 'No active kitchen session.' };

      if (!session.order) {
        let freeResult: ServiceResultView | undefined;
        set((draft) => {
          if (!draft.session) return;
          freeResult = buildFreeResult(
            draft.save as SaveGame,
            dish,
            plateScore,
            draft.session.completedMiniGames,
          );
          draft.lastResult = freeResult;
        });
        if (freeResult) {
          void writeSave(get().save);
          return { ok: true, result: freeResult };
        }
        return { ok: false, error: 'The little plate did not come together.' };
      }

      const recipe = recipeById(session.order.recipeId);
      if (!recipe) return { ok: false, error: 'Recipe not found.' };
      const customer = customerById(session.order.customerId);
      const freshness = averageFreshness(state.save, dish.ingredients, session.free);
      const grade = gradeDish({
        save: state.save,
        dish,
        orderRecipeId: recipe.id,
        freshness,
        plateScore,
        miniGameScores: session.completedMiniGames.map((item) => item.score),
        customer,
      });
      const chef = session.chefId ? CHEF_BY_ID.get(session.chefId) : undefined;
      const special = session.mode === 'daily' ? createDailySpecial(dateKey(new Date())) : undefined;

      let servedResult: ServiceResultView | undefined;
      let failure: string | undefined;
      set((draft) => {
        if (!draft.session?.order) return;
        const completion = completeOrder(draft.save as SaveGame, {
          order: draft.session.order,
          recipe,
          dish,
          grade,
          customer,
          miniGames: draft.session.completedMiniGames,
          dailySpecial: special,
          chefChallenge: chef,
          free: draft.session.free,
        });
        if (!completion.ok) {
          failure = completion.error ?? 'That plate could not be served.';
          draft.toasts.push(toast('One moment', failure, 'pink', 'rice'));
          return;
        }
        const order = draft.session.order;
        const run = draft.run;
        if (run) {
          if (run.mode === 'rush' && order.mode === 'rush') {
            run.queue = run.queue.filter((item) => item.id !== order.id);
            const replacement = generateCustomerOrder(draft.save as SaveGame, 'rush', Math.random);
            if (replacement) run.queue.push(replacement);
            run.score += grade.total + run.combo * 10;
            run.combo += 1;
            run.served += 1;
          } else if (run.mode === 'endless' && order.mode === 'endless') {
            run.score += grade.total + run.served * 10;
            run.served += 1;
            if (grade.name === 'Normal') run.hearts -= 1;
            if (run.hearts <= 0) recordRun(draft.save as SaveGame, run);
          } else if (run.mode === 'delivery' && order.mode === 'delivery') {
            const packing = draft.session.completedMiniGames.find(
              (item) => item.gameId === 'delivery_pack',
            )?.score ?? 60;
            run.score += grade.total + packing + getUpgradeEffect(draft.save as SaveGame, 'delivery_bonus');
            run.deliveries += 1;
            if (run.deliveries >= 3) recordRun(draft.save as SaveGame, run);
          }
        }
        const result: ServiceResultView = {
          id: makeId('result'),
          kind: 'service',
          mode: order.mode,
          dish,
          grade,
          coins: completion.coins,
          pearls: completion.pearls,
          xp: completion.xp,
          customerName: chef ? chef.name : customer?.name,
          customer,
          notices: completion.notices,
          dailyCompleted: completion.dailyCompleted,
          chefCleared: completion.chefCleared,
        };
        draft.lastResult = result;
        draft.session = null;
        servedResult = result;
      });
      if (servedResult) {
        void writeSave(get().save);
        return { ok: true, result: servedResult };
      }
      return { ok: false, error: failure ?? 'That plate could not be served.' };
    },

    abandonSession: () => {
      set((state) => {
        state.session = null;
      });
    },

    recordMergeScore: (score) => {
      set((state) => {
        state.save.modes.merge = addLeaderboard(state.save.modes.merge, score, 'Merge run');
        const unlocked = grantAndCollect(state.save as SaveGame);
        unlocked.forEach((achievement) => {
          state.toasts.push(
            toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
          );
        });
      });
      void writeSave(get().save);
    },

    completePuzzleLevel: (levelId, ingredients, attempts) => {
      const state = get();
      const level = PUZZLE_BY_ID.get(levelId);
      if (!level) return { ok: false };
      if (level.number > 1) {
        const previousLevelId = `puzzle_${String(level.number - 1).padStart(2, '0')}`;
        const previousLevel = state.save.modes.puzzles[previousLevelId];
        if (!previousLevel || previousLevel.stars === 0) return { ok: false, locked: true };
      }
      const dish = makeDish(ingredients);
      const evaluation = evaluatePuzzle(level, ingredients, dish, attempts);
      if (!evaluation.passed) {
        return { ok: false, evaluation };
      }
      const wasCleared = Boolean(state.save.modes.puzzles[level.id]?.stars);
      let unlockedAchievements: Achievement[] = [];
      set((draft) => {
        const previous = draft.save.modes.puzzles[level.id];
        const firstClear = !previous || previous.stars === 0;
        draft.save.modes.puzzles[level.id] = {
          stars: Math.max(previous?.stars ?? 0, evaluation.stars),
          bestScore: Math.max(previous?.bestScore ?? 0, evaluation.score),
        };
        if (firstClear) {
          earnCoins(draft.save as SaveGame, level.rewardCoins);
          const xp = 10 + level.difficulty * 2;
          draft.save.player.xp += xp;
          const newLevel = levelFromXp(draft.save.player.xp);
          if (newLevel > draft.save.player.level) {
            draft.save.player.level = newLevel;
            draft.toasts.push(toast(`Level ${newLevel}!`, 'The nook grows a little more.', 'gold', 'lantern'));
          }
        }
        unlockedAchievements = grantAndCollect(draft.save as SaveGame);
        unlockedAchievements.forEach((achievement) => {
          draft.toasts.push(
            toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
          );
        });
        draft.toasts.push(
          toast(
            firstClear ? 'Puzzle solved!' : 'Lovely again',
            firstClear
              ? `+${level.rewardCoins} coins · ${evaluation.stars} star${evaluation.stars === 1 ? '' : 's'}`
              : `${evaluation.stars} star${evaluation.stars === 1 ? '' : 's'}`,
            'gold',
            'puzzle',
          ),
        );
      });
      void writeSave(get().save);
      return {
        ok: true,
        evaluation,
        alreadyCleared: wasCleared,
        coins: wasCleared ? 0 : level.rewardCoins,
        pearls: 0,
        achievements: unlockedAchievements,
      };
    },

    buyIngredientAction: (ingredientId, quantity = 1) => {
      let outcome: { ok: boolean; reason?: string; spent: number } = {
        ok: false,
        reason: 'Not enough coins',
        spent: 0,
      };
      set((draft) => {
        const result = buyIngredient(draft.save as SaveGame, ingredientId, quantity);
        outcome = result;
        if (result.ok) {
          advanceMissions(draft.save as SaveGame, { type: 'spend_coins', amount: result.spent });
          const unlocked = grantAndCollect(draft.save as SaveGame);
          unlocked.forEach((achievement) => {
            draft.toasts.push(
              toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
            );
          });
          draft.toasts.push(toast('Ingredient restocked', `-${result.spent} coins`, 'cozy', 'fish'));
        }
      });
      return outcome;
    },

    buyUpgradeAction: (upgradeId) => {
      const state = get();
      const upgrade = upgradeById(upgradeId);
      if (!upgrade) return { ok: false, reason: 'Unknown upgrade' };
      const level = state.save.restaurant.upgrades[upgradeId] ?? 0;
      const cost = upgradeCost(upgrade, level);
      if (cost === null) return { ok: false, reason: 'Already max level' };
      let outcome: { ok: boolean; reason?: string } = { ok: false };
      set((draft) => {
        outcome = buyUpgrade(draft.save as SaveGame, upgradeId);
        if (outcome.ok) {
          advanceMissions(draft.save as SaveGame, { type: 'spend_coins', amount: cost });
          const unlocked = grantAndCollect(draft.save as SaveGame);
          unlocked.forEach((achievement) => {
            draft.toasts.push(
              toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
            );
          });
          draft.toasts.push(toast(`${upgrade.name} upgraded`, `Now level ${(draft.save.restaurant.upgrades[upgradeId] ?? 0)}`, 'gold', upgrade.art));
        }
      });
      return outcome;
    },

    hireStaffAction: (staffId) => {
      const member = staffById(staffId);
      if (!member) return { ok: false, reason: 'Unknown staff' };
      let outcome: { ok: boolean; reason?: string } = { ok: false };
      set((draft) => {
        outcome = hireStaff(draft.save as SaveGame, staffId);
        if (outcome.ok) {
          advanceMissions(draft.save as SaveGame, { type: 'spend_coins', amount: member.cost });
          const unlocked = grantAndCollect(draft.save as SaveGame);
          unlocked.forEach((achievement) => {
            draft.toasts.push(
              toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
            );
          });
          draft.toasts.push(toast(`${member.name} joined the nook`, member.line, 'gold', 'friends'));
        }
      });
      return outcome;
    },

    buyDecorationAction: (decorationId) => {
      const decoration = decorationById(decorationId);
      if (!decoration) return { ok: false, reason: 'Unknown decoration' };
      let outcome: { ok: boolean; reason?: string } = { ok: false };
      set((draft) => {
        outcome = buyDecoration(draft.save as SaveGame, decorationId);
        if (outcome.ok) {
          advanceMissions(draft.save as SaveGame, { type: 'spend_coins', amount: decoration.price });
          const unlocked = grantAndCollect(draft.save as SaveGame);
          unlocked.forEach((achievement) => {
            draft.toasts.push(
              toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
            );
          });
          draft.toasts.push(toast(`${decoration.name} is yours`, 'Find it in your decoration storage.', 'pink', 'plant'));
        }
      });
      return outcome;
    },

    placeDecorationAction: (decorationId, x, y, uid) => {
      let outcome: { ok: boolean; reason?: string } = { ok: false };
      set((draft) => {
        const placed = placeDecoration(draft.save as SaveGame, decorationId, x, y, uid);
        outcome = { ok: placed.ok, reason: placed.reason };
        if (placed.ok && !uid) {
          advanceMissions(draft.save as SaveGame, { type: 'decorate', amount: 1 });
          const unlocked = grantAndCollect(draft.save as SaveGame);
          unlocked.forEach((achievement) => {
            draft.toasts.push(
              toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
            );
          });
          draft.toasts.push(
            toast('A lovely new corner', `${decorationById(decorationId)?.name ?? 'Decoration'} placed.`, 'pink', 'plant'),
          );
        }
      });
      return outcome;
    },

    removeDecorationAction: (uid) => {
      set((draft) => {
        removeDecoration(draft.save as SaveGame, uid);
      });
    },

    claimDailyMission: (missionId) => {
      const state = get();
      const mission = state.save.missions.missions.find((item) => item.id === missionId);
      if (!mission) return false;
      let ok = false;
      set((draft) => {
        const result = claimMission(
          draft.save as SaveGame,
          mission,
          draft.save.missions.progress,
          draft.save.missions.claimed,
        );
        ok = result.ok;
        if (result.ok) {
          draft.toasts.push(
            toast('Mission complete', `+${mission.rewardCoins} coins${mission.rewardPearls ? ` · +${mission.rewardPearls} pearl` : ''}`, 'gold', 'star'),
          );
          const unlocked = grantAndCollect(draft.save as SaveGame);
          unlocked.forEach((achievement) => {
            draft.toasts.push(
              toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
            );
          });
        }
      });
      return ok;
    },

    claimWeeklyMission: (missionId) => {
      const state = get();
      const missions = generateWeeklyMissions(state.save.weekly.weekKey, state.save.player.level);
      const mission = missions.find((item) => item.id === missionId);
      if (!mission) return false;
      let ok = false;
      set((draft) => {
        const result = claimMission(
          draft.save as SaveGame,
          mission,
          draft.save.weekly.progress,
          draft.save.weekly.claimed,
        );
        ok = result.ok;
        if (result.ok) {
          draft.toasts.push(
            toast('Weekly mission complete', `+${mission.rewardCoins} coins${mission.rewardPearls ? ` · +${mission.rewardPearls} pearl` : ''}`, 'gold', 'calendar'),
          );
          const unlocked = grantAndCollect(draft.save as SaveGame);
          unlocked.forEach((achievement) => {
            draft.toasts.push(
              toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
            );
          });
        }
      });
      return ok;
    },

    claimEventMission: (eventId, missionId) => {
      const event = getActiveEvents().find((item) => item.id === eventId);
      if (!event) return false;
      const mission = event.missions.find((item) => item.id === missionId);
      if (!mission) return false;
      let ok = false;
      set((draft) => {
        const entry = ensureEventSave(draft.save as SaveGame, eventId);
        const result = claimMission(draft.save as SaveGame, mission, entry.progress, entry.claimed, true);
        ok = result.ok;
        if (result.ok) {
          draft.toasts.push(
            toast('Event mission complete', `+${mission.rewardCoins} coins${mission.rewardPearls ? ` · +${mission.rewardPearls} pearl` : ''}`, 'gold', event.icon),
          );
          const unlocked = grantAndCollect(draft.save as SaveGame);
          unlocked.forEach((achievement) => {
            draft.toasts.push(
              toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
            );
          });
        }
      });
      return ok;
    },

    claimEventFinal: (eventId) => {
      const event = getActiveEvents().find((item) => item.id === eventId);
      if (!event) return;
      set((draft) => {
        const result = claimEventFinalReward(draft.save as SaveGame, event);
        if (result.ok) {
          draft.toasts.push(
            toast(`${event.name} complete`, `+${result.coins} coins · +${result.pearls} pearls`, 'gold', event.icon),
          );
          const unlocked = grantAndCollect(draft.save as SaveGame);
          unlocked.forEach((achievement) => {
            draft.toasts.push(
              toast(`Achievement: ${achievement.name}`, achievement.description, 'gold', achievement.icon),
            );
          });
        } else if (result.reason) {
          draft.toasts.push(toast('Not yet', result.reason, 'pink', event.icon));
        }
      });
    },

    saveGalleryEntry: async (entry) => {
      const full: GalleryEntry = { ...entry, id: makeId('gallery'), createdAt: Date.now() };
      await addGalleryEntry(full);
      set((draft) => {
        draft.save.modes.zenCreations += 1;
        draft.toasts.push(toast('Saved to your gallery', entry.title, 'pink', 'camera'));
      });
      return full;
    },

    deleteGalleryImage: async (id) => {
      await deleteGalleryEntry(id);
      set((draft) => {
        draft.toasts.push(toast('Photo removed', 'The little memory is gone.', 'cozy', 'camera'));
      });
    },

    advanceTutorial: () => {
      set((state) => {
        state.save.tutorial.step += 1;
      });
    },

    completeTutorial: () => {
      set((state) => {
        state.save.tutorial.completed = true;
        state.save.tutorial.step = 0;
      });
    },

    skipTutorial: () => {
      set((state) => {
        state.save.tutorial.completed = true;
        state.save.tutorial.skipped = true;
      });
    },

    replayTutorial: () => {
      set((state) => {
        state.save.tutorial.completed = false;
        state.save.tutorial.skipped = false;
        state.save.tutorial.step = 0;
      });
    },

    markDialogueSeen: (id) => {
      set((state) => {
        if (!state.save.story.seenDialogues.includes(id)) state.save.story.seenDialogues.push(id);
      });
    },
  })),
);

const buildFreeResult = (
  save: SaveGame,
  dish: Dish,
  plateScore: number,
  miniGames: MiniGameResult[],
): ServiceResultView => {
  const grade = gradeDish({
    save,
    dish,
    freshness: 100,
    plateScore,
    miniGameScores: miniGames.map((item) => item.score),
  });
  const coinsBefore = save.player.coins;
  const pearlsBefore = save.player.pearls;
  const xpBefore = save.player.xp;
  const notices: OutcomeNotice[] = [];
  const recipe = dish.recipeId ? recipeById(dish.recipeId) : undefined;

  if (dish.recipeId && !save.discoveredRecipes.includes(dish.recipeId)) {
    save.discoveredRecipes.push(dish.recipeId);
    save.recipeDiscovery[dish.recipeId] = Date.now();
    const discoveryCoins = 15 + (recipe?.difficulty ?? 1) * 3;
    const discoveryPearls = (recipe?.difficulty ?? 1) >= 4 ? 1 : 0;
    earnCoins(save, discoveryCoins);
    addPearls(save, discoveryPearls);
    notices.push({
      id: makeId('notice'),
      kind: 'recipe',
      title: 'New Recipe!',
      description: recipe?.name ?? dish.name,
      coins: discoveryCoins,
      pearls: discoveryPearls,
      art: 'book',
    });
    advanceMissions(save, { type: 'discover_recipe', amount: 1, recipeId: dish.recipeId });
  }

  save.stats.sushiMade += 1;
  if (recipe?.category === 'nigiri') save.stats.nigiriMade += 1;
  const xp = 3 + (recipe?.difficulty ?? 1) * 2;
  save.player.xp += xp;
  const newLevel = levelFromXp(save.player.xp);
  if (newLevel > save.player.level) {
    save.player.level = newLevel;
    notices.push({
      id: makeId('notice'),
      kind: 'level',
      title: `Level ${newLevel}!`,
      description: 'The nook feels a little bigger.',
      art: 'lantern',
    });
  }
  advanceMissions(save, {
    type: 'cook_recipe',
    amount: 1,
    recipeId: recipe?.id,
    ingredients: dish.ingredients,
  });
  advanceMissions(save, { type: 'use_ingredient', amount: 1, ingredients: dish.ingredients });

  const unlocked = grantAndCollect(save);
  unlocked.forEach((achievement) => {
    notices.push({
      id: makeId('notice'),
      kind: 'achievement',
      title: `Achievement: ${achievement.name}`,
      description: achievement.description,
      coins: achievement.rewardCoins,
      pearls: achievement.rewardPearls,
      art: achievement.icon,
    });
  });

  return {
    id: makeId('result'),
    kind: 'free',
    mode: 'zen',
    dish,
    grade,
    coins: Math.max(0, save.player.coins - coinsBefore),
    pearls: Math.max(0, save.player.pearls - pearlsBefore),
    xp: Math.max(0, save.player.xp - xpBefore),
    notices,
  };
};
