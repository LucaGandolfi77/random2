import test from 'node:test';
import assert from 'node:assert/strict';

import {
  CHAPTER_QUOTAS,
  CHAPTER_NAMES,
  FINAL_CHAPTER,
  ROMAN
} from '../js/data/chapters.js';
import {
  getActiveEvents,
  eventForVillager,
  eventForLocation,
  firstActiveEvent
} from '../js/data/events.js';
import {
  getFinalChoices,
  FINAL_BOSSES
} from '../js/data/finals.js';
import { createInitialState } from '../js/systems/state.js';
import { getCharacterEpilogue } from '../js/systems/endings.js';

test('the season runs for five chapters with rising quotas', () => {
  assert.equal(FINAL_CHAPTER, 5);
  assert.deepEqual(
    Object.values(CHAPTER_QUOTAS),
    [6, 12, 16, 22, 28]
  );
  assert.equal(CHAPTER_NAMES[3], 'The Hollow Season');
  assert.equal(ROMAN[5], 'V');
});

test('chapter two activates Sable and the funeral when required', () => {
  const state = createInitialState();
  assert.equal(getActiveEvents(state).length, 0);

  state.chapter = 2;
  assert.equal(firstActiveEvent(state).id, 'sable');
  assert.equal(eventForVillager(state, 'sable').id, 'sable');

  state.flags.sableOfferSeen = true;
  state.stats.deaths = 1;
  assert.equal(eventForVillager(state, 'nessa').id, 'funeral');
});

test('chapter three gate and charter events are location based', () => {
  const state = createInitialState();
  state.chapter = 3;
  assert.equal(eventForLocation(state, 'gate').id, 'audit');
  assert.equal(eventForLocation(state, 'charter').id, 'charter');
  assert.equal(eventForVillager(state, 'perrin').id, 'perrin');
});

test('chapter four activates Orin, Joss and the nomination after payment', () => {
  const state = createInitialState();
  state.chapter = 4;
  assert.equal(eventForVillager(state, 'orin').id, 'orin');
  assert.equal(eventForVillager(state, 'joss').id, 'ferry');

  state.flags.auditDone = true;
  state.quota.paid = state.quota.owed;
  assert.equal(eventForLocation(state, 'gate').id, 'nomination');
});

test('final choices unlock through story flags', () => {
  const state = createInitialState();
  let values = getFinalChoices(state).map((choice) => choice.value);
  assert.deepEqual(values, ['pay', 'offer', 'refuse', 'fight', 'renew']);

  state.hero.years = 10;
  values = getFinalChoices(state).map((choice) => choice.value);
  assert.equal(values.includes('offer'), false);

  state.flags.charterKnown = true;
  state.flags.auditOutcome = 'confess';
  state.flags.ferryReady = true;
  state.flags.orinTestified = true;
  state.flags.secondChairOffered = true;
  values = getFinalChoices(state).map((choice) => choice.value);
  for (const value of ['charter', 'expose', 'ferry', 'secondchair']) {
    assert.ok(values.includes(value), `missing final choice ${value}`);
  }
});

test('final choices map to the correct bosses', () => {
  assert.equal(FINAL_BOSSES.fight, 'collector');
  assert.equal(FINAL_BOSSES.charter, 'contract');
  assert.equal(FINAL_BOSSES.expose, 'auditor');
});

test('new game plus raises quotas and carries one final choice', () => {
  const state = createInitialState({
    ngPlus: true,
    carriedChoice: 'charter',
    ngPlusLevel: 2
  });
  assert.equal(state.ngPlus, true);
  assert.equal(state.ngPlusLevel, 2);
  assert.equal(state.quotaBonus, 4);
  assert.equal(state.quota.owed, 10);

  const choices = getFinalChoices(state);
  const carried = choices.find((choice) => choice.value === 'charter');
  assert.ok(carried);
  assert.match(carried.label, /carried/);
  assert.equal(choices.filter((choice) => choice.value === 'charter').length, 1);
});

test('a carried offer is disabled when the hero lacks twenty years', () => {
  const state = createInitialState({ ngPlus: true, carriedChoice: 'offer' });
  state.hero.years = 10;
  const choice = getFinalChoices(state).find((item) => item.value === 'offer');
  assert.ok(choice);
  assert.equal(choice.disabled, true);
  assert.match(choice.label, /not enough years/);
});

test('chapter five opens the Auditor parley and its non-combat finale', () => {
  const state = createInitialState();
  state.chapter = 5;
  state.flags.charterDone = true;
  assert.equal(eventForLocation(state, 'charter').id, 'parley');

  state.flags.parleyOutcome = 'public';
  const choices = getFinalChoices(state).map((choice) => choice.value);
  assert.ok(choices.includes('parley'));
});

test('character epilogues respond to the fates of the new cast', () => {
  const state = createInitialState();
  const base = getCharacterEpilogue(state);
  assert.equal(base.length, 5);

  state.flags.nelStatus = 'city';
  state.flags.orinTestified = true;
  state.flags.charterBurned = true;
  state.villagers.find((v) => v.id === 'perrin').departed = true;
  const changed = getCharacterEpilogue(state).join(' ');
  assert.match(changed, /Perrin took the road/);
  assert.match(changed, /Orin's statement/);
  assert.match(changed, /shortest sermon/);
});
