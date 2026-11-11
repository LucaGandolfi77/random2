import { describe, expect, it } from 'vitest';
import {
  applyMiniGameBonus,
  miniGameScoreStars,
  scoreDeliveryPack,
  scoreFanRice,
  scoreNigiriMaster,
  scoreNoriWrap,
  scorePerfectRice,
  scorePerfectSlice,
  scorePlateArt,
  scoreQuickService,
  scoreRiceCooker,
  scoreRollMaster,
  scoreTeaMaster,
  scoreWasabiBalance,
} from '@/game/mini-games/scoring';

const inRange = (value: number) => {
  expect(Number.isFinite(value)).toBe(true);
  expect(value).toBeGreaterThanOrEqual(0);
  expect(value).toBeLessThanOrEqual(100);
};

describe('mini-game scoring', () => {
  it('scores perfect rice monotonically', () => {
    const perfect = scorePerfectRice({ coverage: 1, consistency: 1, stopDelta: 0 });
    const poor = scorePerfectRice({ coverage: 0, consistency: 0, stopDelta: 1 });
    expect(perfect).toBe(100);
    expect(poor).toBe(0);
    inRange(scorePerfectRice({ coverage: 0.5, consistency: 0.4, stopDelta: 0.4 }));
  });

  it('scores rice cooker timing', () => {
    expect(scoreRiceCooker({ needle: 50, target: 50, window: 16 })).toBe(100);
    expect(scoreRiceCooker({ needle: 65, target: 50, window: 16 })).toBeLessThan(60);
    inRange(scoreRiceCooker({ needle: 10, target: 50, window: 16 }));
  });

  it('scores fan rhythm', () => {
    inRange(scoreFanRice({ rhythm: 1, speed: 0.65, consistency: 1 }));
    inRange(scoreFanRice({ rhythm: 0, speed: 0.1, consistency: 0 }));
    expect(scoreFanRice({ rhythm: 1, speed: 0.65, consistency: 1 })).toBeGreaterThan(
      scoreFanRice({ rhythm: 0.2, speed: 0.1, consistency: 0.2 }),
    );
  });

  it('scores slicing precision', () => {
    expect(scorePerfectSlice({ deviation: 0, angleError: 0, thicknessError: 0 })).toBe(100);
    inRange(scorePerfectSlice({ deviation: 0.6, angleError: 0.5, thicknessError: 0.4 }));
  });

  it('scores nori placement', () => {
    expect(scoreNoriWrap({ xError: 0, yError: 0, rotationError: 0 })).toBe(100);
    inRange(scoreNoriWrap({ xError: 0.6, yError: 0.2, rotationError: 0.4 }));
  });

  it('scores roll pressure and closure', () => {
    inRange(scoreRollMaster({ pressureError: 0.2, smoothness: 0.9, closure: 1 }));
    expect(scoreRollMaster({ pressureError: 1, smoothness: 0, closure: 0 })).toBe(0);
  });

  it('scores nigiri pressure', () => {
    expect(scoreNigiriMaster({ inZoneRatio: 1, pressureError: 0 })).toBe(100);
    inRange(scoreNigiriMaster({ inZoneRatio: 0.3, pressureError: 0.8 }));
  });

  it('scores wasabi balance with a sweet spot', () => {
    expect(scoreWasabiBalance({ amount: 0.38, target: 0.38 })).toBe(100);
    expect(scoreWasabiBalance({ amount: 0.7, target: 0.38 })).toBeLessThan(
      scoreWasabiBalance({ amount: 0.45, target: 0.38 }),
    );
    inRange(scoreWasabiBalance({ amount: 0, target: 0.38 }));
  });

  it('scores plate art from composition values', () => {
    expect(scorePlateArt({ symmetry: 100, spacing: 100, coverage: 100, creativity: 100 })).toBe(100);
    inRange(scorePlateArt({ symmetry: 33, spacing: 60, coverage: 20, creativity: 10 }));
  });

  it('scores quick service accuracy and speed', () => {
    expect(scoreQuickService({ correct: 5, total: 5, seconds: 3, limit: 30 })).toBeGreaterThan(90);
    expect(scoreQuickService({ correct: 1, total: 5, seconds: 25, limit: 30 })).toBeLessThan(30);
    expect(scoreQuickService({ correct: 0, total: 0, seconds: 1, limit: 10 })).toBe(0);
  });

  it('scores tea temperature and timing', () => {
    expect(scoreTeaMaster({ tempError: 0, timeError: 0 })).toBe(100);
    inRange(scoreTeaMaster({ tempError: 0.7, timeError: 0.4 }));
  });

  it('scores delivery packing', () => {
    expect(scoreDeliveryPack({ coverage: 1, overlap: 0, misplaced: 0 })).toBe(100);
    inRange(scoreDeliveryPack({ coverage: 0.4, overlap: 0, misplaced: 0.2 }));
  });

  it('converts scores to stars and applies bonuses safely', () => {
    expect(miniGameScoreStars(95)).toBe(3);
    expect(miniGameScoreStars(75)).toBe(2);
    expect(miniGameScoreStars(50)).toBe(1);
    expect(miniGameScoreStars(10)).toBe(0);
    expect(applyMiniGameBonus(95, 20)).toBe(100);
    expect(applyMiniGameBonus(40, 5)).toBe(45);
  });
});
