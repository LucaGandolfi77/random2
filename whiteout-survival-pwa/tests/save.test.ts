import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/game/initialState';
import {
  clearSave,
  loadGame,
  loadSettings,
  sanitizeGame,
  saveGame,
  saveSettings,
  serializeGame,
  type StorageLike,
} from '../src/game/save';

const NOW = 1_700_000_000_000;

class MemoryStorage implements StorageLike {
  data = new Map<string, string>();
  getItem(key: string): string | null {
    return this.data.get(key) ?? null;
  }
  setItem(key: string, value: string): void {
    this.data.set(key, value);
  }
  removeItem(key: string): void {
    this.data.delete(key);
  }
}

describe('save and load', () => {
  it('round-trips a settlement', () => {
    const storage = new MemoryStorage();
    const state = createInitialState(NOW, 301);
    state.resources.wood = 123;
    state.furnace.level = 3;
    state.survivors[0].name = 'Iva';
    saveGame(state, storage);
    const loaded = loadGame(NOW + 5_000, storage);
    expect(loaded.corrupted).toBe(false);
    expect(loaded.game?.resources.wood).toBe(123);
    expect(loaded.game?.furnace.level).toBe(3);
    expect(loaded.game?.survivors[0].name).toBe('Iva');
    expect(loaded.game?.version).toBe(1);
  });

  it('reports corrupt JSON instead of throwing', () => {
    const storage = new MemoryStorage();
    storage.setItem('whiteout-last-ember-save-v1', '{not valid json');
    const loaded = loadGame(NOW, storage);
    expect(loaded.game).toBeNull();
    expect(loaded.corrupted).toBe(true);
  });

  it('returns a clean miss when no save exists', () => {
    const loaded = loadGame(NOW, new MemoryStorage());
    expect(loaded.game).toBeNull();
    expect(loaded.corrupted).toBe(false);
  });

  it('clears the save key', () => {
    const storage = new MemoryStorage();
    saveGame(createInitialState(NOW), storage);
    expect(storage.getItem('whiteout-last-ember-save-v1')).toBeTruthy();
    clearSave(storage);
    expect(storage.getItem('whiteout-last-ember-save-v1')).toBeNull();
  });

  it('serializes an envelope that sanitizes cleanly', () => {
    const state = createInitialState(NOW, 302);
    state.day = 5;
    const text = serializeGame(state);
    expect(text).toContain('"game"');
    const sanitized = sanitizeGame(JSON.parse(text), NOW);
    expect(sanitized?.day).toBe(5);
  });

  it('sanitizes hostile or malformed values', () => {
    const source = JSON.parse(JSON.stringify(createInitialState(NOW, 303)));
    source.furnace.level = 900;
    source.furnace.heat = -800;
    source.clock = -400;
    source.resources.wood = -200;
    source.resources.iron = 5;
    source.weather.intensity = 999;
    source.weather.remaining = -2;
    source.decree = 'unknown';
    source.survivors[0].job = 'not-a-job';
    source.survivors[0].health = 999;
    source.survivors[0].hunger = -50;
    source.heroes.bryn.level = 300;
    source.expedition.maxStage = 200;
    source.expedition.selectedStage = 100;
    source.expedition.firstClears = [1, 99, -2];
    source.stats.daysSurvived = -10;
    source.tech.insulation = 'yes';
    const sanitized = sanitizeGame(source, NOW);
    expect(sanitized).not.toBeNull();
    expect(sanitized!.furnace.level).toBe(10);
    expect(sanitized!.furnace.heat).toBeGreaterThanOrEqual(0);
    expect(sanitized!.clock).toBe(0);
    expect(sanitized!.resources.wood).toBe(0);
    expect(sanitized!.resources.iron).toBe(5);
    expect(sanitized!.weather.intensity).toBeLessThanOrEqual(1.5);
    expect(sanitized!.weather.remaining).toBeGreaterThanOrEqual(1);
    expect(sanitized!.decree).toBe('balanced');
    expect(sanitized!.survivors[0].job).toBeNull();
    expect(sanitized!.survivors[0].health).toBe(100);
    expect(sanitized!.survivors[0].hunger).toBe(0);
    expect(sanitized!.heroes.bryn.level).toBe(20);
    expect(sanitized!.expedition.maxStage).toBe(10);
    expect(sanitized!.expedition.selectedStage).toBeLessThanOrEqual(10);
    expect(sanitized!.expedition.firstClears).toEqual([1]);
    expect(sanitized!.stats.daysSurvived).toBe(0);
    expect(sanitized!.tech.insulation).toBe(true);
  });

  it('rejects a completely unrelated object', () => {
    expect(sanitizeGame({ hello: 'world' }, NOW)).toBeNull();
    expect(sanitizeGame(null, NOW)).toBeNull();
  });

  it('persists sound settings', () => {
    const storage = new MemoryStorage();
    expect(loadSettings(storage).sound).toBe(true);
    saveSettings({ sound: false }, storage);
    expect(loadSettings(storage).sound).toBe(false);
  });
});
