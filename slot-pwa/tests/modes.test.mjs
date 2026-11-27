import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults, creditWin } from '../src/state.js';
import { getMachine } from '../src/machines/index.js';
import { QUESTS, TOURNAMENT, RUSH, weekKey } from '../src/config.js';
import * as tournament from '../src/modes/tournament.js';
import * as rush from '../src/modes/rush.js';
import * as quest from '../src/modes/quest.js';
import { EXTRA_MODES, getExtraMode } from '../src/modes/index.js';

const lucky = getMachine('lucky-seven');
const result = (over = {}) => ({
  wins: [], scatterCount: 0, bestCascade: 0, totalWin: 0,
  jackpotTriggers: [], ...over,
});

test('registry exposes all score modes', () => {
  assert.equal(EXTRA_MODES.length, 9);
  ['tournament', 'rush', 'bonus-hunt', 'boss', 'chase', 'cascade', 'roulette', 'high-roller', 'quest']
    .forEach((id) => assert.ok(getExtraMode(id), id));
  assert.equal(getExtraMode('nope'), null);
});

test('weekKey is stable and ISO-like', () => {
  const a = weekKey(new Date('2026-11-17T10:00:00'));
  const b = weekKey(new Date('2026-11-18T10:00:00'));
  assert.equal(a, b);
  assert.match(a, /^\d{4}-W\d{2}$/);
});

test('tournament: rivals are deterministic and sorted', () => {
  const s1 = tournament.start(defaults(), lucky);
  const s2 = tournament.start(defaults(), lucky);
  assert.deepEqual(s1.rivals, s2.rivals);
  assert.equal(s1.rivals.length, TOURNAMENT.rivals);
  for (let i = 1; i < s1.rivals.length; i++) {
    assert.ok(s1.rivals[i - 1].score >= s1.rivals[i].score);
  }
});

test('tournament: run ends after ten spins and pays a prize', () => {
  const st = defaults();
  const s = tournament.start(st, lucky);
  assert.equal(s.spinsLeft, TOURNAMENT.spins);
  assert.equal(tournament.canEnter(st, lucky).ok, true);
  for (let i = 0; i < TOURNAMENT.spins; i++) {
    const out = tournament.onSpin(st, s, { gross: 900 });
    if (i < TOURNAMENT.spins - 1) assert.equal(out.done, false);
    else assert.equal(out.done, true);
  }
  assert.equal(s.score, 9000);
  const panel = tournament.finish(st, s);
  assert.ok(panel.html.includes('leaderboard'));
  assert.ok(st.credits > 1000);
  assert.equal(st.stats.tournaments, 1);
  assert.equal(Object.keys(st.modes.tournament.results).length, 1);
  assert.equal(tournament.canEnter(st, lucky).ok, false);
});

test('tournament: top 3 unlocks the Champion trophy', () => {
  const st = defaults();
  const s = tournament.start(st, lucky);
  s.score = 999999;
  tournament.finish(st, s);
  assert.ok(st.trophies.includes('tourney'));
});

test('rush: multiplier climbs and the run stops at the duration', () => {
  const st = defaults();
  const s = rush.start(st);
  assert.equal(s.multiplier, 1);
  const t1 = rush.onTick(st, s, 5);
  assert.equal(s.multiplier, RUSH.multipliers[0]);
  assert.equal(t1.done, false);
  rush.onTick(st, s, 25);
  assert.equal(s.multiplier, RUSH.multipliers[2]);
  const t2 = rush.onTick(st, s, RUSH.duration + 1);
  assert.equal(t2.done, true);
});

test('rush: score applies the live multiplier and finish pays credits', () => {
  const st = defaults();
  const s = rush.start(st);
  s.multiplier = 2;
  rush.onSpin(st, s, { gross: 100 });
  assert.equal(s.score, 200);
  const panel = rush.finish(st, s);
  assert.ok(panel.title.includes('Spin Rush'));
  assert.equal(st.modes.rush.best, 200);
  assert.equal(st.stats.rushes, 1);
  assert.ok(st.credits > 1000);
});

test('rush: 5000 score unlocks the Speed Demon trophy', () => {
  const st = defaults();
  const s = rush.start(st);
  s.score = 5200;
  rush.finish(st, s);
  assert.ok(st.trophies.includes('rush'));
});

test('quest: stages unlock in order and activate', () => {
  const st = defaults();
  assert.equal(quest.activate(st, 'q2').ok, false);
  assert.equal(quest.activate(st, 'q1').ok, true);
  assert.equal(st.modes.quest.active, 'q1');
});

test('quest: win objective accumulates and completes', () => {
  const st = defaults();
  quest.activate(st, 'q1');
  for (let i = 0; i < 5; i++) {
    quest.updateProgress(st, { gross: 10, machine: lucky, result: result({ wins: [{}, {}] }) });
  }
  assert.ok(st.modes.quest.completed.includes('q1'));
  assert.equal(st.modes.quest.active, null);
  assert.ok(st.trophies.includes('q1'));
  assert.equal(st.stats.quests, 1);
});

test('quest: scatter objective uses the max in a single spin', () => {
  const st = defaults();
  st.modes.quest.completed = ['q1'];
  quest.activate(st, 'q2');
  const out = quest.updateProgress(st, {
    gross: 0, machine: lucky, result: result({ scatterCount: 3 }),
  });
  assert.ok(out && out.quest.id === 'q2');
});

test('quest: machine-specific quest ignores other machines', () => {
  const st = defaults();
  st.modes.quest.completed = ['q1', 'q2', 'q3'];
  quest.activate(st, 'q4');
  quest.updateProgress(st, {
    gross: 900, machine: getMachine('nebula'), result: result(),
  });
  assert.equal(st.modes.quest.progress.q4, 0);
});

test('questSummary reports progress and completion', () => {
  const st = defaults();
  const list = quest.questSummary(st);
  assert.equal(list.length, QUESTS.length);
  assert.equal(list[0].done, false);
  st.modes.quest.completed.push('q1');
  assert.equal(quest.questSummary(st)[0].done, true);
});
