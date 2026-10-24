import test from 'node:test';
import assert from 'node:assert/strict';

import { createInitialState, quotaRemaining, livingVillagers } from '../js/systems/state.js';
import {
  drawYears,
  getVillager,
  settleQuota,
  settleAuto,
  restoreForgotten,
  healHero,
  grantHeroYears
} from '../js/systems/ledger.js';
import { computeEnding, getEnding } from '../js/systems/endings.js';

test('initial state opens chapter one with a six-year quota', () => {
  const state = createInitialState();
  assert.equal(state.version, 2);
  assert.equal(state.chapter, 1);
  assert.equal(state.quota.owed, 6);
  assert.equal(quotaRemaining(state), 6);
  assert.equal(livingVillagers(state).length, 13);
  assert.equal(state.hero.years, 40);
});

test('drawing from a willing villager logs the debt and can kill them', () => {
  const state = createInitialState();
  const result = drawYears(state, 'maren', 4, 'a spell');
  assert.equal(result.ok, true);
  assert.equal(result.died, true);
  assert.equal(result.forgotten, false);

  const maren = getVillager(state, 'maren');
  assert.equal(maren.alive, false);
  assert.equal(maren.years, 0);
  assert.equal(maren.drawn, 4);
  assert.equal(maren.remembered, true);
  assert.equal(state.ledger.length, 1);
  assert.equal(state.ledger[0].witnessed, true);
  assert.equal(state.stats.deaths, 1);
});

test('a secret death can erase a name from the town', () => {
  const state = createInitialState();
  const result = drawYears(state, 'ivo', 50, 'the quiet page', { secret: true });
  assert.equal(result.died, true);
  assert.equal(result.forgotten, true);

  const ivo = getVillager(state, 'ivo');
  assert.equal(ivo.remembered, false);
  assert.equal(ivo.forgotten, true);
  assert.equal(state.stats.forgotten, 1);
  assert.equal(state.flags.secretDrawn, 50);
  assert.equal(state.ledger[0].witnessed, false);
});

test('a known villager is remembered even when taken secretly', () => {
  const state = createInitialState();
  const ivo = getVillager(state, 'ivo');
  ivo.spoken = true;
  ivo.trust = 3;

  const result = drawYears(state, 'ivo', 50, 'the quiet page', { secret: true });
  assert.equal(result.forgotten, false);
  assert.equal(ivo.remembered, true);
  assert.equal(state.stats.forgotten, 0);
});

test('the protected child cannot be entered in the ledger', () => {
  const state = createInitialState();
  const result = drawYears(state, 'nel', 1, 'a spell');
  assert.equal(result.ok, false);
  assert.equal(getVillager(state, 'nel').years, 60);
  assert.equal(state.ledger.length, 0);
});

test('drawing your own years ages you and lowers your ceiling', () => {
  const state = createInitialState();
  const result = drawYears(state, 'hero', 10, 'a spell');
  assert.equal(result.ok, true);
  assert.equal(state.hero.years, 30);
  assert.equal(state.hero.maxHp, 50);
  assert.equal(state.flags.selfDrawn, 10);
  assert.equal(state.ledger[0].self, true);
});

test('spending all your years ends the character', () => {
  const state = createInitialState();
  const result = drawYears(state, 'hero', 40, 'the last spell');
  assert.equal(result.died, true);
  assert.equal(state.hero.years, 0);
  assert.equal(computeEnding(state), 'saint');
});

test('settling the quota records and advances the payment', () => {
  const state = createInitialState();
  const { total } = settleQuota(state, { maren: 4, wick: 1, mayor: 1 });
  assert.equal(total, 6);
  assert.equal(state.quota.paid, 6);
  assert.equal(quotaRemaining(state), 0);
  assert.equal(state.stats.deaths, 2);
});

test('the collector chooses the shortest lives first', () => {
  const state = createInitialState();
  const { total, allocations } = settleAuto(state);
  assert.equal(total, 6);
  assert.equal(state.quota.paid, 6);
  assert.equal(allocations.orin, 1);
  assert.equal(allocations.wick, 1);
  assert.equal(allocations.mayor, 2);
  assert.equal(allocations.maren, 2);
  assert.equal(getVillager(state, 'orin').alive, false);
  assert.equal(getVillager(state, 'wick').alive, false);
  assert.equal(getVillager(state, 'mayor').alive, false);
  assert.equal(getVillager(state, 'maren').alive, true);
});

test('reading the forgotten names restores them', () => {
  const state = createInitialState();
  drawYears(state, 'ivo', 50, 'the quiet page', { secret: true });
  assert.equal(state.stats.forgotten, 1);

  const restored = restoreForgotten(state);
  assert.equal(restored, 1);
  assert.equal(state.stats.forgotten, 0);
  assert.equal(getVillager(state, 'ivo').remembered, true);
});

test('the hero can be healed and given back years within limits', () => {
  const state = createInitialState();
  state.hero.hp = 20;
  healHero(state, 100);
  assert.equal(state.hero.hp, 60);

  grantHeroYears(state, 100);
  assert.equal(state.hero.years, 40);
  assert.equal(state.hero.maxHp, 60);
});

test('endings follow the ledger, in order of consequence', () => {
  const balances = createInitialState();
  assert.equal(computeEnding(balances), 'balances');
  assert.equal(getEnding(balances).title, 'The Ledger Balances');

  const quiet = createInitialState();
  quiet.flags.secretDrawn = 4;
  assert.equal(computeEnding(quiet), 'quiet');

  const saint = createInitialState();
  saint.flags.offeredSelf = true;
  assert.equal(computeEnding(saint), 'saint');

  const def = createInitialState();
  def.flags.defaulted = true;
  assert.equal(computeEnding(def), 'default');

  const unnamed = createInitialState();
  unnamed.stats.forgotten = 3;
  assert.equal(computeEnding(unnamed), 'unnamed');

  const both = createInitialState();
  both.flags.defaulted = true;
  both.flags.secretDrawn = 10;
  assert.equal(computeEnding(both), 'default');

  for (const id of ['renewal', 'charter', 'ferry', 'keeper', 'secondchair']) {
    const state = createInitialState();
    state.flags.finale = id;
    assert.equal(computeEnding(state), id);
    assert.equal(getEnding(state).id, id);
  }
});
