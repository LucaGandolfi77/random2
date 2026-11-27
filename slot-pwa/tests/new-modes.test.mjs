import test from 'node:test';
import assert from 'node:assert/strict';
import { defaults } from '../src/state.js';
import { getMachine, MACHINES } from '../src/machines/index.js';
import { MODE_TABS, VIP_LEVELS } from '../src/config.js';
import * as bonusHunt from '../src/modes/bonus-hunt.js';
import * as boss from '../src/modes/boss.js';
import * as chase from '../src/modes/chase.js';
import * as cascade from '../src/modes/cascade.js';
import * as roulette from '../src/modes/roulette.js';
import * as highRoller from '../src/modes/high-roller.js';

const lucky = getMachine('lucky-seven');
const info = (over = {}) => ({ gross: 100, cost: 40, result: { jackpotTriggers: [], bestCascade: 0, wins: [] }, ...over });
const ctx = () => ({ machines: MACHINES, vip: 7, rand: Math.random });

test('lobby exposes twelve mode tabs', () => {
  assert.equal(MODE_TABS.length, 12);
});

test('Bonus Hunt scores only bonus-triggering spins', () => {
  const st = defaults();
  const s = bonusHunt.start(st);
  bonusHunt.onSpin(st, s, info({ gross: 500, result: { jackpotTriggers: ['bonus'] } }));
  bonusHunt.onSpin(st, s, info({ gross: 900 }));
  assert.equal(s.score, 500);
  assert.equal(s.bonuses, 1);
  assert.equal(s.spinsLeft, 10);
  assert.equal(s.done, false);
  s.spinsLeft = 1;
  bonusHunt.onSpin(st, s, info());
  assert.equal(s.done, true);
});

test('Boss Battle: damage, criticals and defeat', () => {
  const st = defaults();
  const s = boss.start(st, lucky);
  assert.equal(s.hp, s.maxHp);
  const out = boss.onSpin(st, s, info({ gross: 500, result: { jackpotTriggers: ['bonus'] } }));
  assert.ok(out.status.includes('CRITICAL'));
  assert.equal(s.damage, 1000);
  assert.equal(s.crits, 1);
  s.hp = 10;
  boss.onSpin(st, s, info({ gross: 100 }));
  assert.equal(s.done, true);
  assert.ok(boss.finish(st, s).title.includes('Defeated'));
});

test('Jackpot Chase fills the meter and caps at target', () => {
  const st = defaults();
  const s = chase.start(st);
  assert.equal(s.target, 6000);
  chase.onSpin(st, s, info({ gross: 6000 }));
  assert.equal(s.filled, true);
  assert.equal(s.done, true);
  const panel = chase.finish(st, s);
  assert.ok(panel.title.includes('Cracked'));
});

test('Cascade Challenge multiplies points by cascade length', () => {
  const st = defaults();
  const s = cascade.start(st);
  cascade.onSpin(st, s, info({ gross: 100, result: { bestCascade: 3 } }));
  assert.equal(s.score, 300);
  assert.equal(s.best, 3);
  assert.equal(s.chains, 1);
  cascade.onSpin(st, s, info());
  assert.equal(s.score, 300);
});

test('Mystery Roulette picks an unlocked machine and a modifier', () => {
  const st = defaults();
  const s = roulette.start(st, lucky, ctx());
  assert.ok(MACHINES.some((m) => m.id === s.machineId));
  assert.ok(s.modifier.mult >= 1);
  assert.equal(s.spinsLeft, 10);
  const out = roulette.onSpin(st, s, info({ gross: 200 }));
  assert.equal(s.score, Math.round(200 * s.modifier.mult));
  assert.ok(out.status.includes(s.modifier.name));
});

test('High Roller requires VIP 5 and forces the max bet', () => {
  const st = defaults();
  assert.equal(highRoller.canEnter(st, lucky, ctxWithVip(1)).ok, false);
  assert.equal(highRoller.canEnter(st, lucky, ctxWithVip(5)).ok, true);
  const s = highRoller.start(st, lucky);
  assert.equal(s.bet, lucky.betSteps.at(-1));
  highRoller.onSpin(st, s, info({ gross: 2500, result: { jackpotTriggers: ['bonus'] } }));
  assert.ok(s.prestige >= 350);
  assert.equal(s.features, 1);
});

function ctxWithVip(vip) { return { machines: MACHINES, vip, rand: Math.random }; }
