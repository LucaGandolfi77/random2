import type { EventProgressSave, GameEvent, SaveGame } from '@/types/game';

export const ensureEventSave = (save: SaveGame, eventId: string): EventProgressSave => {
  save.events[eventId] = save.events[eventId] ?? { progress: {}, claimed: [] };
  return save.events[eventId]!;
};

export const eventMissionState = (save: SaveGame, event: GameEvent) => {
  const entry = ensureEventSave(save, event.id);
  return event.missions.map((mission) => ({
    mission,
    progress: entry.progress[mission.id] ?? 0,
    complete: (entry.progress[mission.id] ?? 0) >= mission.target,
    claimed: entry.claimed.includes(mission.id),
  }));
};
