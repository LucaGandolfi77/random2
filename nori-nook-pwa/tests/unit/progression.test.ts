import { describe, expect, it } from 'vitest';
import { createTestSave } from './helpers';
import { levelFromXp, levelProgress, nextLevelXp, XP_THRESHOLDS } from '@/game/progression/levels';
import { achievementValue, grantAchievements, newlyUnlockedAchievements } from '@/game/progression/achievements';

describe('progression and achievements', () => {
  it('maps XP thresholds to levels', () => {
    expect(levelFromXp(0)).toBe(1);
    expect(levelFromXp(39)).toBe(1);
    expect(levelFromXp(40)).toBe(2);
    expect(levelFromXp(XP_THRESHOLDS[4]!)).toBe(5);
    const progress = levelProgress(40);
    expect(progress.level).toBe(2);
    expect(progress.ratio).toBe(0);
    expect(nextLevelXp(2)).toBeGreaterThan(40);
  });

  it('unlocks achievements and pays rewards once', () => {
    const save = createTestSave();
    save.stats.sushiMade = 1;
    const unlocked = newlyUnlockedAchievements(save);
    expect(unlocked.some((achievement) => achievement.id === 'first_sushi')).toBe(true);
    const coins = save.player.coins;
    const pearls = save.player.pearls;
    const granted = grantAchievements(save);
    expect(granted.length).toBeGreaterThan(0);
    expect(save.player.coins).toBeGreaterThan(coins);
    expect(save.player.pearls).toBeGreaterThan(pearls);
    expect(grantAchievements(save)).toEqual([]);
    expect(save.achievements.first_sushi).toBeTruthy();
  });

  it('derives progress values from saves', () => {
    const save = createTestSave();
    save.stats.customersServed = 12;
    const achievement = {
      id: 'test',
      name: 'Test',
      description: 'Test',
      icon: 'star',
      metric: 'customers_served' as const,
      target: 10,
      rewardCoins: 0,
      rewardPearls: 0,
    };
    expect(achievementValue(save, achievement)).toBe(12);
  });
});
