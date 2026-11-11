import type { GameEvent, SaveGame } from '@/types/game';
import { EVENTS } from '@/data/events';
import { isDateInAnnualWindow, daysUntilAnnualWindowEnd } from '@/utils/dates';
import { eventMissionState, ensureEventSave } from './eventState';

export const isEventActive = (event: GameEvent, date: Date = new Date()): boolean =>
  isDateInAnnualWindow(date, event.startMonth, event.startDay, event.endMonth, event.endDay);

export const getActiveEvents = (date: Date = new Date()): GameEvent[] =>
  EVENTS.filter((event) => isEventActive(event, date)).sort((a, b) => (a.type === b.type ? 0 : a.type === 'seasonal' ? -1 : 1));

export const eventDaysRemaining = (event: GameEvent, date: Date = new Date()): number =>
  daysUntilAnnualWindowEnd(date, event.endMonth, event.endDay);

const nextStart = (event: GameEvent, date: Date): Date => {
  const start = new Date(date.getFullYear(), event.startMonth - 1, event.startDay);
  if (start.getTime() < new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()) {
    start.setFullYear(start.getFullYear() + 1);
  }
  return start;
};

export const getUpcomingEvents = (date: Date = new Date(), count = 3): Array<{ event: GameEvent; days: number }> =>
  EVENTS.filter((event) => !isEventActive(event, date))
    .map((event) => {
      const days = Math.max(
        1,
        Math.ceil((nextStart(event, date).getTime() - date.getTime()) / 86400000),
      );
      return { event, days };
    })
    .sort((a, b) => a.days - b.days)
    .slice(0, count);

export const activeEventState = (save: SaveGame, date: Date = new Date()) =>
  getActiveEvents(date).map((event) => {
    const entry = save.events[event.id] ?? { progress: {}, claimed: [] };
    const missions = event.missions.map((mission) => ({
      mission,
      progress: entry.progress[mission.id] ?? 0,
      complete: (entry.progress[mission.id] ?? 0) >= mission.target,
      claimed: entry.claimed.includes(mission.id),
    }));
    return {
      event,
      entry,
      missions,
      daysRemaining: eventDaysRemaining(event, date),
      allClaimed:
        missions.every((item) => item.claimed) && !entry.claimed.includes('__final__'),
      finalClaimed: entry.claimed.includes('__final__'),
      missionState: missions,
    };
  });

export const claimEventFinalReward = (
  save: SaveGame,
  event: GameEvent,
): { ok: boolean; reason?: string; coins: number; pearls: number } => {
  const entry = ensureEventSave(save, event.id);
  const complete = event.missions.every((mission) => entry.claimed.includes(mission.id));
  if (!complete) return { ok: false, reason: 'Complete all event missions first', coins: 0, pearls: 0 };
  if (entry.claimed.includes('__final__')) return { ok: false, reason: 'Reward already claimed', coins: 0, pearls: 0 };
  entry.claimed.push('__final__');
  save.player.coins += event.rewardCoins;
  save.player.pearls += event.rewardPearls;
  event.decorationIds.forEach((decorationId) => {
    if (!save.ownedDecorations.includes(decorationId)) {
      save.ownedDecorations.push(decorationId);
    } else {
      save.player.coins += 25;
    }
  });
  event.recipeIds.forEach((recipeId) => {
    if (!save.bonusRecipes.includes(recipeId)) save.bonusRecipes.push(recipeId);
  });
  return { ok: true, coins: event.rewardCoins, pearls: event.rewardPearls };
};

export const eventProgressSummary = (save: SaveGame, event: GameEvent) => {
  const entry = ensureEventSave(save, event.id);
  const completed = event.missions.filter(
    (mission) => (entry.progress[mission.id] ?? 0) >= mission.target,
  ).length;
  return { completed, total: event.missions.length, entry };
};
