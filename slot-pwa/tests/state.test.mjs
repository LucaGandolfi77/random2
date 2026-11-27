import test from 'node:test';
import assert from 'node:assert/strict';
import {
  defaults, jackpotDefaults, load, save, loadJackpots, saveJackpots,
  betPerLine, activeLines, wager, canSpin, chargeSpin, creditWin,
  topUp, cycleBet, cycleLines, awardJackpot, selectMachine, machineStats, vip,
} from '../src/state.js';
import { getMachine } from '../src/machines/index.js';
import { GLOBAL_JACKPOTS, STORAGE_KEY, JACKPOT_KEY } from '../src/config.js';

function mem() {
  const map = new Map();
  return { getItem: (k) => (map.has(k) ? map.get(k) : null), setItem: (k, v) => map.set(k, v) };
}

test('defaults and persistence round-trip with merge', () => {
  const s = mem();
  const d = defaults();
  assert.equal(d.credits, 1000);
  assert.equal(d.machineId, 'lucky-seven');
  s.setItem(STORAGE_KEY, JSON.stringify({ credits: 42, theme: 'ocean' }));
  const loaded = load(s);
  assert.equal(loaded.credits, 42);
  assert.equal(loaded.theme, 'ocean');
  assert.equal(loaded.linesIndex, 3);
  s.setItem(STORAGE_KEY, '{bad');
  assert.deepEqual(load(s), defaults());
});

test('jackpot persistence', () => {
  const s = mem();
  const j = jackpotDefaults();
  j.grand = 12345;
  saveJackpots(s, j);
  assert.equal(loadJackpots(s).grand, 12345);
});

test('bet/lines/wager per machine and wrapping cycles', () => {
  const st = defaults();
  const lucky = getMachine('lucky-seven');
  assert.equal(betPerLine(st, lucky), 2);
  assert.equal(activeLines(st, lucky), 20);
  assert.equal(wager(st, lucky), 40);
  cycleBet(st, lucky, 1); assert.equal(betPerLine(st, lucky), 5);
  cycleLines(st, lucky, 1); assert.equal(activeLines(st, lucky), 1);
  st.betIndex = 0; cycleBet(st, lucky, -1);
  assert.notEqual(st.betIndex, 0);
});

test('cluster and ways machines use a 20-unit effective stake', () => {
  const st = defaults();
  assert.equal(activeLines(st, getMachine('nebula')), 20);
  assert.equal(activeLines(st, getMachine('sugar-rush')), 20);
});

test('canSpin respects bankroll and free spins', () => {
  const st = defaults();
  const lucky = getMachine('lucky-seven');
  st.credits = 10;
  assert.equal(canSpin(st, lucky), false);
  st.freeSpins = 1;
  assert.equal(canSpin(st, lucky), true);
});

test('chargeSpin deducts credits and grows jackpots; free spins are free', () => {
  const st = defaults();
  const lucky = getMachine('lucky-seven');
  const j = jackpotDefaults();
  const paid = chargeSpin(st, lucky, j);
  assert.equal(paid.free, false);
  assert.equal(st.credits, 1000 - wager(st, lucky));
  assert.equal(st.stats.totalWagered, 40);
  assert.ok(st.xp > 0);
  assert.ok(paid.jackpots.mini > j.mini);
  const credits = st.credits;
  st.freeSpins = 2;
  const free = chargeSpin(st, lucky, j);
  assert.equal(free.free, true);
  assert.equal(st.freeSpins, 1);
  assert.equal(st.credits, credits);
});

test('creditWin updates stats and machine stats', () => {
  const st = defaults();
  const lucky = getMachine('lucky-seven');
  creditWin(st, 1234.9, lucky);
  assert.equal(st.credits, 2234);
  assert.equal(st.stats.biggestWin, 1234);
  assert.equal(machineStats(st, 'lucky-seven').won, 1234);
  st.credits = 12;
  topUp(st);
  assert.equal(st.credits, 500);
});

test('awardJackpot resets the tier and credits the wallet', () => {
  const st = defaults();
  const j = jackpotDefaults();
  j.grand = 99999;
  assert.equal(awardJackpot(st, j, 'grand'), 99999);
  assert.equal(j.grand, GLOBAL_JACKPOTS.grand.base);
  assert.equal(st.stats.jackpotsWon, 1);
});

test('selectMachine switches machine, theme and tracks machines played', () => {
  const st = defaults();
  selectMachine(st, 'pharaoh');
  assert.equal(st.machineId, 'pharaoh');
  assert.equal(st.theme, 'egypt');
  selectMachine(st, 'nebula');
  assert.equal(st.stats.machinesPlayed >= 1, true);
  assert.ok(machineStats(st, 'nebula'));
});

test('VIP level rises with XP', () => {
  const st = defaults();
  assert.equal(vip(st), 1);
  st.xp = 700;
  assert.equal(vip(st), 4);
});
