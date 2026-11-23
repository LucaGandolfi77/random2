import { describe, expect, it } from 'vitest';
import {
  loadGame,
  saveGame,
  clearSave,
  SAVE_KEY,
  LEGACY_SAVE_KEY,
  OLDER_SAVE_KEY,
  OLD_SAVE_KEY,
  type StorageLike
} from '../src/game/save';
import {
  createInitialState,
  hospitality,
  sanitizeState,
  type GameState
} from '../src/game/state';
import { DISCOVERIES, FLOWERS, LETTERS, SPAWN, TILES, VEHICLES, WORLD } from '../src/data/town';
import { FESTIVAL_POSTCARDS } from '../src/data/festival';

class MemoryStorage implements StorageLike {
  readonly data = new Map<string, string>();
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
  state.quests.newspaper = 'done';
  state.quests.book = 'active';
  state.quests.bell = 'available';
  state.flags.dusk = true;
  state.letters = LETTERS.map((l) => l.id);
  state.flowers = FLOWERS.map((f) => f.id);
  state.tiles = TILES.slice(0, 5).map((t) => t.id);
  state.discovered = DISCOVERIES.slice(0, 3).map((d) => d.id);
  state.settings = { lang: 'en', volume: 0.25, reducedMotion: true };
  state.elapsed = 123.5;
  return state;
}

describe('save round trip', () => {
  it('writes and reads the whole v4 state, vehicles included', () => {
    const storage = new MemoryStorage();
    const state = completeState();
    state.vehicles[0] = { id: 'car-station', x: -130, z: 20, heading: 0.7 };
    expect(saveGame(state, storage)).toBe(true);
    expect(storage.getItem(SAVE_KEY)).toBeTruthy();
    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    if (!loaded) return;
    expect(loaded.v).toBe(4);
    expect(loaded.quests).toEqual(state.quests);
    expect(loaded.letters).toEqual(state.letters);
    expect(loaded.flowers).toEqual(state.flowers);
    expect(loaded.tiles).toEqual(state.tiles);
    expect(loaded.discovered).toEqual(state.discovered);
    expect(loaded.vehicles).toHaveLength(state.vehicles.length);
    loaded.vehicles.forEach((vehicle, index) => {
      expect(vehicle.id).toBe(state.vehicles[index].id);
      expect(vehicle.x).toBeCloseTo(state.vehicles[index].x);
      expect(vehicle.z).toBeCloseTo(state.vehicles[index].z);
      expect(vehicle.heading).toBeCloseTo(state.vehicles[index].heading);
    });
    expect(loaded.settings).toEqual(state.settings);
    expect(loaded.elapsed).toBeCloseTo(123.5);
    expect(loaded.flags.dusk).toBe(true);
    expect(loaded.festival.phase).toBe('locked');
    expect(loaded.postcards).toEqual([]);
  });

  it('clears both current and legacy saves', () => {
    const storage = new MemoryStorage();
    saveGame(createInitialState(), storage);
    storage.setItem(LEGACY_SAVE_KEY, '{}');
    storage.setItem(OLDER_SAVE_KEY, '{}');
    storage.setItem(OLD_SAVE_KEY, '{}');
    clearSave(storage);
    expect(storage.getItem(SAVE_KEY)).toBeNull();
    expect(storage.getItem(LEGACY_SAVE_KEY)).toBeNull();
    expect(storage.getItem(OLDER_SAVE_KEY)).toBeNull();
    expect(storage.getItem(OLD_SAVE_KEY)).toBeNull();
  });

  it('survives a broken JSON payload', () => {
    const storage = new MemoryStorage();
    storage.setItem(SAVE_KEY, '{oops');
    expect(loadGame(storage)).toBeNull();
  });
});

