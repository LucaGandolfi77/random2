/**
 * Persistence and defensive loading. Every field read from localStorage is
 * clamped or rebuilt against the current content tables. That keeps an old or
 * edited save from producing impossible levels, jobs or combat state.
 */

import {
  DECREES,
  FACILITIES,
  FACILITY_ORDER,
  GAME_VERSION,
  HERO_ORDER,
  MAX_FACILITY_LEVEL,
  MAX_FURNACE_LEVEL,
  MAX_HERO_LEVEL,
  SAVE_KEY,
  SETTINGS_KEY,
  STAGES,
  WORKER_FACILITIES,
  emptyResources,
} from './content';
import { createInitialState } from './initialState';
import { clamp, finite, getShelterCapacity } from './engine';
import type {
  DecreeId,
  FurnaceMode,
  GameState,
  ResourceKey,
  Resources,
  Survivor,
  TechId,
  WeatherPhase,
  WorkerFacilityId,
} from './types';

export interface StorageLike {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export interface LoadResult {
  game: GameState | null;
  corrupted: boolean;
}

export interface GameSettings {
  sound: boolean;
}

const DEFAULT_SETTINGS: GameSettings = {
  sound: true,
};

function browserStorage(): StorageLike | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    return localStorage;
  } catch {
    return null;
  }
}

function num(value: unknown, fallback: number): number {
  return finite(typeof value === 'number' ? value : Number(value), fallback);
}

function safeInt(value: unknown, fallback: number): number {
  return Math.round(num(value, fallback));
}

function resourceRecord(value: unknown): Resources {
  const source = (value ?? {}) as Partial<Record<ResourceKey, unknown>>;
  const result = emptyResources();
  for (const key of Object.keys(result) as ResourceKey[]) {
    result[key] = Math.max(0, num(source[key], 0));
  }
  return result;
}

function validJob(value: unknown, state: GameState): WorkerFacilityId | null {
  if (typeof value !== 'string') return null;
  if (!WORKER_FACILITIES.includes(value as WorkerFacilityId)) return null;
  const job = value as WorkerFacilityId;
  if (!state.buildings[job].built) return null;
  return job;
}

function sanitizeSurvivor(
  raw: unknown,
  index: number,
  state: GameState,
): Survivor | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Partial<Survivor>;
  const name =
    typeof source.name === 'string' && source.name.trim()
      ? source.name.trim().slice(0, 28)
      : `Survivor ${index + 1}`;
  const id =
    typeof source.id === 'string' && source.id.trim()
      ? source.id.trim().slice(0, 64)
      : `survivor-${index + 1}`;
  return {
    id,
    name,
    health: clamp(num(source.health, 85), 0, 100),
    hunger: clamp(num(source.hunger, 25), 0, 100),
    warmth: clamp(num(source.warmth, 70), 0, 100),
    happiness: clamp(num(source.happiness, 60), 0, 100),
    sick: Boolean(source.sick),
    job: validJob(source.job, state),
  };
}

function sanitizeBuildings(raw: unknown, furnaceLevel: number): GameState['buildings'] {
  const source = (raw ?? {}) as Record<string, { built?: unknown; level?: unknown }>;
  const result = createInitialState(0, 1).buildings;
  for (const id of FACILITY_ORDER) {
    const def = FACILITIES[id];
    const entry = source[id];
    let level = clamp(
      safeInt(entry?.level, id === 'furnace' ? 1 : 1),
      1,
      def.maxLevel,
    );
    let built = Boolean(entry?.built);
    if (id === 'furnace') {
      level = clamp(level, 1, MAX_FURNACE_LEVEL);
      built = true;
    } else if (level > MAX_FACILITY_LEVEL) {
      level = MAX_FACILITY_LEVEL;
    }
    if (level > 1 && !built) built = false;
    result[id] = { built, level };
  }
  result.furnace = { built: true, level: furnaceLevel };
  return result;
}

