import type { MiniGameId, SaveGame } from '@/types/game';
import { getUpgradeEffect } from '@/game/ingredient-system/stock';
import { clamp } from '@/utils/math';

export interface PerfectRiceInput {
  coverage: number;
  consistency: number;
  stopDelta: number;
}

export const scorePerfectRice = ({ coverage, consistency, stopDelta }: PerfectRiceInput): number =>
  Math.round(clamp(clamp(coverage, 0, 1) * 42 + clamp(consistency, 0, 1) * 33 + (1 - clamp(stopDelta, 0, 1)) * 25));

export interface RiceCookerInput {
  needle: number;
  target: number;
  window: number;
}

export const scoreRiceCooker = ({ needle, target, window }: RiceCookerInput): number => {
  const diff = Math.abs(needle - target);
  return Math.round(clamp(100 - (diff / Math.max(1, window)) * 75));
};

export interface FanRiceInput {
  rhythm: number;
  speed: number;
  consistency: number;
}

export const scoreFanRice = ({ rhythm, speed, consistency }: FanRiceInput): number =>
  Math.round(clamp(clamp(rhythm, 0, 1) * 45 + clamp(1 - Math.abs(speed - 0.65) / 0.65, 0, 1) * 30 + clamp(consistency, 0, 1) * 25));

export interface SliceInput {
  deviation: number;
  angleError: number;
  thicknessError: number;
}

export const scorePerfectSlice = ({ deviation, angleError, thicknessError }: SliceInput): number =>
  Math.round(
    clamp(
      100 -
        clamp(deviation, 0, 1) * 52 -
        clamp(angleError, 0, 1) * 26 -
        clamp(thicknessError, 0, 1) * 22,
    ),
  );

export interface NoriWrapInput {
  xError: number;
  yError: number;
  rotationError: number;
}

export const scoreNoriWrap = ({ xError, yError, rotationError }: NoriWrapInput): number =>
  Math.round(
    clamp(100 - clamp(xError, 0, 1) * 35 - clamp(yError, 0, 1) * 35 - clamp(rotationError, 0, 1) * 30),
  );

export interface RollMasterInput {
  pressureError: number;
  smoothness: number;
  closure: number;
}

export const scoreRollMaster = ({ pressureError, smoothness, closure }: RollMasterInput): number =>
  Math.round(clamp((1 - clamp(pressureError, 0, 1)) * 50 + clamp(smoothness, 0, 1) * 25 + clamp(closure, 0, 1) * 25));

export interface NigiriMasterInput {
  inZoneRatio: number;
  pressureError: number;
}

export const scoreNigiriMaster = ({ inZoneRatio, pressureError }: NigiriMasterInput): number =>
  Math.round(clamp(clamp(inZoneRatio, 0, 1) * 65 + (1 - clamp(pressureError, 0, 1)) * 35));

export interface WasabiInput {
  amount: number;
  target: number;
}

export const scoreWasabiBalance = ({ amount, target }: WasabiInput): number => {
  const ratio = Math.abs(amount - target) / Math.max(0.01, target);
  return Math.round(clamp(100 - ratio * 58));
};

export interface PlateArtInput {
  symmetry: number;
  spacing: number;
  coverage: number;
  creativity: number;
}

export const scorePlateArt = ({ symmetry, spacing, coverage, creativity }: PlateArtInput): number =>
  Math.round(
    clamp(
      clamp(symmetry) * 0.3 + clamp(spacing) * 0.24 + clamp(coverage) * 0.2 + clamp(creativity) * 0.26,
    ),
  );

export interface QuickServiceInput {
  correct: number;
  total: number;
  seconds: number;
  limit: number;
}

export const scoreQuickService = ({ correct, total, seconds, limit }: QuickServiceInput): number => {
  if (total <= 0) return 0;
  const accuracy = clamp(correct / total, 0, 1) * 100;
  const speed = clamp(100 - (seconds / Math.max(1, limit)) * 65);
  return Math.round(clamp(accuracy * 0.85 + speed * 0.15));
};

export interface TeaMasterInput {
  tempError: number;
  timeError: number;
}

export const scoreTeaMaster = ({ tempError, timeError }: TeaMasterInput): number =>
  Math.round(clamp(100 - clamp(tempError, 0, 1) * 50 - clamp(timeError, 0, 1) * 50));

export interface DeliveryPackInput {
  coverage: number;
  overlap: number;
  misplaced: number;
}

export const scoreDeliveryPack = ({ coverage, overlap, misplaced }: DeliveryPackInput): number =>
  Math.round(clamp(clamp(coverage, 0, 1) * 55 + (1 - clamp(overlap, 0, 1)) * 25 + (1 - clamp(misplaced, 0, 1)) * 20));

export const miniGameScoreStars = (score: number): number => {
  if (score >= 90) return 3;
  if (score >= 70) return 2;
  return score >= 40 ? 1 : 0;
};

export const miniGameAssistBonus = (save: SaveGame, gameId: MiniGameId): number => {
  let bonus = getUpgradeEffect(save, 'mini_game_bonus');
  if (save.staff.hired.includes('mika') && ['perfect_rice', 'rice_cooker', 'fan_rice'].includes(gameId)) {
    bonus += 8;
  }
  return bonus;
};

export const applyMiniGameBonus = (score: number, bonus: number): number =>
  Math.round(clamp(score + Math.max(0, bonus)));
