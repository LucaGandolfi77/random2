/**
 * The settlement simulation. Everything in this file is pure TypeScript with no
 * DOM or React dependency: one call to advanceGame() advances one second. The
 * store runs it online, while simulateOffline() replays it in the same order for
 * missed time. Weather, heat, production and survival all live here so their
 * interactions can be tested without a browser.
 */

import {
  BLIZZARD_MAX_SECONDS,
  BLIZZARD_MIN_SECONDS,
  CALM_MAX_SECONDS,
  CALM_MIN_SECONDS,
  DAY_MINUTES,
  DAY_REAL_SECONDS,
  DECREES,
  EAT_START,
  FACILITIES,
  FACILITY_ORDER,
  FURNACE_LEVELS,
  FURNACE_UNLOCKS,
  HEARTY_HUNGER_RELIEF,
  INSULATION_HEAT_SAVE,
  INSULATION_TEMP_BONUS,
  MAX_FACILITY_LEVEL,
  MAX_FURNACE_LEVEL,
  MEAL_HUNGER_RELIEF,
  MEAL_RAW_COST,
  MINUTES_PER_TICK,
  NAMES,
  OVERDRIVE_COAL_MULTIPLIER,
  OVERDRIVE_HEAT_MULTIPLIER,
  OVERDRIVE_TEMP_MULTIPLIER,
  SLEEP_START,
  WARNING_SECONDS,
  WORK_START,
  emptyResources,
} from './content';
import { nextRandom, randomInt } from './rng';
import type {
  DayPhase,
  FacilityId,
  GameState,
  OfflineReport,
  ProductionRates,
  ResourceKey,
  Resources,
  Survivor,
  TickResult,
  WorkerFacilityId,
} from './types';

export interface TickOptions {
  offline?: boolean;
  ledger?: {
    gained: Resources;
    consumed: Resources;
  };
}

