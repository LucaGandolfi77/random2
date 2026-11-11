import type { SaveGame } from '@/types/game';
import { getActiveEvents } from '@/game/events/events';
import { ensureEventSave } from '@/game/events/eventState';
import { applyMissionProgress, type MissionProgressEvent } from './missions';

export const applyProgressToAll = (save: SaveGame, event: MissionProgressEvent, now: Date = new Date()): void => {
  applyMissionProgress(save.missions.progress, save.missions.missions, event);
  getActiveEvents(now).forEach((activeEvent) => {
    const entry = ensureEventSave(save, activeEvent.id);
    applyMissionProgress(entry.progress, activeEvent.missions, event);
  });
};

export const applyWeeklyProgress = (
  save: SaveGame,
  weeklyMissions: import('@/types/game').Mission[],
  event: MissionProgressEvent,
): void => {
  applyMissionProgress(save.weekly.progress, weeklyMissions, event);
};
