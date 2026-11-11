import { describe, expect, it } from 'vitest';
import { createTestSave } from './helpers';
import {
  getActiveEvents,
  getUpcomingEvents,
  isEventActive,
  claimEventFinalReward,
  eventDaysRemaining,
} from '@/game/events/events';
import { createDailySpecial, markDailyComplete, syncDailyState, gradeAtLeast } from '@/game/events/daily';
import { ensureEventSave } from '@/game/events/eventState';
import { customerAllergenConflict } from '@/game/economy/rewards';
import { customerById } from '@/data/customers';
import { recipeById } from '@/data/recipes';

describe('events and daily specials', () => {
  it('activates seasonal events at the right times, including winter wrap', () => {
    expect(isEventActive({ ...getActiveEvents(new Date(2026, 4, 10))[0]! }, new Date(2026, 4, 10))).toBe(true);
    const spring = getActiveEvents(new Date(2026, 4, 10)).map((event) => event.id);
    expect(spring).toContain('sakura_festival');
    const winter = getActiveEvents(new Date(2026, 0, 10)).map((event) => event.id);
    expect(winter).toContain('snowy_sushi');
    const summer = getActiveEvents(new Date(2026, 7, 18)).map((event) => event.id);
    expect(summer).toContain('beach_sushi');
    expect(summer).toContain('mystery_ingredient_challenge');
    expect(getActiveEvents(new Date(2026, 6, 18)).map((event) => event.id)).toContain('bento_competition');
  });

  it('returns upcoming events with non-negative day counts', () => {
    const upcoming = getUpcomingEvents(new Date(2026, 4, 10), 4);
    expect(upcoming).toHaveLength(4);
    upcoming.forEach((entry) => expect(entry.days).toBeGreaterThan(0));
    expect(eventDaysRemaining(getActiveEvents(new Date(2026, 4, 10))[0]!, new Date(2026, 4, 10))).toBeGreaterThan(0);
  });

  it('generates a deterministic daily special with a safe customer', () => {
    const a = createDailySpecial('2026-05-10');
    const b = createDailySpecial('2026-05-10');
    expect(a).toEqual(b);
    const recipe = recipeById(a.recipeId)!;
    const customer = customerById(a.customerId)!;
    expect(customerAllergenConflict(customer, recipe)).toEqual([]);
    expect(gradeAtLeast(a.targetGrade, 'Good')).toBe(true);
  });

  it('resets daily completion on a new day but keeps the streak history', () => {
    const save = createTestSave();
    save.daily = {
      dateKey: '2026-05-09',
      completed: true,
      streak: 4,
      lastCompletedDate: '2026-05-09',
    };
    syncDailyState(save, '2026-05-10');
    expect(save.daily.dateKey).toBe('2026-05-10');
    expect(save.daily.completed).toBe(false);
    expect(save.daily.streak).toBe(4);
    expect(save.daily.lastCompletedDate).toBe('2026-05-09');
  });

  it('increments and resets the daily streak', () => {
    const save = createTestSave();
    save.daily = {
      dateKey: '2026-05-09',
      completed: false,
      streak: 4,
      lastCompletedDate: '2026-05-09',
    };
    const special = createDailySpecial('2026-05-10');
    const result = markDailyComplete(save, special, 'Masterpiece', '2026-05-10');
    expect(result.completed).toBe(true);
    expect(result.streak).toBe(5);
    expect(save.daily.completed).toBe(true);

    const broken = createTestSave();
    broken.daily = {
      dateKey: '2026-05-01',
      completed: false,
      streak: 8,
      lastCompletedDate: '2026-05-01',
    };
    const restarted = markDailyComplete(broken, special, 'Masterpiece', '2026-05-10');
    expect(restarted.streak).toBe(1);
  });

  it('does not complete a daily below the target grade', () => {
    const save = createTestSave();
    const special = { ...createDailySpecial('2026-05-10'), targetGrade: 'Perfect' as const };
    const result = markDailyComplete(save, special, 'Good', '2026-05-10');
    expect(result.completed).toBe(false);
    expect(save.daily.completed).toBe(false);
  });

  it('claims the final event reward exactly once', () => {
    const save = createTestSave();
    const event = getActiveEvents(new Date(2026, 4, 10)).find((entry) => entry.id === 'sakura_festival')!;
    const entry = ensureEventSave(save, event.id);
    entry.claimed = event.missions.map((mission) => mission.id);
    const coins = save.player.coins;
    const pearls = save.player.pearls;
    const first = claimEventFinalReward(save, event);
    expect(first.ok).toBe(true);
    expect(save.player.coins).toBeGreaterThan(coins);
    expect(save.player.pearls).toBeGreaterThan(pearls);
    expect(save.bonusRecipes).toContain('sakura_roll');
    expect(save.ownedDecorations.length).toBeGreaterThan(1);
    const second = claimEventFinalReward(save, event);
    expect(second.ok).toBe(false);
  });

  it('refuses the final event reward before missions are claimed', () => {
    const save = createTestSave();
    const event = getActiveEvents(new Date(2026, 4, 10))[0]!;
    const result = claimEventFinalReward(save, event);
    expect(result.ok).toBe(false);
  });
});
