import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/game/initialState';
import { simulateOffline } from '../src/game/engine';

const NOW = 1_700_000_000_000;

describe('offline progression', () => {
  it('credits resources, advances time and writes a report', () => {
    const state = createInitialState(NOW - 60_000, 101);
    state.lastSeen = NOW - 60_000;
    const wood = state.resources.wood;
    const coal = state.resources.coal;
    const report = simulateOffline(state, NOW);
    expect(report.seconds).toBeCloseTo(60, 0);
    expect(report.creditedSeconds).toBeCloseTo(60, 0);
    expect(report.capped).toBe(false);
    expect(state.lastSeen).toBe(NOW);
    expect(state.resources.wood).toBeGreaterThan(wood);
    expect(state.resources.coal).toBeLessThan(coal);
    expect(report.consumed.coal).toBeGreaterThan(0);
    expect(report.days).toBeGreaterThanOrEqual(0);
  });

  it('caps long absences at eight hours', () => {
    const state = createInitialState(NOW - 24 * 60 * 60 * 1000, 102);
    state.lastSeen = NOW - 24 * 60 * 60 * 1000;
    const report = simulateOffline(state, NOW);
    expect(report.seconds).toBeCloseTo(24 * 60 * 60, 0);
    expect(report.creditedSeconds).toBe(8 * 60 * 60);
    expect(report.capped).toBe(true);
    expect(report.days).toBeGreaterThan(0);
  });

  it('never kills survivors while the app is closed', () => {
    const state = createInitialState(NOW - 60 * 60 * 1000, 103);
    state.lastSeen = NOW - 60 * 60 * 1000;
    state.furnace.mode = 'off';
    state.weather.phase = 'blizzard';
    state.weather.remaining = 600;
    state.weather.intensity = 1.2;
    state.furnace.heat = 0;
    state.furnace.temperature = -60;
    state.resources.coal = 0;
    state.resources.meals = 0;
    for (const survivor of state.survivors) {
      survivor.health = 0.1;
      survivor.hunger = 100;
      survivor.warmth = 0;
    }
    const before = state.survivors.length;
    const report = simulateOffline(state, NOW);
    expect(state.survivors.length).toBe(before);
    expect(report.survivorsLost).toBe(0);
    expect(state.survivors.every((survivor) => survivor.health >= 1)).toBe(true);
  });

  it('does nothing meaningful for a very short absence', () => {
    const state = createInitialState(NOW - 2_000, 104);
    state.lastSeen = NOW - 2_000;
    const before = state.resources.wood;
    const report = simulateOffline(state, NOW);
    expect(report.creditedSeconds).toBeCloseTo(2, 0);
    expect(state.resources.wood).toBeGreaterThanOrEqual(before);
    expect(report.survivorsLost).toBe(0);
  });

  it('reports meals served and consumes coal even when production is offline-reduced', () => {
    const state = createInitialState(NOW - 70_000, 105);
    state.lastSeen = NOW - 70_000;
    state.resources.coal = 300;
    state.resources.meals = 60;
    const report = simulateOffline(state, NOW);
    expect(report.mealsServed).toBeGreaterThanOrEqual(0);
    expect(report.gained.wood).toBeGreaterThan(0);
    expect(report.consumed.coal).toBeGreaterThan(0);
  });
});
