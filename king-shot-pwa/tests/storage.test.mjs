import test from 'node:test';
import assert from 'node:assert/strict';
import {
  achievementList,
  dailyBestFor,
  defaultProfile,
  loadProfile,
  recordRun,
  resetProfile,
  saveProfile,
  unlockAchievement
} from '../src/storage.js';
import { memoryStore } from './harness.js';

const runSummary = (overrides = {}) => ({
  score: 120,
  wave: 3,
  kills: 12,
  bossKills: 0,
  bullseyes: 2,
  oath: 'knight',
  daily: false,
  ...overrides
});

test('legacy saves migrate their best score and theme', () => {
  const store = memoryStore({
    'king-shot-pwa': JSON.stringify({ best: 420, plays: 6, theme: 'neon' })
  });
  const profile = loadProfile(store);
  assert.equal(profile.best, 420);
  assert.equal(profile.plays, 6);
  assert.equal(profile.theme, 'neon');
  assert.equal(profile.bestByOath.knight, 420);
  assert.equal(profile.tutorialDone, true);
});

test('bad storage falls back to a safe default', () => {
  const store = memoryStore({ 'king-shot-pwa': '{not json' });
  const profile = loadProfile(store);
  assert.deepEqual(profile.bestByOath, { squire: 0, knight: 0, warlord: 0 });
  assert.equal(profile.best, 0);
});

test('a run records best, waves, totals and per-oath scores', () => {
  const profile = defaultProfile();
  const result = recordRun(profile, runSummary({ score: 500, wave: 7, oath: 'warlord' }));
  assert.equal(result.isBest, true);
  assert.equal(profile.best, 500);
  assert.equal(profile.bestWave, 7);
  assert.equal(profile.bestByOath.warlord, 500);
  assert.equal(profile.plays, 1);
  assert.equal(profile.totalKills, 12);
  assert.ok(profile.achievements.first_stand);
});

test('summary milestones unlock their achievements on record', () => {
  const profile = defaultProfile();
  recordRun(profile, {
    score: 800,
    wave: 10,
    kills: 40,
    bossKills: 2,
    bestCombo: 8,
    flawlessWaves: 3,
    bullseyes: 1,
    oath: 'knight'
  });
  assert.ok(profile.achievements.wave5);
  assert.ok(profile.achievements.wave10);
  assert.ok(profile.achievements.boss1);
  assert.ok(profile.achievements.combo8);
  assert.ok(profile.achievements.flawless);
});

test('daily streak increments on consecutive days and keeps the best score', () => {
  const profile = defaultProfile();
  const day1 = { score: 100, daily: true, dateKey: '2026-11-13' };
  const day2 = { score: 200, daily: true, dateKey: '2026-11-14' };
  const day3 = { score: 150, daily: true, dateKey: '2026-11-15' };
  recordRun(profile, day1, '2026-11-13');
  recordRun(profile, day2, '2026-11-14');
  const result = recordRun(profile, day3, '2026-11-15');
  assert.equal(profile.daily.streak, 3);
  assert.equal(profile.daily.lastDate, '2026-11-15');
  assert.equal(profile.daily.best, 200);
  assert.equal(dailyBestFor(profile, '2026-11-14'), 200);
  assert.equal(result.streak, 3);
  assert.ok(profile.achievements.daily3);
});

test('replaying the same day does not inflate the streak', () => {
  const profile = defaultProfile();
  recordRun(profile, { score: 100, daily: true, dateKey: '2026-11-15' }, '2026-11-15');
  recordRun(profile, { score: 50, daily: true, dateKey: '2026-11-15' }, '2026-11-15');
  assert.equal(profile.daily.streak, 1);
  assert.equal(profile.daily.bestByDate['2026-11-15'], 100);
});

test('breaking a daily streak resets it to one', () => {
  const profile = defaultProfile();
  recordRun(profile, { score: 100, daily: true, dateKey: '2026-11-10' }, '2026-11-10');
  recordRun(profile, { score: 100, daily: true, dateKey: '2026-11-14' }, '2026-11-14');
  assert.equal(profile.daily.streak, 1);
});

test('achievements are listed and cannot be unlocked twice', () => {
  const profile = defaultProfile();
  assert.equal(unlockAchievement(profile, 'wave5'), true);
  assert.equal(unlockAchievement(profile, 'wave5'), false);
  const list = achievementList(profile);
  assert.equal(list.length, 8);
  assert.equal(list.find((entry) => entry.id === 'wave5').unlocked, true);
  assert.equal(list.find((entry) => entry.id === 'wave10').unlocked, false);
});

test('saving and loading preserves a profile', () => {
  const store = memoryStore();
  const profile = loadProfile(store);
  profile.theme = 'ocean';
  profile.oath = 'warlord';
  profile.best = 900;
  saveProfile(profile, store);
  const loaded = loadProfile(store);
  assert.equal(loaded.theme, 'ocean');
  assert.equal(loaded.oath, 'warlord');
  assert.equal(loaded.best, 900);
});

test('reset clears progress but keeps appearance preferences', () => {
  const profile = defaultProfile();
  profile.best = 999;
  profile.theme = 'neon';
  profile.oath = 'squire';
  profile.achievements.wave5 = true;
  const fresh = resetProfile(profile);
  assert.equal(fresh.best, 0);
  assert.equal(fresh.theme, 'neon');
  assert.equal(fresh.oath, 'squire');
  assert.deepEqual(fresh.achievements, {});
  assert.equal(fresh.tutorialDone, true);
});