function sanitizeHeroes(raw: unknown): GameState['heroes'] {
  const source = (raw ?? {}) as Record<string, { recruited?: unknown; level?: unknown; xp?: unknown }>;
  const result = {} as GameState['heroes'];
  for (const id of HERO_ORDER) {
    const entry = source[id] ?? {};
    const level = clamp(safeInt(entry.level, 1), 1, MAX_HERO_LEVEL);
    result[id] = {
      recruited: Boolean(entry.recruited),
      level,
      xp: Math.max(0, num(entry.xp, 0)),
    };
    if (!result[id].recruited) {
      result[id].level = 1;
      result[id].xp = 0;
    }
  }
  return result;
}

export function sanitizeGame(raw: unknown, now = Date.now()): GameState | null {
  if (!raw || typeof raw !== 'object') return null;
  const wrapped = raw as { game?: unknown };
  const source = (wrapped.game && typeof wrapped.game === 'object'
    ? wrapped.game
    : raw) as Partial<GameState> & Record<string, unknown>;
  if (!source || typeof source !== 'object') return null;
  if (!source.resources && !source.survivors && !source.buildings) return null;

  const fallback = createInitialState(now, 1);
  const furnaceLevel = clamp(
    safeInt((source.furnace as GameState['furnace'] | undefined)?.level, 1),
    1,
    MAX_FURNACE_LEVEL,
  );
  const state: GameState = {
    version: GAME_VERSION,
    createdAt: Math.max(0, num(source.createdAt, now)),
    lastSeen: Math.max(0, Math.min(now, num(source.lastSeen, now))),
    day: Math.max(1, safeInt(source.day, 1)),
    clock: clamp(num(source.clock, 8 * 60), 0, 1439),
    resources: resourceRecord(source.resources),
    buildings: sanitizeBuildings(source.buildings, furnaceLevel),
    survivors: [],
    furnace: {
      level: furnaceLevel,
      mode: (['off', 'normal', 'overdrive'] as FurnaceMode[]).includes(
        source.furnace?.mode as FurnaceMode,
      )
        ? (source.furnace?.mode as FurnaceMode)
        : 'normal',
      heat: Math.max(0, num(source.furnace?.heat, 70)),
      temperature: clamp(num(source.furnace?.temperature, 2), -82, 22),
    },
    weather: {
      phase: (['calm', 'warning', 'blizzard'] as WeatherPhase[]).includes(
        source.weather?.phase as WeatherPhase,
      )
        ? (source.weather?.phase as WeatherPhase)
        : 'calm',
      remaining: clamp(num(source.weather?.remaining, 95), 1, 360),
      intensity: clamp(num(source.weather?.intensity, 0.9), 0.5, 1.5),
      ambient: clamp(num(source.weather?.ambient, -21), -90, 20),
      blizzards: Math.max(0, safeInt(source.weather?.blizzards, 0)),
    },
    decree: (Object.keys(DECREES) as DecreeId[]).includes(source.decree as DecreeId)
      ? (source.decree as DecreeId)
      : 'balanced',
    tech: { ...fallback.tech },
    heroes: sanitizeHeroes(source.heroes),
    expedition: {
      maxStage: clamp(safeInt(source.expedition?.maxStage, 1), 1, STAGES.length),
      selectedStage: clamp(
        safeInt(source.expedition?.selectedStage, 1),
        1,
        STAGES.length,
      ),
      firstClears: Array.isArray(source.expedition?.firstClears)
        ? source.expedition.firstClears
            .map((value) => safeInt(value, 0))
            .filter((value) => value >= 1 && value <= STAGES.length)
        : [],
      runs: Math.max(0, safeInt(source.expedition?.runs, 0)),
    },
    stats: {
      daysSurvived: Math.max(0, safeInt(source.stats?.daysSurvived, 0)),
      blizzardsSurvived: Math.max(0, safeInt(source.stats?.blizzardsSurvived, 0)),
      mealsEaten: Math.max(0, safeInt(source.stats?.mealsEaten, 0)),
      survivorsLost: Math.max(0, safeInt(source.stats?.survivorsLost, 0)),
      survivorsRecruited: Math.max(
        0,
        safeInt(source.stats?.survivorsRecruited, fallback.survivors.length),
      ),
      expeditionsWon: Math.max(0, safeInt(source.stats?.expeditionsWon, 0)),
      expeditionsLost: Math.max(0, safeInt(source.stats?.expeditionsLost, 0)),
      resourcesGained: Math.max(0, num(source.stats?.resourcesGained, 0)),
      upgradesBuilt: Math.max(0, safeInt(source.stats?.upgradesBuilt, 0)),
      totalOfflineSeconds: Math.max(0, num(source.stats?.totalOfflineSeconds, 0)),
    },
    lastMealDay: clamp(safeInt(source.lastMealDay, 0), 0, Math.max(1, safeInt(source.day, 1))),
    nextArrivalDay: Math.max(1, safeInt(source.nextArrivalDay, 3)),
    tutorialDone: Boolean(source.tutorialDone),
    rng: (num(source.rng, 0x9e3779b9) >>> 0) || 0x9e3779b9,
  };

  if (source.tech && typeof source.tech === 'object') {
    for (const key of Object.keys(state.tech) as TechId[]) {
      state.tech[key] = Boolean((source.tech as Record<string, unknown>)[key]);
    }
  }

  const rawSurvivors = Array.isArray(source.survivors) ? source.survivors : [];
  const ids = new Set<string>();
  let index = 0;
  for (const entry of rawSurvivors.slice(0, 50)) {
    const survivor = sanitizeSurvivor(entry, index, state);
    index += 1;
    if (!survivor) continue;
    if (ids.has(survivor.id)) survivor.id = `${survivor.id}-${index}`;
    ids.add(survivor.id);
    state.survivors.push(survivor);
  }

  // Cap assignments to actual work posts if a save was edited or migrated.
  for (const facility of WORKER_FACILITIES) {
    const def = FACILITIES[facility];
    if (!def.workerFacility) continue;
    const assigned = state.survivors.filter((survivor) => survivor.job === facility);
    const slots = 1 + Math.ceil(state.buildings[facility].level / 2);
    for (const extra of assigned.slice(slots)) {
      extra.job = null;
    }
  }

  if (state.expedition.selectedStage > state.expedition.maxStage) {
    state.expedition.selectedStage = state.expedition.maxStage;
  }
  if (state.expedition.firstClears.length > STAGES.length) {
    state.expedition.firstClears = state.expedition.firstClears.slice(0, STAGES.length);
  }
  if (state.survivors.length > getShelterCapacity(state) + 20) {
    state.survivors = state.survivors.slice(0, getShelterCapacity(state) + 20);
  }

  return state;
}

