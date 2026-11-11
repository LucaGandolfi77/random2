import type { Mission, MissionMetric, RecipeIngredient, SaveGame } from '@/types/game';
import { DAILY_MISSION_POOL, WEEKLY_MISSION_POOL, type MissionTemplate } from '@/data/missions';
import { ingredientById } from '@/data/ingredients';
import { recipeById } from '@/data/recipes';
import { createRng, pickWeighted } from '@/utils/rng';

export interface MissionProgressEvent {
  type: MissionMetric;
  amount?: number;
  recipeId?: string;
  ingredients?: RecipeIngredient[];
  miniGameId?: string;
  coins?: number;
}

const templateAvailable = (template: MissionTemplate, level: number): boolean => {
  if (!template.targetId) return true;
  const ingredient = ingredientById(template.targetId);
  if (ingredient) return ingredient.unlockLevel <= level;
  const recipe = recipeById(template.targetId);
  if (recipe) return recipe.unlockLevel <= level;
  return true;
};

const chooseMissions = (
  pool: MissionTemplate[],
  seed: string,
  count: number,
  prefix: string,
  level: number,
): Mission[] => {
  const rng = createRng(seed);
  const available = pool.filter((template) => templateAvailable(template, level));
  const chosen: MissionTemplate[] = [];
  const working = [...available];
  while (chosen.length < count && working.length > 0) {
    const picked = pickWeighted(working, rng);
    if (!picked) break;
    chosen.push(picked);
    const index = working.findIndex((item) => item.key === picked.key);
    if (index >= 0) working.splice(index, 1);
  }
  return chosen.map((template) => ({
    id: `${prefix}:${template.key}`,
    title: template.title,
    description: template.description,
    metric: template.metric,
    target: template.target,
    targetId: template.targetId,
    rewardCoins: template.rewardCoins,
    rewardPearls: template.rewardPearls,
  }));
};

export const generateDailyMissions = (dateKey: string, level: number): Mission[] =>
  chooseMissions(DAILY_MISSION_POOL, `daily-missions:${dateKey}`, 3, `daily:${dateKey}`, level);

export const generateWeeklyMissions = (weekKey: string, level: number): Mission[] =>
  chooseMissions(WEEKLY_MISSION_POOL, `weekly-missions:${weekKey}`, 3, `weekly:${weekKey}`, level);

export const refreshMissions = (save: SaveGame, dateKey: string, weekKey: string): void => {
  if (save.missions.dateKey !== dateKey) {
    save.missions = {
      dateKey,
      missions: generateDailyMissions(dateKey, save.player.level),
      progress: {},
      claimed: [],
    };
  }
  if (save.weekly.weekKey !== weekKey) {
    save.weekly = {
      weekKey,
      progress: {},
      claimed: [],
    };
  }
};

export const weeklyMissionList = (weekKey: string, level: number): Mission[] =>
  generateWeeklyMissions(weekKey, level);

const eventMatchesMission = (mission: Mission, event: MissionProgressEvent): boolean => {
  if (mission.metric !== event.type) return false;
  switch (event.type) {
    case 'play_minigame':
      return !mission.targetId || mission.targetId === event.miniGameId;
    case 'use_ingredient':
      return Boolean(mission.targetId) && (event.ingredients ?? []).some((item) => item.id === mission.targetId);
    case 'cook_recipe':
      if (!mission.targetId) return true;
      return (
        event.recipeId === mission.targetId ||
        (event.ingredients ?? []).some((item) => item.id === mission.targetId)
      );
    default:
      return true;
  }
};

const incrementForMission = (mission: Mission, event: MissionProgressEvent): number => {
  if (!eventMatchesMission(mission, event)) return 0;
  if (event.type === 'use_ingredient') {
    return (event.ingredients ?? []).filter((item) => item.id === mission.targetId).reduce((sum, item) => sum + item.qty, 0);
  }
  if (event.type === 'spend_coins' || event.type === 'earn_coins') {
    return Math.max(0, event.amount ?? event.coins ?? 1);
  }
  return Math.max(0, event.amount ?? 1);
};

export const applyMissionProgress = (
  progress: Record<string, number>,
  missions: Mission[],
  event: MissionProgressEvent,
): boolean => {
  let changed = false;
  missions.forEach((mission) => {
    const increment = incrementForMission(mission, event);
    if (increment <= 0) return;
    const current = progress[mission.id] ?? 0;
    if (current >= mission.target) return;
    progress[mission.id] = Math.min(mission.target, current + increment);
    changed = true;
  });
  return changed;
};

export const missionComplete = (mission: Mission, progress: Record<string, number>): boolean =>
  (progress[mission.id] ?? 0) >= mission.target;

export const claimMission = (
  save: SaveGame,
  mission: Mission,
  progress: Record<string, number>,
  claimed: string[],
  isEvent = false,
): { ok: boolean; reason?: string } => {
  if (!missionComplete(mission, progress)) return { ok: false, reason: 'Not complete yet' };
  if (claimed.includes(mission.id)) return { ok: false, reason: 'Already claimed' };
  claimed.push(mission.id);
  save.player.coins += mission.rewardCoins;
  save.player.pearls += mission.rewardPearls;
  if (isEvent) save.stats.eventMissionsClaimed += 1;
  return { ok: true };
};

export const missionProgressLabel = (mission: Mission, progress: Record<string, number>): string =>
  `${Math.min(progress[mission.id] ?? 0, mission.target)} / ${mission.target}`;
