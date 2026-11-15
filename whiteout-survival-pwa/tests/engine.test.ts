import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/game/initialState';
import {
  advanceGame,
  canAfford,
  getFurnaceCoalPerSecond,
  getShelterCapacity,
} from '../src/game/engine';
import {
  assignWorker,
  buildFacility,
  researchTech,
  setDecree,
  setSurvivorJob,
  unassignWorker,
  upgradeFacility,
  upgradeFurnace,
} from '../src/game/actions';

const NOW = 1_700_000_000_000;

describe('furnace and heat', () => {
  it('burns coal every second and raises stored heat', () => {
    const state = createInitialState(NOW, 1234);
    state.resources.coal = 100;
    state.furnace.heat = 20;
    state.furnace.mode = 'normal';
    const rate = getFurnaceCoalPerSecond(state);
    expect(rate).toBeGreaterThan(0);
    advanceGame(state, 1);
    expect(state.resources.coal).toBeCloseTo(100 - rate, 6);
    expect(state.furnace.heat).toBeGreaterThan(20);
  });

  it('overdrive burns more coal and stores more heat than a normal burn', () => {
    const normal = createInitialState(NOW, 42);
    const overdrive = createInitialState(NOW, 42);
    for (const state of [normal, overdrive]) {
      state.resources.coal = 100;
      state.furnace.heat = 20;
    }
    normal.furnace.mode = 'normal';
    overdrive.furnace.mode = 'overdrive';
    advanceGame(normal, 1);
    advanceGame(overdrive, 1);
    expect(100 - overdrive.resources.coal).toBeGreaterThan(100 - normal.resources.coal);
    expect(overdrive.furnace.heat).toBeGreaterThan(normal.furnace.heat);
  });

  it('does not consume coal while the furnace is off, and heat drains', () => {
    const state = createInitialState(NOW, 4);
    state.resources.coal = 50;
    state.furnace.heat = 60;
    state.furnace.mode = 'off';
    advanceGame(state, 1);
    expect(state.resources.coal).toBe(50);
    expect(state.furnace.heat).toBeLessThan(60);
  });

  it('a warm furnace keeps the city warmer than a cold one', () => {
    const warm = createInitialState(NOW, 9);
    const cold = createInitialState(NOW, 9);
    warm.furnace.heat = 100;
    warm.furnace.temperature = 10;
    cold.furnace.heat = 0;
    cold.furnace.temperature = -30;
    for (let i = 0; i < 30; i += 1) advanceGame(warm, 1);
    for (let i = 0; i < 30; i += 1) advanceGame(cold, 1);
    expect(warm.furnace.temperature).toBeGreaterThan(cold.furnace.temperature);
  });
});

describe('production and survival', () => {
  it('starts with four survivors and six beds', () => {
    const state = createInitialState(NOW, 2);
    expect(state.survivors).toHaveLength(4);
    expect(getShelterCapacity(state)).toBe(6);
    expect(state.resources.wood).toBeGreaterThan(0);
  });

  it('produces wood and raw meat from assigned workers', () => {
    const state = createInitialState(NOW, 3);
    const wood = state.resources.wood;
    const meat = state.resources.rawMeat;
    advanceGame(state, 5);
    expect(state.resources.wood).toBeGreaterThan(wood);
    expect(state.resources.rawMeat).toBeGreaterThan(meat);
  });

  it('converts raw meat into cooked meals in a staffed cookhouse', () => {
    const state = createInitialState(NOW, 5);
    state.furnace.level = 3;
    state.buildings.cookhouse.built = true;
    state.buildings.cookhouse.level = 1;
    state.buildings.huntersHut.built = false;
    state.survivors[1].job = null;
    state.resources.rawMeat = 20;
    state.resources.meals = 0;
    state.survivors[2].job = 'cookhouse';
    advanceGame(state, 10);
    expect(state.resources.meals).toBeGreaterThan(0);
    expect(state.resources.rawMeat).toBeLessThan(20);
  });

  it('serves meals once per day during the eat phase', () => {
    const state = createInitialState(NOW, 6);
    state.clock = 1018;
    state.lastMealDay = 0;
    state.resources.meals = 20;
    const result = advanceGame(state, 1);
    expect(state.clock).toBe(1021);
    expect(state.lastMealDay).toBe(1);
    expect(result.mealsServed).toBe(4);
    expect(state.resources.meals).toBe(16);
  });

  it('hearty meals consume two meals per survivor', () => {
    const state = createInitialState(NOW, 7);
    state.clock = 1018;
    state.lastMealDay = 0;
    state.resources.meals = 20;
    setDecree(state, 'hearty_meals');
    const result = advanceGame(state, 1);
    expect(result.mealsServed).toBe(4);
    expect(state.resources.meals).toBe(12);
  });

  it('feeds the hungriest first when there is not enough food', () => {
    const state = createInitialState(NOW, 8);
    state.clock = 1018;
    state.lastMealDay = 0;
    state.resources.meals = 2;
    state.survivors[0].hunger = 10;
    state.survivors[1].hunger = 80;
    state.survivors[2].hunger = 60;
    state.survivors[3].hunger = 40;
    const result = advanceGame(state, 1);
    expect(result.mealsServed).toBe(2);
    expect(result.mealsMissed).toBe(2);
    expect(state.survivors[1].hunger).toBeLessThan(80);
    expect(state.survivors[2].hunger).toBeLessThan(60);
  });

  it('marks a freezing survivor sick and can remove a dead one', () => {
    const state = createInitialState(NOW, 10);
    state.survivors[0].warmth = 5;
    state.survivors[0].health = 50;
    advanceGame(state, 1);
    expect(state.survivors[0].sick).toBe(true);

    const dying = createInitialState(NOW, 11);
    dying.survivors[0].health = 0.01;
    dying.survivors[0].hunger = 100;
    dying.survivors[0].warmth = 0;
    dying.furnace.mode = 'off';
    dying.furnace.temperature = -60;
    const result = advanceGame(dying, 1);
    expect(result.deaths.length).toBeGreaterThan(0);
    expect(dying.survivors.length).toBeLessThan(4);
  });

  it('lets a new survivor arrive when there is a spare bed and food', () => {
    const state = createInitialState(NOW, 12);
    state.day = 3;
    state.clock = 1438;
    state.nextArrivalDay = 3;
    state.furnace.temperature = 10;
    state.resources.meals = 20;
    const before = state.survivors.length;
    const result = advanceGame(state, 1);
    expect(state.day).toBe(4);
    expect(state.survivors.length).toBe(before + 1);
    expect(result.arrivals).toHaveLength(1);
    expect(state.nextArrivalDay).toBe(6);
  });

  it('announces the warning and then the blizzard', () => {
    const state = createInitialState(NOW, 13);
    state.weather.remaining = 1;
    const warning = advanceGame(state, 1);
    expect(state.weather.phase).toBe('warning');
    expect(warning.events.some((event) => event.toLowerCase().includes('wind'))).toBe(true);
    state.weather.remaining = 1;
    const storm = advanceGame(state, 1);
    expect(state.weather.phase).toBe('blizzard');
    expect(storm.blizzardsStarted).toBe(1);
  });

  it('survives two full days with attentive overdrive and no deaths', () => {
    const state = createInitialState(NOW, 300);
    for (let second = 0; second < 960; second += 1) {
      state.furnace.mode = state.weather.phase === 'calm' ? 'normal' : 'overdrive';
      advanceGame(state, 1);
    }
    expect(state.survivors.length).toBe(4);
    expect(state.stats.survivorsLost).toBe(0);
    expect(state.stats.mealsEaten).toBeGreaterThan(0);
    expect(state.weather.blizzards).toBeGreaterThan(0);
    expect(state.survivors.every((survivor) => survivor.health > 0)).toBe(true);
  });
});

