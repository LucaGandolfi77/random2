import { describe, expect, it } from 'vitest';
import { createTestSave } from './helpers';
import {
  applyMissionProgress,
  claimMission,
  generateDailyMissions,
  generateWeeklyMissions,
  missionComplete,
  missionProgressLabel,
  refreshMissions,
} from '@/game/missions/missions';
import type { Mission } from '@/types/game';

const mission: Mission = {
  id: 'test:salmon',
  title: 'Salmon Day',
  description: 'Cook with salmon',
  metric: 'cook_recipe',
  target: 2,
  targetId: 'salmon',
  rewardCoins: 30,
  rewardPearls: 1,
};

describe('missions', () => {
  it('generates deterministic daily missions', () => {
    const a = generateDailyMissions('2026-05-10', 3);
    const b = generateDailyMissions('2026-05-10', 3);
    expect(a).toEqual(b);
    expect(a).toHaveLength(3);
    expect(new Set(a.map((item) => item.id)).size).toBe(3);
    expect(a.every((item) => item.rewardCoins > 0)).toBe(true);
  });

  it('generates deterministic weekly missions without duplicate ids', () => {
    const missions = generateWeeklyMissions('2026-W19', 3);
    expect(missions).toHaveLength(3);
    expect(new Set(missions.map((item) => item.id)).size).toBe(3);
  });

  it('tracks recipe and ingredient progress', () => {
    const progress: Record<string, number> = {};
    applyMissionProgress(progress, [mission], {
      type: 'cook_recipe',
      recipeId: 'salmon_nigiri',
      ingredients: [{ id: 'salmon', qty: 1 }],
    });
    expect(progress['test:salmon']).toBe(1);
    applyMissionProgress(progress, [mission], {
      type: 'cook_recipe',
      recipeId: 'salmon_avocado_roll',
      ingredients: [{ id: 'salmon', qty: 1 }, { id: 'avocado', qty: 1 }],
    });
    expect(progress['test:salmon']).toBe(2);
    expect(missionComplete(mission, progress)).toBe(true);
    expect(missionProgressLabel(mission, progress)).toBe('2 / 2');
  });

  it('does not progress a mission with a different target', () => {
    const progress: Record<string, number> = {};
    applyMissionProgress(progress, [mission], {
      type: 'cook_recipe',
      recipeId: 'tuna_nigiri',
      ingredients: [{ id: 'tuna', qty: 1 }],
    });
    expect(progress['test:salmon'] ?? 0).toBe(0);
  });

  it('handles mini-game target filters', () => {
    const tea: Mission = {
      id: 'test:tea',
      title: 'Tea',
      description: 'Brew',
      metric: 'play_minigame',
      target: 2,
      targetId: 'tea_master',
      rewardCoins: 20,
      rewardPearls: 0,
    };
    const progress: Record<string, number> = {};
    applyMissionProgress(progress, [tea], { type: 'play_minigame', miniGameId: 'perfect_rice' });
    expect(progress['test:tea'] ?? 0).toBe(0);
    applyMissionProgress(progress, [tea], { type: 'play_minigame', miniGameId: 'tea_master' });
    expect(progress['test:tea']).toBe(1);
  });

  it('claims mission rewards once', () => {
    const save = createTestSave();
    const progress = { 'test:salmon': 2 };
    const claimed: string[] = [];
    const coins = save.player.coins;
    const pearls = save.player.pearls;
    expect(claimMission(save, mission, progress, claimed).ok).toBe(true);
    expect(save.player.coins).toBe(coins + 30);
    expect(save.player.pearls).toBe(pearls + 1);
    expect(claimed).toContain('test:salmon');
    expect(claimMission(save, mission, progress, claimed).ok).toBe(false);
  });

  it('refreshes daily and weekly mission buckets when dates change', () => {
    const save = createTestSave();
    const previousDaily = save.missions.missions.map((item) => item.id);
    refreshMissions(save, '2026-06-01', '2026-W23');
    expect(save.missions.dateKey).toBe('2026-06-01');
    expect(save.weekly.weekKey).toBe('2026-W23');
    expect(save.missions.missions.map((item) => item.id)).not.toEqual(previousDaily);
  });
});