describe('legacy migration', () => {
  it('keeps progress but moves the walker to Piazza Duomo', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LEGACY_SAVE_KEY,
      JSON.stringify({
        v: 1,
        started: true,
        player: { x: 0, z: 13, rot: 3.14, yaw: 0, pitch: 0.37 },
        quests: {
          bread: 'done',
          letters: 'done',
          flowers: 'available',
          bell: 'locked'
        },
        letters: ['letter-west', 'letter-vicolo', 'letter-belvedere'],
        flowers: ['flower-south'],
        tiles: ['tile-church', 'tile-grove', 'tile-bakery', 'tile-garden', 'tile-belvedere'],
        flags: { dusk: false, finaleSeen: false },
        settings: { lang: 'it', volume: 0.7, reducedMotion: false },
        elapsed: 90
      })
    );
    const loaded = loadGame(storage);
    expect(loaded).not.toBeNull();
    if (!loaded) return;
    expect(loaded.v).toBe(4);
    expect(loaded.player.x).toBe(SPAWN.x);
    expect(loaded.player.z).toBe(SPAWN.z);
    expect(loaded.quests.bread).toBe('done');
    expect(loaded.quests.letters).toBe('done');
    expect(loaded.letters).toHaveLength(LETTERS.length);
    expect(loaded.flowers).toHaveLength(1);
    expect(loaded.tiles).toHaveLength(5);
    expect(loaded.tiles.every((id) => TILES.some((tile) => tile.id === id))).toBe(true);
    expect(loaded.discovered).toEqual([]);
    expect(storage.getItem(SAVE_KEY)).toBeTruthy();
  });

  it('does not import old out-of-world coordinates', () => {
    const migrated = sanitizeState({
      v: 1,
      player: { x: 0, z: 13 },
      quests: { bread: 'available' }
    });
    expect(migrated?.player.x).toBe(SPAWN.x);
    expect(migrated?.player.z).toBe(SPAWN.z);
  });

  it('turns a v2 notebook into a v4 save with default parking spots', () => {
    const storage = new MemoryStorage();
    storage.setItem(
      LEGACY_SAVE_KEY,
      JSON.stringify({
        v: 2,
        started: true,
        player: { x: -140, z: 20, rot: 1, yaw: 0, pitch: 0.3 },
        quests: { bread: 'done', letters: 'done', flowers: 'done', bell: 'available' },
        letters: LETTERS.map((l) => l.id),
        flowers: FLOWERS.map((f) => f.id),
        tiles: TILES.slice(0, 2).map((t) => t.id),
        discovered: [],
        flags: { dusk: true, finaleSeen: false },
        settings: { lang: 'it', volume: 0.7, reducedMotion: false },
        elapsed: 42
      })
    );
    const loaded = loadGame(storage);
    expect(loaded?.v).toBe(4);
    expect(loaded?.vehicles).toHaveLength(VEHICLES.length);
    expect(loaded?.vehicles[0].id).toBe(VEHICLES[0].id);
    expect(storage.getItem(SAVE_KEY)).toBeTruthy();
  });

  it('drops unknown vehicles and clamps the rest to the map', () => {
    const state = sanitizeState({
      v: 3,
      vehicles: [
        { id: 'car-station', x: 9999, z: -9999, heading: 0.4 },
        { id: 'ghost-car', x: 0, z: 0, heading: 0 },
        { id: 'bike-duomo', x: 3, z: 4, heading: 8 }
      ]
    });
    expect(state?.vehicles).toHaveLength(VEHICLES.length);
    const car = state?.vehicles.find((vehicle) => vehicle.id === 'car-station');
    const bike = state?.vehicles.find((vehicle) => vehicle.id === 'bike-duomo');
    expect(car?.x).toBeLessThanOrEqual(WORLD.maxX);
    expect(car?.z).toBeGreaterThanOrEqual(WORLD.minZ);
    expect(bike?.x).toBe(3);
    expect(bike?.z).toBe(4);
    expect(bike?.heading).toBeGreaterThanOrEqual(0);
    expect(state?.vehicles.some((vehicle) => vehicle.id === 'ghost-car')).toBe(false);
  });

  it('unlocks the feast after a v3 save with the bell rung', () => {
    const state = sanitizeState({
      v: 3,
      quests: { bread: 'done', letters: 'done', flowers: 'done', bell: 'done' },
      letters: LETTERS.map((letter) => letter.id),
      flowers: FLOWERS.map((flower) => flower.id)
    });
    expect(state?.festival.phase).toBe('ready');
  });

  it('keeps v4 feast progress and drops unknown postcards', () => {
    const state = sanitizeState({
      v: 4,
      quests: { bread: 'done', letters: 'done', flowers: 'done', bell: 'done' },
      letters: LETTERS.map((letter) => letter.id),
      flowers: FLOWERS.map((flower) => flower.id),
      festival: {
        phase: 'active',
        lanterns: ['lantern-west', 'lantern-ghost'],
        musicians: ['musician-porta'],
        branches: ['branch-parco', 'branch-parco'],
        garland: false,
        guest: true,
        guestArrived: true
      },
      postcards: [FESTIVAL_POSTCARDS[0].id, 'postcard-ghost']
    });
    expect(state?.festival.phase).toBe('active');
    expect(state?.festival.lanterns).toEqual(['lantern-west']);
    expect(state?.festival.musicians).toEqual(['musician-porta']);
    expect(state?.festival.branches).toEqual(['branch-parco']);
    expect(state?.festival.guest).toBe(true);
    expect(state?.postcards).toEqual([FESTIVAL_POSTCARDS[0].id]);
  });

  it('resumes a v4 procession as a safe active feast', () => {
    const state = sanitizeState({
      v: 4,
      quests: { bread: 'done', letters: 'done', flowers: 'done', bell: 'done' },
      letters: LETTERS.map((letter) => letter.id),
      flowers: FLOWERS.map((flower) => flower.id),
      festival: { phase: 'procession' }
    });
    expect(state?.festival.phase).toBe('active');
  });
});

