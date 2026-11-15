import test from 'node:test';
import assert from 'node:assert/strict';
import {
  ACHIEVEMENTS,
  UPGRADES,
  UPGRADE_BY_ID,
  bossHp,
  bossName,
  draftChoices,
  isBossWave,
  waveComposition
} from '../src/content.js';
import { dailySeed, dateKey, makeRng, mulberry32, shiftDateKey } from '../src/rng.js';

test('the same seed produces the same random stream', () => {
  const a = makeRng(99);
  const b = makeRng(99);
  for (let i = 0; i < 20; i++) assert.equal(a.next(), b.next());
});

test('a seeded generator stays within its range', () => {
  const rng = mulberry32(11);
  for (let i = 0; i < 100; i++) {
    const value = rng();
    assert.ok(value >= 0 && value < 1);
  }
});

test('date helpers produce stable daily keys and seeds', () => {
  const date = new Date(2026, 0, 2);
  assert.equal(dateKey(date), '2026-01-02');
  assert.equal(shiftDateKey('2026-01-02', -1), '2026-01-01');
  assert.equal(shiftDateKey('2026-03-01', -1), '2026-02-28');
  assert.equal(dailySeed(date), dailySeed(new Date(2026, 0, 2)));
  assert.notEqual(dailySeed(date), dailySeed(new Date(2026, 0, 3)));
});

test('wave composition is deterministic and boss waves include a warlord', () => {
  const a = waveComposition(makeRng(42), 7);
  const b = waveComposition(makeRng(42), 7);
  assert.deepEqual(a, b);
  assert.equal(a.boss, false);
  assert.ok(a.types.length >= 5);
  assert.equal(isBossWave(5), true);
  assert.equal(waveComposition(makeRng(1), 5).types[0], 'boss');
  assert.equal(waveComposition(makeRng(1), 10).types[0], 'boss');
});

test('waves keep growing after the old difficulty cap', () => {
  const early = waveComposition(makeRng(7), 14);
  const late = waveComposition(makeRng(7), 24);
  assert.ok(late.types.length > early.types.length);
});

test('there are thirteen upgrades and drafts never repeat one', () => {
  assert.equal(UPGRADES.length, 13);
  assert.equal(ACHIEVEMENTS.length, 8);
  const rng = makeRng(123);
  const choices = draftChoices(rng, {}, 3);
  assert.equal(choices.length, 3);
  assert.equal(new Set(choices.map((choice) => choice.id)).size, 3);
});

test('drafts exclude upgrades that are already maxed', () => {
  const levels = {};
  for (const upgrade of UPGRADES) {
    if (upgrade.id !== 'bounty') levels[upgrade.id] = upgrade.max;
  }
  const choices = draftChoices(makeRng(5), levels, 3);
  assert.deepEqual(choices.map((choice) => choice.id), ['bounty']);
});

test('boss names and health scale with the siege', () => {
  assert.equal(bossName(5), 'Ogre Warlord');
  assert.notEqual(bossName(10), bossName(5));
  assert.ok(bossHp(20) > bossHp(5));
  assert.ok(bossHp(5, 'warlord') > bossHp(5, 'squire'));
  assert.equal(UPGRADE_BY_ID.broadhead.max, 3);
});
