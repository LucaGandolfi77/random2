import test from 'node:test';
import assert from 'node:assert/strict';
import {
  eggTier,
  eggPool,
  pickEggSpecies,
  levelForXp,
  xpProgress,
} from '../src/logic/progress.js';

const dex = [
  { id: 'common', difficulty: 1, weight: 5 },
  { id: 'mid', difficulty: 5, weight: 2 },
  { id: 'rare', difficulty: 8, weight: 1 },
  { id: 'legend', difficulty: 10, weight: 0.3, legendary: true },
  { id: 'myth', difficulty: 10, weight: 0.1, mythical: true },
  { id: 'zero', difficulty: 1, weight: 0 },
];

test('egg tiers group by distance', () => {
  assert.equal(eggTier(2), 2);
  assert.equal(eggTier(5), 5);
  assert.equal(eggTier(10), 10);
});

test('legendaries never enter an egg pool', () => {
  for (const km of [2, 5, 10]) {
    const pool = eggPool(dex, km);
    assert.ok(pool.every((p) => !p.legendary && !p.mythical));
    assert.ok(pool.every((p) => p.weight > 0));
  }
});

test('2 km is easy, 10 km is rare', () => {
  assert.deepEqual(eggPool(dex, 2).map((p) => p.id), ['common', 'mid']);
  assert.deepEqual(eggPool(dex, 10).map((p) => p.id), ['rare']);
});

test('pickEggSpecies is deterministic with a seeded rng', () => {
  const a = pickEggSpecies(dex, 10, { rng: () => 0 });
  const b = pickEggSpecies(dex, 10, { rng: () => 0 });
  assert.equal(a.id, 'rare');
  assert.equal(b.id, 'rare');
});

test('levels are monotonic and capped at 40', () => {
  const levels = [0, 1000, 3000];
  assert.equal(levelForXp(0, levels), 1);
  assert.equal(levelForXp(999, levels), 1);
  assert.equal(levelForXp(1000, levels), 2);
  assert.equal(levelForXp(5000, levels), 3);
  assert.equal(levelForXp(1e9, Array.from({ length: 45 }, (_, i) => i * 1000)), 40);
});

test('xpProgress reports the current band', () => {
  const p = xpProgress(1500, [0, 1000, 3000]);
  assert.equal(p.level, 2);
  assert.ok(p.pct > 0 && p.pct < 1);
});
