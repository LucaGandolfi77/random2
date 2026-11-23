import { describe, expect, it } from 'vitest';
import { loadGame, saveGame, clearSave, type StorageLike } from '../src/game/save';
import {
  createInitialState,
  hospitality,
  sanitizeState,
  type GameState
} from '../src/game/state';
import { FLOWERS, LETTERS, SPAWN, TILES, WORLD } from '../src/data/town';

class MemoryStorage implements StorageLike {
  private data = new Map<string, string>();
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

function completeState(): GameState {
  const state = createInitialState();
  state.started = true;
  state.quests.bread = 'done';
  state.quests.letters = 'done';
  state.quests.flowers = 'done';
  state.quests.bell = 'active';
  state.flags.dusk = true;
  state.flags.finaleSeen = false;
  state.letters = LETTERS.map((l) => l.id);
  state.flowers = FLOWERS.map((f) => f.id);
  state.tiles = [TILES[0].id, TILES[1].id];
  state.settings = { lang: 'en', volume: 0.25, reducedMotion: true };
  state.elapsed = 123.5;
  return state;
}

describe('save round trip', () => {
  it('writes and reads the whole state', () => {
    const storage = new MemoryStorage();
    const state = completeState();
    expect(saveGame(state, storage)).toBe(true);
    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    if (!loaded) return;
    expect(loaded.started).toBe(true);
    expect(loaded.quests).toEqual(state.quests);
    expect(loaded.letters).toEqual(state.letters);
    expect(loaded.flowers).toEqual(state.flowers);
    expect(loaded.tiles).toEqual(state.tiles);
    expect(loaded.settings).toEqual(state.settings);
    expect(loaded.elapsed).toBeCloseTo(123.5);
    expect(loaded.flags.dusk).toBe(true);
  });

  it('clears a save', () => {
    const storage = new MemoryStorage();
    saveGame(createInitialState(), storage);
    clearSave(storage);
    expect(loadGame(storage)).toBeNull();
  });

  it('survives a broken JSON payload', () => {
    const storage = new MemoryStorage();
    storage.setItem('borgo.save.v1', '{oops');
    expect(loadGame(storage)).toBeNull();
  });
});

describe('save sanitising', () => {
  it('rejects unknown versions and non-objects', () => {
    expect(sanitizeState(null)).toBeNull();
    expect(sanitizeState('x')).toBeNull();
    expect(sanitizeState({ v: 2 })).toBeNull();
  });

  it('clamps a position outside the world', () => {
    const state = sanitizeState({
      v: 1,
      player: { x: 900, z: -900, rot: NaN, yaw: Infinity, pitch: 9 }
    });
    expect(state).not.toBeNull();
    if (!state) return;
    expect(state.player.x).toBeLessThanOrEqual(WORLD.maxX);
    expect(state.player.x).toBeGreaterThanOrEqual(WORLD.minX);
    expect(state.player.z).toBeLessThanOrEqual(WORLD.maxZ);
    expect(state.player.z).toBeGreaterThanOrEqual(WORLD.minZ);
    expect(state.player.rot).toBeGreaterThanOrEqual(0);
    expect(state.player.pitch).toBeLessThanOrEqual(1.15);
  });

  it('drops unknown and duplicate collectibles', () => {
    const state = sanitizeState({
      v: 1,
      tiles: [TILES[0].id, TILES[0].id, 'tile-ghost'],
      letters: ['letter-ghost'],
      flowers: [FLOWERS[0].id, 'flower-ghost']
    });
    expect(state?.tiles).toEqual([TILES[0].id]);
    expect(state?.letters).toEqual([]);
    expect(state?.flowers).toEqual([FLOWERS[0].id]);
  });

  it('repairs a letter quest that is objective without all the letters', () => {
    const state = sanitizeState({
      v: 1,
      quests: { bread: 'available', letters: 'objective', flowers: 'available', bell: 'locked' },
      letters: [LETTERS[0].id]
    });
    expect(state?.quests.letters).toBe('active');
  });

  it('repairs an active letter quest that already has all the letters', () => {
    const state = sanitizeState({
      v: 1,
      quests: { letters: 'active' },
      letters: LETTERS.map((l) => l.id)
    });
    expect(state?.quests.letters).toBe('objective');
  });

  it('re-locks a bell earned without the three errands', () => {
    const state = sanitizeState({
      v: 1,
      quests: { bread: 'available', letters: 'available', flowers: 'available', bell: 'done' },
      flags: { finaleSeen: true }
    });
    expect(state?.quests.bell).toBe('locked');
    expect(state?.flags.finaleSeen).toBe(false);
  });

  it('falls back to defaults for invalid settings', () => {
    const state = sanitizeState({
      v: 1,
      settings: { lang: 'fr', volume: 12, reducedMotion: 'yes' }
    });
    expect(state?.settings.lang).toBe('it');
    expect(state?.settings.volume).toBe(1);
    expect(state?.settings.reducedMotion).toBe(false);
  });

  it('starts from the spawn point when no player is stored', () => {
    const state = sanitizeState({ v: 1 });
    expect(state?.player.x).toBe(SPAWN.x);
    expect(state?.player.z).toBe(SPAWN.z);
    expect(hospitality(state!)).toBe(0);
  });
});
