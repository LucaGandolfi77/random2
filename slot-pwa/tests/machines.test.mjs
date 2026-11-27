import test from 'node:test';
import assert from 'node:assert/strict';
import { MACHINES, getMachine, isUnlocked, unlockedMachines } from '../src/machines/index.js';
import { evaluateGrid } from '../src/engine.js';
import { generateStarts, gridFromStarts, randomSymbol, mulberry32 } from '../src/rng.js';
import { VIP_LEVELS, VIP_NAMES, vipLevel } from '../src/config.js';
import { vipName } from '../src/state.js';

test('registry has eight unique machines with complete schemas', () => {
  assert.equal(MACHINES.length, 15);
  assert.equal(new Set(MACHINES.map((m) => m.id)).size, 15);
  for (const m of MACHINES) {
    assert.ok(m.name && m.tagline && m.motif && m.theme);
    assert.ok(m.reels >= 3 && m.rows >= 3, m.id);
    assert.ok(['lines', 'ways', 'cluster'].includes(m.payMode), m.id);
    assert.ok(m.symbolList.length >= 6, m.id);
    assert.ok(m.strips.length === m.reels, m.id);
    assert.ok(m.mechanics.length > 0, m.id);
    assert.ok(m.paylines || m.payMode !== 'lines', m.id);
    assert.ok(m.scatter && m.wild, m.id);
  }
});

test('all pay modes present', () => {
  const modes = new Set(MACHINES.map((m) => m.payMode));
  assert.ok(modes.has('lines') && modes.has('ways') && modes.has('cluster'));
});

test('every feature family is represented', () => {
  const mechanics = new Set(MACHINES.flatMap((m) => m.mechanics));
  ['holdAndWin', 'symbolUpgrade', 'expandingWild', 'stickyWild', 'shiftingWild',
    'mystery', 'stackedWild', 'multiplierLadder', 'gamble', 'bonusBuy', 'scatterRespin']
    .forEach((m) => assert.ok(mechanics.has(m), m));
});

test('VIP unlock ladder', () => {
  assert.equal(isUnlocked(getMachine('lucky-seven'), 1), true);
  assert.equal(isUnlocked(getMachine('pharaoh'), 1), false);
  assert.equal(isUnlocked(getMachine('pharaoh'), 2), true);
  assert.equal(isUnlocked(getMachine('samurai'), 7), true);
  assert.equal(unlockedMachines(1).length, 4);
  assert.equal(unlockedMachines(7).length, 11);
  assert.equal(unlockedMachines(11).length, 15);
  assert.equal(isUnlocked(getMachine('armata'), 7), false);
  assert.equal(isUnlocked(getMachine('armata'), 8), true);
  assert.equal(isUnlocked(getMachine('principina'), 11), true);
});

test('VIP ladder reaches level 11 with matching names', () => {
  assert.equal(VIP_LEVELS.length, 11);
  assert.equal(VIP_NAMES.length, 11);
  assert.equal(vipLevel(0), 1);
  assert.equal(vipLevel(23000), 11);
  assert.equal(vipName({ xp: 23000 }), 'Icon');
  assert.equal(vipName({ xp: 0 }), 'Rookie');
});

test('the six new themed machines are present and themed', () => {
  const expected = [
    ['bar-blu', 'barblue'], ['giro-bar', 'girobar'], ['armata', 'armata'],
    ['sinibbio', 'sinibbio'], ['agente', 'agente'], ['principina', 'principina'],
  ];
  for (const [id, theme] of expected) {
    const m = getMachine(id);
    assert.equal(m.id, id);
    assert.equal(m.theme, theme, id);
    assert.ok(m.tagline && m.motif, id);
  }
  assert.equal(getMachine('bar-blu').unlockLevel, 1);
  assert.equal(getMachine('giro-bar').unlockLevel, 1);
  assert.equal(getMachine('armata').unlockLevel, 8);
  assert.equal(getMachine('sinibbio').unlockLevel, 9);
  assert.equal(getMachine('agente').unlockLevel, 10);
  assert.equal(getMachine('principina').unlockLevel, 11);
});

test('Cristallo 3D is the single WebGL-rendered machine', () => {
  const c = getMachine('cristallo');
  assert.equal(c.id, 'cristallo');
  assert.equal(c.render3d, true);
  assert.equal(c.theme, 'cosmic');
  assert.equal(c.unlockLevel, 6);
  assert.equal(MACHINES.filter((m) => m.render3d).length, 1);
  assert.ok(c.jackpotSymbols.includes('rocket'));
});

test('every machine can generate and evaluate a grid without errors', () => {
  for (const m of MACHINES) {
    const rand = mulberry32(42);
    const starts = generateStarts(m.strips, rand);
    const grid = gridFromStarts(starts, m.rows);
    assert.equal(grid.length, m.reels, m.id);
    const result = evaluateGrid(grid, m, { betPerLine: 2, lines: 1 });
    assert.ok(Array.isArray(result.wins), m.id);
    assert.ok(Number.isFinite(result.totalWin), m.id);
  }
});

test('every machine has a symbol set with valid strips', () => {
  for (const m of MACHINES) {
    const keys = new Set(m.symbolList.map((s) => s.key));
    for (const strip of m.strips) {
      assert.ok(strip.length > 0, m.id);
      strip.forEach((s) => assert.ok(keys.has(s), `${m.id}: ${s}`));
    }
  }
});
