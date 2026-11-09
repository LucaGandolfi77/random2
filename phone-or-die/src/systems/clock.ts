import type { Difficulty } from '@/core/types';
import { chapters } from '@/data/chapters';

export const NIGHT_START_MINUTE = 22 * 60;
export const NIGHT_END_MINUTE = 6 * 60;
export const NIGHT_LENGTH = 480;

export const formatNightTime = (nightMinute: number): string => {
  const total = Math.floor(NIGHT_START_MINUTE + Math.max(0, Math.min(NIGHT_LENGTH, nightMinute))) % (24 * 60);
  const hours24 = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours24 >= 12 ? 'PM' : 'AM';
  const hours12 = hours24 % 12 === 0 ? 12 : hours24 % 12;
  return `${hours12}:${String(minutes).padStart(2, '0')} ${suffix}`;
};

export const formatCountdown = (seconds: number): string => {
  const safe = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, '0')}`;
};

export const formatDuration = (seconds: number): string => {
  const safe = Math.max(0, Math.round(seconds));
  if (safe < 60) return `${safe}s`;
  return `${Math.floor(safe / 60)}m ${safe % 60}s`;
};

export const chapterForNightMinute = (nightMinute: number): number => {
  let result = 0;
  for (const chapter of chapters) {
    if (nightMinute >= chapter.startMinute) result = chapter.index;
  }
  return result;
};

export const minutesPerSecond = (difficulty: Difficulty): number => {
  switch (difficulty) {
    case 'story':
      return 0.17;
    case 'nightmare':
      return 0.32;
    default:
      return 0.24;
  }
};

export const nextChapterMinute = (nightMinute: number): number | null => {
  const next = chapters.find((chapter) => chapter.startMinute > nightMinute);
  return next ? next.startMinute : null;
};

export const timeUntilDawn = (nightMinute: number): string => {
  const remaining = Math.max(0, NIGHT_LENGTH - nightMinute);
  return `${Math.floor(remaining / 60)}h ${Math.round(remaining % 60)}m`;
};

export const chapterProgress = (nightMinute: number): number =>
  Math.max(0, Math.min(1, nightMinute / NIGHT_LENGTH));
