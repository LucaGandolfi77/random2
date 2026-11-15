import {
  FIRST_CALM_SECONDS,
  GAME_VERSION,
  HERO_ORDER,
  NAMES,
  WORK_START,
} from './content';
import { seedFromDate } from './rng';
import type { FacilityId, GameState, Survivor } from './types';

const STARTING_JOBS: Array<Survivor['job']> = ['lumberMill', 'huntersHut', null, null];

export function createInitialState(now = Date.now(), seed?: number): GameState {
  const buildings = {
    furnace: { built: true, level: 1 },
    lumberMill: { built: true, level: 1 },
    coalMine: { built: false, level: 1 },
    huntersHut: { built: true, level: 1 },
    cookhouse: { built: false, level: 1 },
    shelter: { built: true, level: 1 },
    clinic: { built: false, level: 1 },
    ironSeam: { built: false, level: 1 },
  } satisfies Record<FacilityId, { built: boolean; level: number }>;

  const survivors: Survivor[] = NAMES.slice(0, 4).map((name, index) => ({
    id: `survivor-${index + 1}`,
    name,
    health: 90,
    hunger: 20,
    warmth: 78,
    happiness: 64,
    sick: false,
    job: STARTING_JOBS[index] ?? null,
  }));

  const heroes = Object.fromEntries(
    HERO_ORDER.map((id) => [
      id,
      { recruited: id === 'bryn', level: 1, xp: 0 },
    ]),
  ) as GameState['heroes'];

  return {
    version: GAME_VERSION,
    createdAt: now,
    lastSeen: now,
    day: 1,
    clock: WORK_START,
    resources: {
      wood: 160,
      coal: 120,
      rawMeat: 50,
      meals: 16,
      iron: 0,
    },
    buildings,
    survivors,
    furnace: {
      level: 1,
      mode: 'normal',
      heat: 74,
      temperature: 4,
    },
    weather: {
      phase: 'calm',
      remaining: FIRST_CALM_SECONDS,
      intensity: 0.9,
      ambient: -21,
      blizzards: 0,
    },
    decree: 'balanced',
    tech: {
      insulation: false,
      efficient_burn: false,
      saw_blades: false,
      deep_shafts: false,
      trapping: false,
      field_medicine: false,
      stew_pot: false,
      expedition_gear: false,
    },
    heroes,
    expedition: {
      maxStage: 1,
      selectedStage: 1,
      firstClears: [],
      runs: 0,
    },
    stats: {
      daysSurvived: 0,
      blizzardsSurvived: 0,
      mealsEaten: 0,
      survivorsLost: 0,
      survivorsRecruited: 4,
      expeditionsWon: 0,
      expeditionsLost: 0,
      resourcesGained: 0,
      upgradesBuilt: 0,
      totalOfflineSeconds: 0,
    },
    lastMealDay: 0,
    nextArrivalDay: 3,
    tutorialDone: false,
    rng: (seed ?? seedFromDate(now)) >>> 0 || 0x9e3779b9,
  };
}

export const INITIAL_CLOCK = WORK_START;
