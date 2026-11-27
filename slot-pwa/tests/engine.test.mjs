import test from 'node:test';
import assert from 'node:assert/strict';
import {
  totalBet, lineSymbols, evaluateLine, evaluateGrid, dropNewSymbols,
  cascade, growJackpots, holdValue, holdSpin, xpFor,
} from '../src/engine.js';
import { getMachine, MACHINES } from '../src/machines/index.js';
import { mulberry32, randomSymbol } from '../src/rng.js';

const lucky = getMachine('lucky-seven');
const nebula = getMachine('nebula');
const sugar = getMachine('sugar-rush');
const vault = getMachine('vault');

const g3 = (cols) => cols;

test('totalBet and xpFor', () => {
  assert.equal(totalBet(5, 20), 100);
  assert.equal(xpFor(40), 4);
});

test('lineSymbols maps coordinates', () => {
  const grid = g3([['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i'], ['j', 'k', 'l'], ['m', 'n', 'o']]);
  assert.deepEqual(lineSymbols(grid, lucky.paylines[0]), ['b', 'e', 'h', 'k', 'n']);
});

test('evaluateLine: 3+ matches and wild substitution', () => {
  assert.equal(evaluateLine(['cherry', 'cherry', 'lemon', 'cherry', 'cherry'], lucky), null);
  const r = evaluateLine(['cherry', 'wild', 'cherry', 'cherry', 'lemon'], lucky, 2);
  assert.equal(r.symbol, 'cherry');
  assert.equal(r.count, 4);
  assert.equal(r.payout, lucky.paytable.cherry[4] * 2 * lucky.payoutScale);
  const allWild = evaluateLine(['wild', 'wild', 'wild', 'wild', 'wild'], lucky);
  assert.equal(allWild.symbol, 'wild');
});

test('lines evaluation pays a line win', () => {
  const grid = [
    ['x', 'cherry', 'x'], ['x', 'cherry', 'x'], ['x', 'cherry', 'x'],
    ['x', 'y', 'x'], ['x', 'y', 'x'],
  ];
  const r = evaluateGrid(grid, lucky, { betPerLine: 2, lines: 1 });
  assert.ok(r.wins.some((w) => w.symbol === 'cherry'));
  assert.ok(r.totalWin > 0);
});

test('scatters award free spins and the bonus trigger', () => {
  const grid = [
    ['scatter', 'x', 'x'], ['scatter', 'x', 'x'], ['scatter', 'x', 'x'],
    ['x', 'x', 'x'], ['x', 'x', 'x'],
  ];
  const r = evaluateGrid(grid, lucky, { betPerLine: 1, lines: 1 });
  assert.equal(r.scatterCount, 3);
  assert.equal(r.freeSpins, lucky.freeSpinsTable[3]);
  assert.ok(r.jackpotTriggers.includes('bonus'));
});

test('ways evaluation multiplies matches per reel', () => {
  const grid = [
    ['moon', 'x', 'y', 'z'], ['moon', 'x', 'y', 'z'], ['x', 'moon', 'y', 'z'],
    ['x', 'y', 'z', 'star'], ['x', 'y', 'z', 'star'],
  ];
  const r = evaluateGrid(grid, nebula, { betPerLine: 1 });
  const waysWin = r.wins.find((w) => w.symbol === 'moon');
  assert.ok(waysWin);
  assert.equal(waysWin.count, 3);
  assert.ok(waysWin.ways >= 1);
});

test('cluster evaluation finds connected groups of five', () => {
  const grid = [
    ['candy', 'candy', 'x', 'x', 'x', 'x'],
    ['candy', 'candy', 'x', 'x', 'x', 'x'],
    ['candy', 'x', 'x', 'x', 'x', 'x'],
    ['x', 'x', 'x', 'x', 'x', 'x'],
    ['x', 'x', 'x', 'x', 'x', 'x'],
  ];
  const r = evaluateGrid(grid, sugar, { betPerLine: 1 });
  const cluster = r.wins.find((w) => w.symbol === 'candy');
  assert.ok(cluster);
  assert.ok(cluster.count >= 5);
});

test('wilds bridge cluster groups', () => {
  const grid = [
    ['candy', 'candy', 'x', 'x', 'x', 'x'],
    ['candy', 'wild', 'candy', 'x', 'x', 'x'],
    ['candy', 'x', 'x', 'x', 'x', 'x'],
    ['x', 'x', 'x', 'x', 'x', 'x'],
    ['x', 'x', 'x', 'x', 'x', 'x'],
  ];
  const r = evaluateGrid(grid, sugar, { betPerLine: 1 });
  assert.ok(r.wins.some((w) => w.count >= 5));
});

test('dropNewSymbols settles survivors to the bottom', () => {
  const grid = [['a', 'b', 'c'], ['d', 'e', 'f'], ['g', 'h', 'i']];
  const next = dropNewSymbols(grid, [[0, 0], [2, 2]], mulberry32(2), (r) => 'NEW' + r);
  assert.deepEqual(next[0], ['NEW0', 'b', 'c']);
  assert.deepEqual(next[2], ['NEW2', 'g', 'h']);
});

test('cascade applies multipliers and records the best step', () => {
  const grid = [
    ['x', 'cherry', 'x'], ['x', 'cherry', 'x'], ['x', 'cherry', 'x'],
    ['x', 'y', 'x'], ['x', 'y', 'x'],
  ];
  const r = cascade(grid, lucky, mulberry32(9), (i, rr) => randomSymbol(i, rr, lucky), { betPerLine: 1, lines: 1 });
  assert.ok(r.steps.length >= 1);
  assert.equal(r.steps[0].win, lucky.paytable.cherry[3] * lucky.payoutScale);
  assert.ok(r.bestCascade >= 1);
});

test('multiplierLadder doubles later cascade steps', () => {
  const grid = [
    ['x', 'moon', 'a', 'b'], ['x', 'moon', 'a', 'b'], ['x', 'c', 'a', 'b'], ['x', 'c', 'a', 'b'],
    ['x', 'c', 'a', 'b'],
  ];
  const r = cascade(grid, nebula, mulberry32(4), (i, rr) => randomSymbol(i, rr, nebula), { betPerLine: 1 });
  if (r.steps.length > 1) assert.equal(r.steps[1].multiplier, 4);
});

test('holdSpin and holdValue track coin collection', () => {
  const grid = holdSpin(vault, mulberry32(8), (i, rr) => randomSymbol(i, rr, vault));
  const v = holdValue(vault, grid);
  assert.ok(v.total >= 0);
  assert.ok(v.count >= 0);
  assert.equal(typeof v.full, 'boolean');
});

test('growJackpots increases every tier', () => {
  const before = {};
  MACHINES.forEach(() => {});
  ['mini', 'minor', 'major', 'grand'].forEach((k) => { before[k] = 0; });
  const after = growJackpots(before, 100);
  ['mini', 'minor', 'major', 'grand'].forEach((k) => assert.ok(after[k] > 0));
});