describe('save sanitising', () => {
  it('rejects unknown versions and non-objects', () => {
    expect(sanitizeState(null)).toBeNull();
    expect(sanitizeState('x')).toBeNull();
    expect(sanitizeState({ v: 5 })).toBeNull();
    expect(sanitizeState({ v: '3' })).toBeNull();
  });

  it('clamps a position outside the world', () => {
    const state = sanitizeState({
      v: 2,
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
      v: 2,
      tiles: [TILES[0].id, TILES[0].id, 'tile-ghost'],
      letters: ['letter-ghost'],
      flowers: [FLOWERS[0].id, 'flower-ghost'],
      discovered: [DISCOVERIES[0].id, DISCOVERIES[0].id, 'place-ghost']
    });
    expect(state?.tiles).toEqual([TILES[0].id]);
    expect(state?.letters).toEqual([]);
    expect(state?.flowers).toEqual([FLOWERS[0].id]);
    expect(state?.discovered).toEqual([DISCOVERIES[0].id]);
  });

  it('repairs a letter quest that is objective without all the letters', () => {
    const state = sanitizeState({
      v: 2,
      quests: { letters: 'objective' },
      letters: [LETTERS[0].id]
    });
    expect(state?.quests.letters).toBe('active');
  });

  it('repairs an active letter quest that already has all the letters', () => {
    const state = sanitizeState({
      v: 2,
      quests: { letters: 'active' },
      letters: LETTERS.map((l) => l.id)
    });
    expect(state?.quests.letters).toBe('objective');
  });

  it('re-locks a bell earned without the three core errands', () => {
    const state = sanitizeState({
      v: 2,
      quests: { bread: 'available', letters: 'available', flowers: 'available', bell: 'done' },
      flags: { finaleSeen: true }
    });
    expect(state?.quests.bell).toBe('locked');
    expect(state?.flags.finaleSeen).toBe(false);
  });

  it('falls back to defaults for invalid settings', () => {
    const state = sanitizeState({
      v: 2,
      settings: { lang: 'fr', volume: 12, reducedMotion: 'yes' }
    });
    expect(state?.settings.lang).toBe('it');
    expect(state?.settings.volume).toBe(1);
    expect(state?.settings.reducedMotion).toBe(false);
  });

  it('starts from the Piazza Duomo spawn when no player is stored', () => {
    const state = sanitizeState({ v: 2 });
    expect(state?.player.x).toBe(SPAWN.x);
    expect(state?.player.z).toBe(SPAWN.z);
    expect(hospitality(state!)).toBe(0);
  });
});
