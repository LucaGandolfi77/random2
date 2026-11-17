/**
 * Monte Carlo balance check across every machine in the arcade.
 *   node scripts/balance.mjs [spinsPerMachine]
 */
import { MACHINES } from '../src/machines/index.js';
import { makeRng, generateStarts, gridFromStarts, randomSymbol, dailySeed } from '../src/rng.js';
import { cascade, growJackpots } from '../src/engine.js';
import {
  defaults, jackpotDefaults, betPerLine, activeLines, wager, selectMachine,
} from '../src/state.js';
import { prepareGrid, runHoldSequence } from '../src/features.js';
import { GLOBAL_JACKPOTS } from '../src/config.js';

const perMachine = Number(process.argv[2] || 10000);
const seedBase = dailySeed('balance-run', 'arcade');

function award(jp, tier) {
  const amount = Math.floor(jp[tier]);
  jp[tier] = GLOBAL_JACKPOTS[tier].base;
  return amount;
}

console.log(`spins per machine: ${perMachine.toLocaleString()}\n`);
console.log('machine         RTP      hit%   bonus  jackpot  maxwin');
console.log('─'.repeat(62));

for (const m of MACHINES) {
  const rand = makeRng(seedBase ^ [...m.id].reduce((a, c) => a + c.charCodeAt(0), 0));
  const jp = jackpotDefaults();
  const state = defaults();
  selectMachine(state, m.id);
  const bet = wager(state, m);
  let wagered = 0, won = 0, wins = 0, bonuses = 0, jackpots = 0, maxWin = 0, pendingFree = 0;

  for (let i = 0; i < perMachine; i++) {
    const free = pendingFree > 0;
    if (free) pendingFree--;
    else {
      wagered += bet;
      const grown = growJackpots(jp, bet);
      Object.assign(jp, grown);
    }

    const starts = generateStarts(m.strips, rand);
    let grid = gridFromStarts(starts, m.rows);
    grid = prepareGrid(grid, m, rand, { sticky: [], shiftColumn: 0 });
    const r = cascade(grid, m, rand, (rIdx, rr) => randomSymbol(rIdx, rr, m), {
      betPerLine: betPerLine(state, m), lines: activeLines(state, m),
    });
    won += r.totalWin;
    maxWin = Math.max(maxWin, r.totalWin);
    if (r.totalWin > 0) wins++;
    pendingFree += r.freeSpins;

    const triggers = r.firstResult.jackpotTriggers;
    if (triggers.includes('bonus')) {
      bonuses++;
      const pool = (m.bonus?.pool || []).slice();
      for (let k = pool.length - 1; k > 0; k--) {
        const j = Math.floor(rand() * (k + 1));
        [pool[k], pool[j]] = [pool[j], pool[k]];
      }
      for (const p of pool.slice(0, m.bonus?.picks || 3)) {
        if (p === 'FREE') pendingFree += 5;
        else if (p === 'MINI' || p === 'MINOR') { won += award(jp, p.toLowerCase()); jackpots++; }
        else won += p;
      }
    }
    if (triggers.includes('wheel')) {
      const roll = rand();
      const tier = roll < 0.5 ? 'mini' : roll < 0.8 ? 'minor' : roll < 0.95 ? 'major' : 'grand';
      won += award(jp, tier); jackpots++;
    }
    if (triggers.includes('hold')) {
      const seq = runHoldSequence(m, rand, (rIdx, rr) => randomSymbol(rIdx, rr, m), r.finalGrid);
      won += seq.value;
      if (seq.full) { won += award(jp, 'grand'); jackpots++; }
    }
  }

  const rtp = (won / wagered * 100).toFixed(1);
  console.log(
    m.name.padEnd(16) +
    `${rtp}%`.padStart(7) +
    `${(wins / perMachine * 100).toFixed(1)}%`.padStart(8) +
    String(bonuses).padStart(8) +
    String(jackpots).padStart(9) +
    maxWin.toLocaleString().padStart(9)
  );
}
