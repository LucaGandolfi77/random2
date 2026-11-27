import test from 'node:test';
import assert from 'node:assert/strict';
import {
  mulberry32, makeRng, pick, generateStarts, gridFromStarts, randomSymbol, dailySeed,
} from '../src/rng.js';
import { getMachine } from '../src/machines/index.js';

const lucky = getMachine('lucky-seven');

test('mulberry32 is deterministic and in range', () => {
  const a = mulberry32(123), b = mulberry32(123);
  const seq = Array.from({ length: 50 }, () => a());
  assert.deepEqual(seq, Array.from({ length: 50 }, () => b()));
  seq.forEach((v) => assert.ok(v >= 0 && v < 1));
});

test('makeRng accepts a seed', () => {
  assert.equal(makeRng(7)(), makeRng(7)());
});

test('generateStarts and gridFromStarts respect machine rows', () => {
  const nebula = getMachine('nebula');
  const starts = generateStarts(nebula.strips, mulberry32(5));
  assert.equal(starts.length, nebula.reels);
  const grid = gridFromStarts(starts, nebula.rows);
  assert.equal(grid.length, nebula.reels);
  grid.forEach((reel) => assert.equal(reel.length, nebula.rows));
});

test('weighted strip sampling respects weights', () => {
  const strip = ['a', 'a', 'a', 'a', 'b'];
  const r = mulberry32(3);
  let a = 0;
  for (let i = 0; i < 10000; i++) if (pick(strip, r) === 'a') a++;
  assert.ok(Math.abs(a / 10000 - 0.8) < 0.03);
});

test('randomSymbol uses the requested machine strip', () => {
  const r = mulberry32(11);
  const all = new Set(lucky.symbolList.map((s) => s.key));
  for (let i = 0; i < 200; i++) assert.ok(all.has(randomSymbol(i % lucky.reels, r, lucky)));
});

test('dailySeed is stable per day + machine', () => {
  assert.equal(dailySeed('2026-11-17', 'lucky-seven'), dailySeed('2026-11-17', 'lucky-seven'));
  assert.notEqual(dailySeed('2026-11-17', 'lucky-seven'), dailySeed('2026-11-18', 'lucky-seven'));
  assert.notEqual(dailySeed('2026-11-17', 'lucky-seven'), dailySeed('2026-11-17', 'nebula'));
});
