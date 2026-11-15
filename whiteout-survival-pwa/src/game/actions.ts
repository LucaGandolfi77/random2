/**
 * Player intents. Each action validates the same rules the UI displays, mutates
 * the supplied state only on success, and returns a short message for the toast
 * layer. Keeping them separate from the tick engine makes both sides testable.
 */

import {
  DECREES,
  FACILITIES,
  HEROES,
  MAX_FACILITY_LEVEL,
  MAX_FURNACE_LEVEL,
  TECH_BY_ID,
} from './content';
import {
  canAfford,
  getBuildCost,
  getFacilityUpgradeCost,
  getFurnaceUpgradeCost,
  getWorkerSlots,
  isFacilityUnlocked,
  missingResources,
  payResources,
  type ActionResult,
} from './engine';
import type {
  DayPhase,
  DecreeId,
  FacilityId,
  FurnaceMode,
  GameState,
  HeroId,
  Survivor,
  TechId,
  WorkerFacilityId,
} from './types';

function resourceList(keys: string[]): string {
  return keys.join(', ');
}

export function upgradeFurnace(state: GameState): ActionResult {
  if (state.furnace.level >= MAX_FURNACE_LEVEL) {
    return { ok: false, message: 'The furnace has reached its final level.' };
  }
  const cost = getFurnaceUpgradeCost(state);
  if (!canAfford(state.resources, cost)) {
    return {
      ok: false,
      message: `Not enough resources. Missing ${resourceList(missingResources(state.resources, cost))}.`,
    };
  }
  payResources(state.resources, cost);
  state.furnace.level += 1;
  state.buildings.furnace.level = state.furnace.level;
  state.stats.upgradesBuilt += 1;
  state.furnace.heat = Math.min(
    state.furnace.heat + 25,
    100 + (state.furnace.level - 1) * 22,
  );
  return {
    ok: true,
    message: `Furnace upgraded to level ${state.furnace.level}.`,
  };
}

export function buildFacility(
  state: GameState,
  facility: Exclude<FacilityId, 'furnace'>,
): ActionResult {
  const def = FACILITIES[facility];
  if (!def.buildable) return { ok: false, message: 'This is not a buildable facility.' };
  if (state.buildings[facility].built) {
    return { ok: false, message: `${def.name} is already built.` };
  }
  if (!isFacilityUnlocked(state, facility)) {
    return { ok: false, message: `${def.name} unlocks at furnace level ${def.unlockFurnace}.` };
  }
  const cost = getBuildCost(facility);
  if (!canAfford(state.resources, cost)) {
    return { ok: false, message: `Not enough resources to build ${def.name}.` };
  }
  payResources(state.resources, cost);
  state.buildings[facility].built = true;
  state.buildings[facility].level = 1;
  state.stats.upgradesBuilt += 1;
  return { ok: true, message: `${def.name} built.` };
}

export function upgradeFacility(
  state: GameState,
  facility: Exclude<FacilityId, 'furnace'>,
): ActionResult {
  const def = FACILITIES[facility];
  const building = state.buildings[facility];
  if (!building.built) return { ok: false, message: `${def.name} must be built first.` };
  if (building.level >= MAX_FACILITY_LEVEL) {
    return { ok: false, message: `${def.name} is already fully upgraded.` };
  }
  const cost = getFacilityUpgradeCost(facility, building.level);
  if (!canAfford(state.resources, cost)) {
    return { ok: false, message: `Not enough resources for ${def.name}.` };
  }
  payResources(state.resources, cost);
  building.level += 1;
  state.stats.upgradesBuilt += 1;
  return { ok: true, message: `${def.name} upgraded to level ${building.level}.` };
}

export function setFurnaceMode(state: GameState, mode: FurnaceMode): ActionResult {
  if (state.furnace.mode === mode) return { ok: true, message: '' };
  state.furnace.mode = mode;
  if (mode === 'overdrive') {
    return {
      ok: true,
      message: 'Overdrive engaged. Coal is burning twice as fast.',
    };
  }
  if (mode === 'off') {
    return { ok: true, message: 'The furnace is damped. Heat will drain from the city.' };
  }
  return { ok: true, message: 'Furnace returned to steady burn.' };
}

export function assignWorker(
  state: GameState,
  facility: WorkerFacilityId,
): ActionResult {
  const def = FACILITIES[facility];
  if (!def.workerFacility) return { ok: false, message: 'This facility has no work posts.' };
  if (!state.buildings[facility].built) {
    return { ok: false, message: `${def.name} must be built before it can be staffed.` };
  }
  const slots = getWorkerSlots(facility, state.buildings[facility].level);
  const assigned = state.survivors.filter((survivor) => survivor.job === facility).length;
  if (assigned >= slots) return { ok: false, message: `${def.name} is fully staffed.` };
  const worker = state.survivors.find((survivor) => !survivor.job && !survivor.sick);
  if (!worker) {
    return {
      ok: false,
      message: state.survivors.some((s) => !s.job && s.sick)
        ? 'Sick survivors cannot work. Treat them first.'
        : 'Every able survivor is already assigned. Move someone from another facility.',
    };
  }
  worker.job = facility;
  return { ok: true, message: `${worker.name} assigned to ${def.name}.` };
}