describe('actions and progression', () => {
  it('upgrades the furnace, unlocks the coal mine and builds it', () => {
    const state = createInitialState(NOW, 20);
    state.resources.wood = 999;
    state.resources.rawMeat = 999;
    state.resources.coal = 999;
    expect(upgradeFurnace(state).ok).toBe(true);
    expect(state.furnace.level).toBe(2);
    expect(buildFacility(state, 'coalMine').ok).toBe(true);
    expect(state.buildings.coalMine.built).toBe(true);
  });

  it('assigns and unassigns workers within facility slots', () => {
    const state = createInitialState(NOW, 21);
    const before = state.survivors.filter((survivor) => !survivor.job).length;
    expect(assignWorker(state, 'lumberMill').ok).toBe(true);
    expect(state.survivors.filter((survivor) => !survivor.job).length).toBe(before - 1);
    expect(unassignWorker(state, 'lumberMill').ok).toBe(true);
    expect(state.survivors.filter((survivor) => !survivor.job).length).toBe(before);
  });

  it('moves a survivor between jobs and respects the worker cap', () => {
    const state = createInitialState(NOW, 22);
    const idle = state.survivors.find((survivor) => !survivor.job);
    expect(idle).toBeTruthy();
    expect(setSurvivorJob(state, idle!.id, 'huntersHut').ok).toBe(true);
    expect(idle!.job).toBe('huntersHut');
    expect(setSurvivorJob(state, idle!.id, null).ok).toBe(true);
    expect(idle!.job).toBeNull();
  });

  it('gates research behind prerequisites and furnace levels', () => {
    const state = createInitialState(NOW, 23);
    state.resources.wood = 9999;
    state.resources.coal = 9999;
    state.resources.iron = 999;
    state.resources.meals = 999;
    state.resources.rawMeat = 999;
    expect(researchTech(state, 'efficient_burn').ok).toBe(false);
    expect(researchTech(state, 'insulation').ok).toBe(true);
    expect(researchTech(state, 'efficient_burn').ok).toBe(false);
    state.furnace.level = 2;
    expect(researchTech(state, 'efficient_burn').ok).toBe(true);
    expect(state.tech.efficient_burn).toBe(true);
  });

  it('upgrades a facility and increases its production', () => {
    const state = createInitialState(NOW, 24);
    state.resources.wood = 999;
    state.resources.coal = 999;
    state.resources.rawMeat = 999;
    const before = state.buildings.lumberMill.level;
    expect(upgradeFacility(state, 'lumberMill').ok).toBe(true);
    expect(state.buildings.lumberMill.level).toBe(before + 1);
  });

  it('rejects actions that cannot be afforded', () => {
    const state = createInitialState(NOW, 25);
    state.resources.wood = 0;
    state.resources.rawMeat = 0;
    expect(upgradeFurnace(state).ok).toBe(false);
    expect(canAfford(state.resources, { wood: 1 })).toBe(false);
    expect(buildFacility(state, 'coalMine').ok).toBe(false);
  });

  it('accepts extended shifts and changes production multiplier', () => {
    const state = createInitialState(NOW, 26);
    setDecree(state, 'extended_shifts');
    expect(state.decree).toBe('extended_shifts');
    expect(state.survivors.every((survivor) => survivor.happiness < 64)).toBe(true);
    setDecree(state, 'balanced');
    expect(state.decree).toBe('balanced');
  });
});