export function serializeGame(game: GameState): string {
  return JSON.stringify({ game, savedAt: Date.now() });
}

export function saveGame(
  game: GameState,
  storage: StorageLike | null = browserStorage(),
): boolean {
  if (!storage) return false;
  try {
    game.lastSeen = Date.now();
    storage.setItem(SAVE_KEY, serializeGame(game));
    return true;
  } catch {
    return false;
  }
}

export function loadGame(
  now = Date.now(),
  storage: StorageLike | null = browserStorage(),
): LoadResult {
  if (!storage) return { game: null, corrupted: false };
  let raw: string | null;
  try {
    raw = storage.getItem(SAVE_KEY);
  } catch {
    return { game: null, corrupted: false };
  }
  if (!raw) return { game: null, corrupted: false };
  try {
    const parsed = JSON.parse(raw) as unknown;
    const sanitized = sanitizeGame(parsed, now);
    if (!sanitized) return { game: null, corrupted: true };
    return { game: sanitized, corrupted: false };
  } catch {
    return { game: null, corrupted: true };
  }
}

export function clearSave(storage: StorageLike | null = browserStorage()): void {
  try {
    storage?.removeItem(SAVE_KEY);
  } catch {
    // Ignore quota/private-mode failures.
  }
}

export function loadSettings(
  storage: StorageLike | null = browserStorage(),
): GameSettings {
  if (!storage) return { ...DEFAULT_SETTINGS };
  try {
    const raw = storage.getItem(SETTINGS_KEY);
    if (!raw) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<GameSettings>;
    return {
      sound: typeof parsed.sound === 'boolean' ? parsed.sound : DEFAULT_SETTINGS.sound,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
}

export function saveSettings(
  settings: GameSettings,
  storage: StorageLike | null = browserStorage(),
): void {
  try {
    storage?.setItem(SETTINGS_KEY, JSON.stringify(settings));
  } catch {
    // Settings are non-critical.
  }
}