export function unassignWorker(
  state: GameState,
  facility: WorkerFacilityId,
): ActionResult {
  const workers = [...state.survivors]
    .reverse()
    .filter((survivor) => survivor.job === facility);
  const worker = workers[0];
  if (!worker) return { ok: false, message: 'Nobody is assigned here.' };
  worker.job = null;
  return { ok: true, message: `${worker.name} is available for another post.` };
}

export function setSurvivorJob(
  state: GameState,
  survivorId: string,
  job: WorkerFacilityId | null,
): ActionResult {
  const survivor = state.survivors.find((entry) => entry.id === survivorId);
  if (!survivor) return { ok: false, message: 'That survivor is no longer with us.' };
  if (job === null) {
    survivor.job = null;
    return { ok: true, message: `${survivor.name} is unassigned.` };
  }
  const def = FACILITIES[job];
  if (!state.buildings[job].built) {
    return { ok: false, message: `${def.name} is not built yet.` };
  }
  if (survivor.job === job) return { ok: true, message: '' };
  const slots = getWorkerSlots(job, state.buildings[job].level);
  const assigned = state.survivors.filter(
    (entry) => entry.job === job && entry.id !== survivor.id,
  ).length;
  if (assigned >= slots) return { ok: false, message: `${def.name} has no free work posts.` };
  survivor.job = job;
  return { ok: true, message: `${survivor.name} assigned to ${def.name}.` };
}

export function setDecree(state: GameState, decree: DecreeId): ActionResult {
  if (!DECREES[decree]) return { ok: false, message: 'Unknown decree.' };
  if (state.decree === decree) return { ok: true, message: '' };
  state.decree = decree;
  if (decree === 'hearty_meals') {
    for (const survivor of state.survivors) {
      survivor.happiness = Math.min(100, survivor.happiness + 6);
      survivor.hunger = Math.max(0, survivor.hunger - 8);
    }
    return { ok: true, message: 'Hearty Meals decreed. Everyone eats their fill.' };
  }
  if (decree === 'extended_shifts') {
    for (const survivor of state.survivors) {
      survivor.happiness = Math.max(0, survivor.happiness - 8);
    }
    return { ok: true, message: 'Extended Shifts decreed. Production rises; tempers shorten.' };
  }
  return { ok: true, message: 'Balanced Rule restored.' };
}

export function researchTech(state: GameState, techId: TechId): ActionResult {
  const tech = TECH_BY_ID[techId];
  if (!tech) return { ok: false, message: 'Unknown research.' };
  if (state.tech[techId]) return { ok: false, message: `${tech.name} is already researched.` };
  if (state.furnace.level < tech.furnaceLevel) {
    return { ok: false, message: `${tech.name} requires furnace level ${tech.furnaceLevel}.` };
  }
  for (const prerequisite of tech.requires) {
    if (!state.tech[prerequisite]) {
      return { ok: false, message: `Research ${TECH_BY_ID[prerequisite].name} first.` };
    }
  }
  if (!canAfford(state.resources, tech.cost)) {
    return { ok: false, message: `Not enough resources for ${tech.name}.` };
  }
  payResources(state.resources, tech.cost);
  state.tech[techId] = true;
  return { ok: true, message: `${tech.name} researched.` };
}

export function recruitHero(state: GameState, heroId: HeroId): ActionResult {
  const hero = HEROES[heroId];
  if (!hero) return { ok: false, message: 'Unknown hero.' };
  if (state.heroes[heroId].recruited) {
    return { ok: false, message: `${hero.name} is already with the expedition.` };
  }
  if (!canAfford(state.resources, hero.recruitCost)) {
    return { ok: false, message: `Not enough supplies to recruit ${hero.name}.` };
  }
  payResources(state.resources, hero.recruitCost);
  state.heroes[heroId].recruited = true;
  state.heroes[heroId].level = 1;
  state.heroes[heroId].xp = 0;
  return { ok: true, message: `${hero.name} joined the expedition.` };
}

export function setSelectedStage(state: GameState, stage: number): ActionResult {
  const clamped = Math.max(1, Math.min(state.expedition.maxStage, Math.round(stage)));
  state.expedition.selectedStage = clamped;
  return { ok: true, message: '' };
}

export function getSurvivorJobLabel(survivor: Survivor): string {
  if (!survivor.job) return 'Unassigned';
  return FACILITIES[survivor.job].shortName;
}

export function phaseName(phase: DayPhase): string {
  if (phase === 'work') return 'WORK';
  if (phase === 'eat') return 'EAT';
  return 'SLEEP';
}

export function mealTargetLabel(state: GameState): string {
  return `${DECREES[state.decree].mealMultiplier} meal${DECREES[state.decree].mealMultiplier === 1 ? '' : 's'} / survivor`;
}

