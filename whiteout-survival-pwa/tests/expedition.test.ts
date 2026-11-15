import { describe, expect, it } from 'vitest';
import { createInitialState } from '../src/game/initialState';
import {
  addHeroXp,
  awardBattle,
  heroCombatant,
  retreatBattle,
  startBattle,
  stepBattle,
} from '../src/game/expedition';
import { recruitHero } from '../src/game/actions';
import { heroXpToNext } from '../src/game/content';
import type { BattleState } from '../src/game/types';

const NOW = 1_700_000_000_000;

function runBattle(battle: BattleState, maxSteps = 1000): BattleState {
  for (let i = 0; i < maxSteps && battle.status === 'fighting'; i += 1) {
    stepBattle(battle, 0.25);
  }
  return battle;
}

describe('expedition auto-battler', () => {
  it('creates a stage-one battle with the recruited party', () => {
    const state = createInitialState(NOW, 201);
    const started = startBattle(state, 1);
    expect(started.ok).toBe(true);
    expect(started.battle?.heroes).toHaveLength(1);
    expect(started.battle?.enemies).toHaveLength(1);
    expect(started.battle?.status).toBe('fighting');
    expect(started.battle?.reward?.iron).toBeGreaterThan(0);
  });

  it('clears stage one with the starting tank and awards first-clear loot', () => {
    const state = createInitialState(NOW, 202);
    const started = startBattle(state, 1);
    if (!started.battle) throw new Error(started.message);
    runBattle(started.battle);
    expect(started.battle.status).toBe('victory');
    expect(started.battle.firstClear).toBe(true);
    const ironBefore = state.resources.iron;
    const award = awardBattle(state, started.battle);
    expect(award.awarded).toBe(true);
    expect(award.win).toBe(true);
    expect(state.resources.iron).toBeGreaterThan(ironBefore);
    expect(state.expedition.firstClears).toContain(1);
    expect(state.expedition.maxStage).toBe(2);
    expect(state.stats.expeditionsWon).toBe(1);
    expect(state.heroes.bryn.xp).toBeGreaterThan(0);
    // Awarding twice cannot duplicate loot.
    const ironAfter = state.resources.iron;
    const again = awardBattle(state, started.battle);
    expect(again.awarded).toBe(false);
    expect(state.resources.iron).toBe(ironAfter);
  });

  it('can lose a high stage with a lone starting hero', () => {
    const state = createInitialState(NOW, 203);
    state.expedition.maxStage = 10;
    state.expedition.selectedStage = 10;
    const started = startBattle(state, 10);
    if (!started.battle) throw new Error(started.message);
    runBattle(started.battle, 3000);
    expect(started.battle.status).toBe('defeat');
    const award = awardBattle(state, started.battle);
    expect(award.win).toBe(false);
    expect(state.stats.expeditionsLost).toBe(1);
  });

  it('recruits a second hero and puts both into the party', () => {
    const state = createInitialState(NOW, 204);
    state.resources.wood = 999;
    state.resources.meals = 999;
    expect(recruitHero(state, 'ada').ok).toBe(true);
    const started = startBattle(state, 1);
    expect(started.battle?.heroes).toHaveLength(2);
    expect(started.battle?.heroes.map((hero) => hero.heroClass)).toEqual(['tank', 'marksman']);
  });

  it('levels a hero when enough XP is earned', () => {
    const state = createInitialState(NOW, 205);
    const needed = heroXpToNext(1);
    const result = addHeroXp(state, 'bryn', needed);
    expect(result.leveled).toBe(true);
    expect(state.heroes.bryn.level).toBe(2);
    expect(state.heroes.bryn.xp).toBe(0);
  });

  it('hero stats scale with level and expedition gear', () => {
    const state = createInitialState(NOW, 206);
    const before = heroCombatant(state, 'bryn');
    state.heroes.bryn.level = 5;
    const after = heroCombatant(state, 'bryn');
    expect(after.maxHp).toBeGreaterThan(before.maxHp);
    expect(after.attack).toBeGreaterThan(before.attack);
    state.tech.expedition_gear = true;
    const geared = heroCombatant(state, 'bryn');
    expect(geared.maxHp).toBeGreaterThan(after.maxHp);
  });

  it('produces deterministic outcomes for the same seed and party', () => {
    const stateA = createInitialState(NOW, 207);
    const stateB = createInitialState(NOW, 207);
    const a = startBattle(stateA, 1).battle;
    const b = startBattle(stateB, 1).battle;
    if (!a || !b) throw new Error('battle did not start');
    for (let i = 0; i < 80 && a.status === 'fighting'; i += 1) stepBattle(a, 0.25);
    for (let i = 0; i < 80 && b.status === 'fighting'; i += 1) stepBattle(b, 0.25);
    expect(a.status).toBe(b.status);
    expect(a.log.map((entry) => entry.text)).toEqual(b.log.map((entry) => entry.text));
  });

  it('retreating ends the fight without awarding loot', () => {
    const state = createInitialState(NOW, 208);
    const started = startBattle(state, 1);
    if (!started.battle) throw new Error(started.message);
    stepBattle(started.battle, 0.5);
    retreatBattle(state, started.battle);
    expect(started.battle.status).toBe('defeat');
    expect(started.battle.awarded).toBe(true);
    const iron = state.resources.iron;
    awardBattle(state, started.battle);
    expect(state.resources.iron).toBe(iron);
  });
});
