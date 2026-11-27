import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults } from '../src/state.js';
import {
  claimDaily, missionProgress, checkMissions, checkAchievements,
  discover, checkCollections, finishChallenge, checkAllMeta,
} from '../src/meta.js';
import { getMachine } from '../src/machines/index.js';

const d1 = new Date('2026-11-17T10:00:00');
const d2 = new Date('2026-11-18T10:00:00');
const d3 = new Date('2026-11-20T10:00:00');

test('daily bonus pays once per day and builds a streak', () => {
  const st = defaults();
  const first = claimDaily(st, d1);
  assert.equal(first.claimed, true);
  assert.equal(first.streak, 1);
  assert.ok(first.reward >= 200);
  assert.equal(claimDaily(st, d1).claimed, false);
  const next = claimDaily(st, d2);
  assert.equal(next.streak, 2);
  const missed = claimDaily(st, d3);
  assert.equal(missed.streak, 1);
});

test('daily calendar grants free spins on streak days', () => {
  const st = defaults();
  st.daily.streak = 2;
  st.daily.last = '2026-11-19';
  const r = claimDaily(st, d3);
  assert.equal(r.free, 2); // day 3 calendar reward
  assert.equal(st.freeSpins, 2);
});

test('mission progress caps and missions pay once', () => {
  const st = defaults();
  st.stats.spins = 30;
  assert.equal(missionProgress(st, { goal: 25, stat: 'spins' }), 25);
  const before = st.credits;
  const got = checkMissions(st);
  assert.ok(got.some((m) => m.id === 'spins25'));
  assert.ok(st.credits > before);
  assert.equal(checkMissions(st).length, 0);
});

test('achievements unlock and do not repeat', () => {
  const st = defaults();
  st.stats.wins = 1; st.stats.biggestWin = 12000; st.stats.challenges = 1;
  st.gambleStreak = 5; st.xp = 800; st.collections = ['fruits'];
  const got = checkAchievements(st).map((a) => a.id);
  ['firstWin', 'bigWin', 'megaWin', 'collector', 'vip3', 'gamble5', 'challenge'].forEach((id) =>
    assert.ok(got.includes(id), id));
  assert.equal(checkAchievements(st).length, 0);
});

test('symbol discovery and collection completion', () => {
  const st = defaults();
  const lucky = getMachine('lucky-seven');
  discover(st, [['cherry', 'lemon', 'orange', 'grape']], lucky);
  const done = checkCollections(st);
  assert.ok(done.some((c) => c.id === 'fruits'));
  assert.ok(st.credits > 1000);
});

test('daily challenge ranks and pays once', () => {
  const st = defaults();
  const r = finishChallenge(st, 2000, new Date('2026-11-17T10:00:00'));
  assert.equal(r.already, false);
  assert.ok(r.rank >= 1);
  assert.ok(r.reward > 0);
  assert.equal(st.stats.challenges, 1);
  const again = finishChallenge(st, 5000, new Date('2026-11-17T10:00:00'));
  assert.equal(again.already, true);
});

test('checkAllMeta returns all groups', () => {
  const r = checkAllMeta(defaults());
  assert.ok(Array.isArray(r.missions));
  assert.ok(Array.isArray(r.achievements));
  assert.ok(Array.isArray(r.collections));
});