export interface ActionResult {
  ok: boolean;
  message: string;
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function finite(value: unknown, fallback = 0): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

export function getDayPhase(clock: number): DayPhase {
  const minute = ((clock % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  if (minute >= WORK_START && minute < EAT_START) return 'work';
  if (minute >= EAT_START && minute < SLEEP_START) return 'eat';
  return 'sleep';
}

export function isNight(clock: number): boolean {
  const minute = ((clock % DAY_MINUTES) + DAY_MINUTES) % DAY_MINUTES;
  return minute >= SLEEP_START || minute < WORK_START;
}

export function getPhaseLabel(phase: DayPhase): string {
  if (phase === 'work') return 'Work shift';
  if (phase === 'eat') return 'Meal call';
  return 'Night rest';
}

export function getShelterCapacity(state: GameState): number {
  const shelter = state.buildings.shelter;
  if (!shelter.built) return 0;
  return 4 + shelter.level * 2;
}

export function getFurnaceCapacity(state: GameState): number {
  return FURNACE_LEVELS[clamp(state.furnace.level, 1, MAX_FURNACE_LEVEL)].heatCapacity;
}

export function getFurnaceCoalPerSecond(state: GameState): number {
  if (state.furnace.mode === 'off') return 0;
  const def = FURNACE_LEVELS[clamp(state.furnace.level, 1, MAX_FURNACE_LEVEL)];
  const tech = state.tech.efficient_burn ? 0.8 : 1;
  const modeMult = state.furnace.mode === 'overdrive' ? OVERDRIVE_COAL_MULTIPLIER : 1;
  return def.coalPerSecond * tech * modeMult;
}

export function getFurnaceUpgradeCost(state: GameState): Resources {
  if (state.furnace.level >= MAX_FURNACE_LEVEL) return emptyResources();
  return { ...FURNACE_LEVELS[state.furnace.level].cost };
}

export function getFacilityUpgradeCost(
  facility: Exclude<FacilityId, 'furnace'>,
  level: number,
): Resources {
  const def = FACILITIES[facility];
  const growth = Math.pow(def.upgradeGrowth, Math.max(0, level - 1));
  const result = emptyResources();
  for (const key of Object.keys(def.upgradeBase) as ResourceKey[]) {
    const base = def.upgradeBase[key] ?? 0;
    const raw = base * growth;
    result[key] = key === 'iron' ? Math.ceil(raw) : Math.max(1, Math.round(raw / 5) * 5);
  }
  return result;
}

export function getBuildCost(facility: Exclude<FacilityId, 'furnace'>): Resources {
  return { ...emptyResources(), ...(FACILITIES[facility].buildCost ?? {}) };
}

export function isFacilityUnlocked(state: GameState, facility: FacilityId): boolean {
  if (facility === 'furnace') return true;
  return state.furnace.level >= FACILITIES[facility].unlockFurnace;
}

export function getFurnaceUnlocks(level: number): FacilityId[] {
  const unlocked = new Set<FacilityId>();
  for (let l = 1; l <= level; l++) {
    for (const id of FURNACE_UNLOCKS[l] ?? []) unlocked.add(id);
  }
  return FACILITY_ORDER.filter((id) => unlocked.has(id));
}

export function getNextFurnaceUnlock(level: number): FacilityId | null {
  for (let l = level + 1; l <= MAX_FURNACE_LEVEL; l++) {
    const list = FURNACE_UNLOCKS[l];
    if (list?.length) return list[0];
  }
  return null;
}

export function getWorkerSlots(facility: FacilityId, level: number): number {
  const def = FACILITIES[facility];
  if (!def.workerFacility) return 0;
  return 1 + Math.ceil(clamp(level, 1, def.maxLevel) / 2);
}

export function getAssignedWorkers(state: GameState, facility: WorkerFacilityId): Survivor[] {
  return state.survivors.filter((survivor) => survivor.job === facility);
}

export function getHealthyAssignedCount(state: GameState, facility: WorkerFacilityId): number {
  return getAssignedWorkers(state, facility).filter((survivor) => !survivor.sick).length;
}

export function canAfford(resources: Resources, cost: Partial<Resources>, times = 1): boolean {
  return (Object.keys(cost) as ResourceKey[]).every(
    (key) => resources[key] + 1e-9 >= (cost[key] ?? 0) * times,
  );
}

export function payResources(resources: Resources, cost: Partial<Resources>): void {
  for (const key of Object.keys(cost) as ResourceKey[]) {
    resources[key] = Math.max(0, resources[key] - (cost[key] ?? 0));
  }
}

export function grantResources(resources: Resources, reward: Partial<Resources>): void {
  for (const key of Object.keys(reward) as ResourceKey[]) {
    resources[key] += reward[key] ?? 0;
  }
}

export function missingResources(resources: Resources, cost: Partial<Resources>): ResourceKey[] {
  return (Object.keys(cost) as ResourceKey[]).filter(
    (key) => resources[key] + 1e-9 < (cost[key] ?? 0),
  );
}

export function workerEfficiency(_state: GameState, survivor: Survivor): number {
  if (survivor.sick) return 0;
  const health = clamp(survivor.health / 100, 0, 1);
  const fed = clamp(1 - survivor.hunger / 100, 0, 1);
  const warmth = clamp(survivor.warmth / 100, 0, 1);
  const happiness = clamp(survivor.happiness / 100, 0, 1);
  const weighted = 0.4 * health + 0.2 * fed + 0.25 * warmth + 0.15 * happiness;
  return clamp(0.2 + 0.8 * weighted, 0.12, 1.08);
}

function facilityLevelMultiplier(level: number): number {
  return 1 + Math.max(0, level - 1) * 0.32;
}

function productionPhaseFactor(state: GameState): number {
  const phase = getDayPhase(state.clock);
  if (phase === 'work') return 1;
  if (phase === 'eat') return 0.55;
  return 0;
}

function outdoorWeatherFactor(state: GameState): number {
  if (state.weather.phase === 'blizzard') return 0.55;
  if (state.weather.phase === 'warning') return 0.82;
  return 1;
}

function outdoorTemperatureFactor(state: GameState): number {
  return clamp((state.furnace.temperature + 28) / 38, 0.35, 1);
}

function productionTechFactor(state: GameState, facility: WorkerFacilityId): number {
  if (facility === 'lumberMill' && state.tech.saw_blades) return 1.25;
  if (facility === 'coalMine' && state.tech.deep_shafts) return 1.25;
  if (facility === 'huntersHut' && state.tech.trapping) return 1.25;
  if (facility === 'cookhouse' && state.tech.stew_pot) return 1.3;
  return 1;
}

function facilityPower(state: GameState, facility: WorkerFacilityId): number {
  const def = FACILITIES[facility];
  if (!def.workerFacility) return 0;
  return getAssignedWorkers(state, facility).reduce(
    (sum, survivor) => sum + workerEfficiency(state, survivor),
    0,
  );
}

export function facilityRate(
  state: GameState,
  facility: WorkerFacilityId,
  offlineFactor = 1,
): { amount: number; rawCost: number } {
  const def = FACILITIES[facility];
  const building = state.buildings[facility];
  if (!building.built || !def.baseRatePerWorker) return { amount: 0, rawCost: 0 };
  const power = facilityPower(state, facility);
  const schedule = productionPhaseFactor(state);
  if (schedule <= 0 || power <= 0) return { amount: 0, rawCost: 0 };
  const weather = def.indoor ? 1 : outdoorWeatherFactor(state) * outdoorTemperatureFactor(state);
  const decree = DECREES[state.decree].production;
  const tech = productionTechFactor(state, facility);
  const rate =
    def.baseRatePerWorker *
    power *
    facilityLevelMultiplier(building.level) *
    schedule *
    weather *
    decree *
    tech *
    offlineFactor;
  if (facility === 'cookhouse') {
    return { amount: rate, rawCost: rate * MEAL_RAW_COST };
  }
  return { amount: rate, rawCost: 0 };
}

export function clinicHealingRate(state: GameState): number {
  const clinic = state.buildings.clinic;
  if (!clinic.built) return 0;
  const power = facilityPower(state, 'clinic');
  if (power <= 0) return 0;
  return (
    power *
    (0.024 + clinic.level * 0.003) *
    (state.tech.field_medicine ? 1.5 : 1) *
    (getDayPhase(state.clock) === 'sleep' ? 0.6 : 1)
  );
}

export function getProductionRates(state: GameState): ProductionRates {
  const rates = emptyResources();
  let rawMeatConsumed = 0;
  for (const facility of [
    'lumberMill',
    'coalMine',
    'huntersHut',
    'cookhouse',
    'ironSeam',
  ] as WorkerFacilityId[]) {
    const def = FACILITIES[facility];
    if (!def.productionResource) continue;
    const { amount, rawCost } = facilityRate(state, facility);
    rates[def.productionResource] += amount;
    if (facility === 'cookhouse') rawMeatConsumed += rawCost;
  }
  return {
    rates,
    rawMeatConsumed,
    activeWorkers: state.survivors.filter((s) => s.job && !s.sick).length,
    idleWorkers: state.survivors.filter((s) => !s.job && !s.sick).length,
    sickWorkers: state.survivors.filter((s) => s.sick).length,
    healing: clinicHealingRate(state),
  };
}

export function getSecondsUntilBlizzard(state: GameState): number {
  if (state.weather.phase === 'warning') return Math.max(0, state.weather.remaining);
  if (state.weather.phase === 'blizzard') return 0;
  return Math.max(0, state.weather.remaining + WARNING_SECONDS);
}

export function getMealRequirement(state: GameState): number {
  return DECREES[state.decree].mealMultiplier;
}

export function getFurnaceHeatRatio(state: GameState): number {
  return clamp(state.furnace.heat / Math.max(1, getFurnaceCapacity(state)), 0, 1);
}

export function getNextFurnaceCoalCost(state: GameState): number {
  return getFurnaceCoalPerSecond(state);
}

export function createTickResult(): TickResult {
  return {
    events: [],
    deaths: [],
    arrivals: [],
    mealsServed: 0,
    mealsMissed: 0,
    blizzardsStarted: 0,
    survivorsSickened: 0,
  };
}

function addGain(
  options: TickOptions | undefined,
  key: ResourceKey,
  amount: number,
): void {
  if (!options?.ledger) return;
  options.ledger.gained[key] += amount;
}

function addConsumed(
  options: TickOptions | undefined,
  key: ResourceKey,
  amount: number,
): void {
  if (!options?.ledger) return;
  options.ledger.consumed[key] += amount;
}

function advanceClock(state: GameState): { rolledDay: boolean; phase: DayPhase } {
  let rolledDay = false;
  state.clock += MINUTES_PER_TICK;
  while (state.clock >= DAY_MINUTES) {
    state.clock -= DAY_MINUTES;
    state.day += 1;
    state.stats.daysSurvived += 1;
    rolledDay = true;
  }
  return { rolledDay, phase: getDayPhase(state.clock) };
}

function updateWeather(state: GameState, result: TickResult): void {
  const weather = state.weather;
  weather.remaining -= 1;
  if (weather.remaining <= 0) {
    if (weather.phase === 'calm') {
      weather.phase = 'warning';
      weather.remaining = WARNING_SECONDS;
      weather.intensity = 0.85 + nextRandom(state) * 0.4;
      result.events.push('The wind has changed. A blizzard is closing in.');
    } else if (weather.phase === 'warning') {
      weather.phase = 'blizzard';
      weather.remaining = randomInt(state, BLIZZARD_MIN_SECONDS, BLIZZARD_MAX_SECONDS);
      weather.blizzards += 1;
      result.blizzardsStarted += 1;
      result.events.push('The whiteout has hit. Keep the furnace alive.');
    } else {
      weather.phase = 'calm';
      weather.remaining = randomInt(state, CALM_MIN_SECONDS, CALM_MAX_SECONDS);
      state.stats.blizzardsSurvived += 1;
      result.events.push('The blizzard has passed. Count the living.');
    }
  }

  const nightDrop = isNight(state.clock) ? 3.5 : 0;
  let target = -19 - ((state.day * 7) % 5) - nightDrop;
  if (weather.phase === 'warning') {
    target = -34 - nightDrop;
  } else if (weather.phase === 'blizzard') {
    target = -57 - weather.intensity * 10 - nightDrop * 0.5;
  }
  weather.ambient += (target - weather.ambient) * 0.12;
}

function updateFurnace(state: GameState, options?: TickOptions): void {
  const def = FURNACE_LEVELS[clamp(state.furnace.level, 1, MAX_FURNACE_LEVEL)];
  const mode = state.furnace.mode;
  const coalCost = getFurnaceCoalPerSecond(state);
  let burned = false;

  if (mode !== 'off' && state.resources.coal + 1e-9 >= coalCost) {
    state.resources.coal = Math.max(0, state.resources.coal - coalCost);
    addConsumed(options, 'coal', coalCost);
    burned = true;
  }

  let heat = state.furnace.heat;
  if (burned) {
    const burnMultiplier = mode === 'overdrive' ? OVERDRIVE_HEAT_MULTIPLIER : 1;
    heat += def.heatRise * burnMultiplier;
  }

  const ambientCold = Math.max(0, -state.weather.ambient - 18);
  const phaseLoss =
    state.weather.phase === 'blizzard' ? 0.9 : state.weather.phase === 'warning' ? 0.2 : 0;
  const insulation = state.tech.insulation ? 1 - INSULATION_HEAT_SAVE : 1;
  heat -= (0.22 + ambientCold * 0.045 + phaseLoss) * insulation;

  state.furnace.heat = clamp(heat, 0, def.heatCapacity);

  const heatRatio = getFurnaceHeatRatio(state);
  const overdriveHeat =
    mode === 'overdrive' && burned ? OVERDRIVE_TEMP_MULTIPLIER : 1;
  const target =
    state.weather.ambient +
    heatRatio * (36 + state.furnace.level * 2.6) * overdriveHeat +
    (state.tech.insulation ? INSULATION_TEMP_BONUS : 0);
  const capped = clamp(target, -82, 22);
  state.furnace.temperature += (capped - state.furnace.temperature) * 0.12;
}

function applyProduction(
  state: GameState,
  options: TickOptions | undefined,
): void {
  const offlineFactor = options?.offline ? 0.65 : 1;
  const phase = getDayPhase(state.clock);
  if (phase === 'sleep') return;

  for (const facility of [
    'lumberMill',
    'coalMine',
    'huntersHut',
    'ironSeam',
  ] as WorkerFacilityId[]) {
    const def = FACILITIES[facility];
    if (!def.productionResource || !state.buildings[facility].built) continue;
    const { amount } = facilityRate(state, facility, offlineFactor);
    if (amount > 0) {
      state.resources[def.productionResource] += amount;
      addGain(options, def.productionResource, amount);
      state.stats.resourcesGained += amount;
    }
  }

  if (state.buildings.cookhouse.built) {
    const { amount: potential } = facilityRate(state, 'cookhouse', offlineFactor);
    if (potential > 0) {
      const affordableMeals = Math.min(potential, state.resources.rawMeat / MEAL_RAW_COST);
      const meatUsed = affordableMeals * MEAL_RAW_COST;
      if (affordableMeals > 0) {
        state.resources.rawMeat = Math.max(0, state.resources.rawMeat - meatUsed);
        state.resources.meals += affordableMeals;
        addConsumed(options, 'rawMeat', meatUsed);
        addGain(options, 'meals', affordableMeals);
        state.stats.resourcesGained += affordableMeals;
      }
    }
  }

}

function serveDailyMeals(state: GameState, result: TickResult, options?: TickOptions): void {
  if (state.lastMealDay === state.day) return;
  state.lastMealDay = state.day;
  const perSurvivor = getMealRequirement(state);
  const order = [...state.survivors].sort((a, b) => b.hunger - a.hunger);
  let served = 0;
  let missed = 0;
  for (const survivor of order) {
    if (state.resources.meals + 1e-9 >= perSurvivor) {
      state.resources.meals -= perSurvivor;
      addConsumed(options, 'meals', perSurvivor);
      survivor.hunger = Math.max(
        0,
        survivor.hunger - (perSurvivor > 1 ? HEARTY_HUNGER_RELIEF : MEAL_HUNGER_RELIEF),
      );
      survivor.happiness = clamp(survivor.happiness + 4, 0, 100);
      served += 1;
      state.stats.mealsEaten += perSurvivor;
    } else {
      survivor.hunger = Math.min(100, survivor.hunger + 7);
      survivor.happiness = clamp(survivor.happiness - 7, 0, 100);
      missed += 1;
    }
  }
  result.mealsServed += served;
  result.mealsMissed += missed;
  if (missed > 0) {
    result.events.push(
      `${missed} survivor${missed === 1 ? '' : 's'} went hungry at the meal call.`,
    );
  } else if (served > 0) {
    result.events.push(`Meal call: ${served} survivors fed.`);
  }
}

function tickSurvivors(
  state: GameState,
  result: TickResult,
  options: TickOptions | undefined,
): void {
  const phase = getDayPhase(state.clock);
  const capacity = getShelterCapacity(state);
  const clinicHeal = clinicHealingRate(state);
  const workers: Survivor[] = [];

  for (let index = 0; index < state.survivors.length; index++) {
    const survivor = state.survivors[index];
    const jobDef = survivor.job ? FACILITIES[survivor.job] : null;
    const working = Boolean(jobDef) && phase !== 'sleep' && !survivor.sick;
    const outdoors = working && jobDef ? !jobDef.indoor : false;
    const sheltered = phase === 'sleep' && index < capacity;
    const hungryDrainBase = survivor.sick
      ? 0.035
      : working
        ? outdoors
          ? 0.115
          : 0.095
        : phase === 'sleep'
          ? 0.025
          : 0.055;
    survivor.hunger = clamp(
      survivor.hunger +
        hungryDrainBase * DECREES[state.decree].hungerDrain +
        (outdoors && state.weather.phase === 'blizzard' ? 0.02 : 0),
      0,
      100,
    );

    let exposure = state.furnace.temperature;
    if (outdoors) {
      exposure -= state.weather.phase === 'blizzard' ? 8 : 3;
    }
    if (survivor.sick) exposure += 6;
    const shelterWarmth = sheltered ? 14 + state.buildings.shelter.level : 0;
    const targetWarmth = clamp(58 + exposure * 2 + shelterWarmth, 0, 100);
    const changeRate = targetWarmth < survivor.warmth ? (outdoors ? 0.45 : 0.3) : sheltered ? 0.5 : 0.25;
    survivor.warmth = clamp(
      survivor.warmth + clamp(targetWarmth - survivor.warmth, -changeRate, changeRate),
      0,
      100,
    );

    let healthDelta = 0;
    if (survivor.hunger > 70) {
      healthDelta -= ((survivor.hunger - 70) / 30) * 0.04;
    }
    if (survivor.warmth < 20) {
      healthDelta -= ((20 - survivor.warmth) / 20) * 0.05;
    }
    if (outdoors && state.weather.phase === 'blizzard' && state.furnace.temperature < -25) {
      healthDelta -= 0.02;
    }
    if (survivor.sick) {
      healthDelta += clinicHeal;
      if (survivor.hunger < 60 && survivor.warmth > 35) healthDelta += 0.008;
    } else if (
      survivor.hunger < 50 &&
      survivor.warmth > 60 &&
      phase === 'sleep'
    ) {
      healthDelta += 0.025;
    }
    survivor.health = clamp(survivor.health + healthDelta, 0, 100);

    if (!survivor.sick && (survivor.warmth < 12 || survivor.hunger > 88 || survivor.health < 30)) {
      survivor.sick = true;
      result.survivorsSickened += 1;
      result.events.push(`${survivor.name} has fallen sick.`);
    } else if (
      survivor.sick &&
      survivor.health >= 55 &&
      survivor.warmth >= 40 &&
      survivor.hunger <= 65
    ) {
      survivor.sick = false;
      result.events.push(`${survivor.name} is back on their feet.`);
    }

    const foodComfort = survivor.hunger < 40 ? 10 : survivor.hunger > 70 ? -18 : 0;
    const warmthComfort = survivor.warmth > 58 ? 8 : survivor.warmth < 25 ? -18 : 0;
    const coldCity =
      state.furnace.temperature >= 0 ? 6 : state.furnace.temperature < -20 ? -12 : 0;
    const happinessTarget = clamp(
      48 +
        foodComfort +
        warmthComfort +
        coldCity +
        DECREES[state.decree].happinessTarget +
        (survivor.sick ? -10 : 0) +
        (state.resources.meals > state.survivors.length ? 4 : 0),
      0,
      100,
    );
    survivor.happiness = clamp(
      survivor.happiness + clamp(happinessTarget - survivor.happiness, -0.03, 0.025),
      0,
      100,
    );

    if (survivor.health <= 0) {
      if (options?.offline) {
        survivor.health = 1;
      } else {
        result.deaths.push(survivor);
        result.events.push(`${survivor.name} did not wake up.`);
        continue;
      }
    }
    workers.push(survivor);
  }

  if (result.deaths.length > 0) {
    state.survivors = workers;
    state.stats.survivorsLost += result.deaths.length;
  }
}

function tryDailyArrival(state: GameState, result: TickResult): void {
  if (state.survivors.length === 0) return;
  if (state.day < state.nextArrivalDay) return;
  if (state.survivors.length >= getShelterCapacity(state)) return;
  if (state.resources.meals < state.survivors.length + 2) return;
  if (state.furnace.temperature <= -8) return;

  const sequence = state.stats.survivorsRecruited + 1;
  const name = NAMES[sequence % NAMES.length];
  const survivor: Survivor = {
    id: `arrival-${state.day}-${sequence}`,
    name,
    health: 78,
    hunger: 28,
    warmth: 70,
    happiness: 58,
    sick: false,
    job: null,
  };
  state.survivors.push(survivor);
  state.nextArrivalDay = state.day + 2;
  state.stats.survivorsRecruited += 1;
  result.arrivals.push(survivor);
  result.events.push(`${name} has found the fire and asked to stay.`);
}

function tickSecond(state: GameState, result: TickResult, options?: TickOptions): void {
  const { rolledDay, phase } = advanceClock(state);

  if (phase === 'eat') {
    serveDailyMeals(state, result, options);
  }

  updateWeather(state, result);
  updateFurnace(state, options);
  applyProduction(state, options);
  tickSurvivors(state, result, options);

  if (rolledDay) {
    tryDailyArrival(state, result);
  }
}

export function advanceGame(
  state: GameState,
  seconds = 1,
  options: TickOptions = {},
): TickResult {
  const result = createTickResult();
  const ticks = Math.max(0, Math.floor(seconds));
  for (let i = 0; i < ticks; i += 1) {
    tickSecond(state, result, options);
  }
  return result;
}


export function simulateOffline(
  state: GameState,
  now = Date.now(),
  capSeconds = 8 * 60 * 60,
): OfflineReport {
  const away = Math.max(0, (now - state.lastSeen) / 1000);
  const credited = Math.min(away, capSeconds);
  const before = {
    day: state.day,
    blizzards: state.weather.blizzards,
    survivors: state.survivors.length,
    sick: state.survivors.filter((s) => s.sick).length,
  };
  const ledger = { gained: emptyResources(), consumed: emptyResources() };
  const aggregate = createTickResult();
  const ticks = Math.floor(credited);

  for (let i = 0; i < ticks; i += 1) {
    tickSecond(state, aggregate, { offline: true, ledger });
  }

  // Offline safety: nobody freezes to death while the app is closed.
  for (const survivor of state.survivors) {
    survivor.health = Math.max(survivor.health, 1);
  }

  state.lastSeen = now;
  state.stats.totalOfflineSeconds += credited;

  const report: OfflineReport = {
    seconds: away,
    creditedSeconds: credited,
    capped: away > capSeconds,
    gained: ledger.gained,
    consumed: ledger.consumed,
    mealsServed: aggregate.mealsServed,
    mealsMissed: aggregate.mealsMissed,
    survivorsLost: aggregate.deaths.length,
    survivorsSick: Math.max(
      0,
      state.survivors.filter((s) => s.sick).length - before.sick,
    ),
    blizzards: Math.max(0, state.weather.blizzards - before.blizzards),
    days: Math.max(0, state.day - before.day),
    newSurvivors: Math.max(0, state.survivors.length - before.survivors),
  };
  return report;
}

export function describeCost(cost: Partial<Resources>): string {
  const parts: string[] = [];
  for (const key of Object.keys(cost) as ResourceKey[]) {
    const value = cost[key] ?? 0;
    if (value > 0) parts.push(`${value} ${key === 'rawMeat' ? 'raw meat' : key}`);
  }
  return parts.join(' · ');
}

export function getFacilityWorkerSummary(state: GameState, facility: WorkerFacilityId): string {
  const def = FACILITIES[facility];
  const assigned = getAssignedWorkers(state, facility).length;
  return `${assigned}/${getWorkerSlots(facility, state.buildings[facility].level)} workers${def.indoor ? ' · indoor' : ' · outdoor'}`;
}

export function getUpgradeBlocker(state: GameState, facility: FacilityId): string | null {
  if (facility === 'furnace') {
    if (state.furnace.level >= MAX_FURNACE_LEVEL) return 'The furnace is already at its final level.';
    return null;
  }
  const def = FACILITIES[facility];
  if (!isFacilityUnlocked(state, facility)) return `Requires furnace level ${def.unlockFurnace}.`;
  const building = state.buildings[facility];
  if (!building.built) {
    if (!canAfford(state.resources, getBuildCost(facility))) return 'Not enough resources to build.';
    return null;
  }
  if (building.level >= MAX_FACILITY_LEVEL) return 'This facility is fully upgraded.';
  if (!canAfford(state.resources, getFacilityUpgradeCost(facility, building.level))) {
    return 'Not enough resources.';
  }
  return null;
}

export const DAY_SECONDS = DAY_REAL_SECONDS;
export const FACILITY_IDS = FACILITY_ORDER;
