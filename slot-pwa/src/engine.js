/*
 * Pure slot math: lines / ways / cluster evaluation, wilds, scatters, cascades,
 * Hold & Win detection and jackpot growth. Machine config is always injected.
 */
import { GLOBAL_JACKPOTS, XP_PER_WAGER } from './config.js';

export const totalBet = (betPerLine, lines) => betPerLine * lines;
export const xpFor = (bet) => Math.round(bet * XP_PER_WAGER * 100) / 100;

export function lineSymbols(grid, line) {
  return line.map(([reel, row]) => (grid[reel] && grid[reel][row]) || null);
}

/* Left-to-right match with wild substitution. */
export function evaluateLine(symbols, machine, betPerLine = 1) {
  const wild = machine.wild;
  let base = null;
  for (const s of symbols) if (s !== wild) { base = s; break; }
  if (base === null) base = wild;
  let count = 0;
  const positions = [];
  for (let i = 0; i < symbols.length; i++) {
    const s = symbols[i];
    if (s === base || s === wild) { count++; positions.push(i); }
    else break;
  }
  if (count < 3) return null;
  const mult = machine.paytable?.[base]?.[count];
  if (!mult) return null;
  return { symbol: base, count, payout: mult * betPerLine * (machine.payoutScale || 1), positions };
}

function evaluateLines(grid, machine, opts) {
  const wins = [];
  const betPerLine = opts.betPerLine || 1;
  machine.paylines.slice(0, opts.lines || machine.paylines.length).forEach((line, index) => {
    const r = evaluateLine(lineSymbols(grid, line), machine, betPerLine);
    if (!r) return;
    wins.push({
      line: index, symbol: r.symbol, count: r.count, payout: r.payout,
      positions: r.positions.map((i) => [line[i][0], line[i][1]]),
    });
  });
  return wins;
}

/* All ways: match symbols on adjacent reels, any row. */
function evaluateWays(grid, machine, opts) {
  const wins = [];
  const betPerLine = opts.betPerLine || 1;
  const keys = Object.keys(machine.paytable || {}).filter((k) => k !== machine.wild && k !== machine.scatter);
  for (const key of keys) {
    let ways = 1, run = 0;
    const positions = [];
    for (let reel = 0; reel < grid.length; reel++) {
      const matches = [];
      grid[reel].forEach((s, row) => {
        if (s === key || s === machine.wild) matches.push([reel, row]);
      });
      if (!matches.length) break;
      ways *= matches.length;
      run++;
      positions.push(...matches);
    }
    if (run < 3) continue;
    const mult = machine.paytable[key]?.[Math.min(run, 5)];
    if (!mult) continue;
    const cappedWays = Math.min(ways, 27);
    wins.push({
      line: wins.length, symbol: key, count: run,
      payout: mult * cappedWays * betPerLine * (machine.payoutScale || 1),
      ways, positions,
      label: `${run} across · ${ways} ways`,
    });
  }
  return wins;
}

/* Clusters: orthogonally connected groups of 5+, wilds bridge any symbol. */
function evaluateCluster(grid, machine, opts) {
  const wins = [];
  const betPerLine = opts.betPerLine || 1;
  const table = machine.clusterTable || {};
  const keys = Object.keys(table).filter((k) => k !== machine.wild && k !== machine.scatter && table[k] && Object.keys(table[k]).length);
  const seenByKey = new Set();

  for (const key of keys) {
    for (let r = 0; r < grid.length; r++) {
      for (let c = 0; c < grid[r].length; c++) {
        const startId = `${r}:${c}`;
        const cell = grid[r][c];
        if (cell !== key && cell !== machine.wild) continue;
        if (seenByKey.has(`${key}:${startId}`)) continue;
        const stack = [[r, c]];
        const group = new Set();
        while (stack.length) {
          const [y, x] = stack.pop();
          const id = `${y}:${x}`;
          if (seenByKey.has(`${key}:${id}`)) continue;
          const s = grid[y]?.[x];
          if (s !== key && s !== machine.wild) continue;
          seenByKey.add(`${key}:${id}`);
          group.add(id);
          [[y - 1, x], [y + 1, x], [y, x - 1], [y, x + 1]].forEach(([ny, nx]) => {
            if (ny >= 0 && ny < grid.length && nx >= 0 && nx < grid[ny].length) stack.push([ny, nx]);
          });
        }
        if (group.size < 5) continue;
        const size = Math.min(group.size, 10);
        const mult = table[key]?.[size] || table[key]?.[10] || 0;
        if (!mult) continue;
        wins.push({
          line: wins.length, symbol: key, count: group.size,
          payout: mult * betPerLine * (machine.payoutScale || 1),
          positions: [...group].map((id) => id.split(':').map(Number)),
          label: `${group.size} cluster`,
        });
      }
    }
  }
  return wins;
}

function countSymbol(grid, key) {
  let n = 0;
  for (const reel of grid) for (const s of reel) if (s === key) n++;
  return n;
}

/* Evaluate one grid for any machine. */
export function evaluateGrid(grid, machine, opts = {}) {
  const betPerLine = opts.betPerLine || 1;
  const lines = opts.lines || machine.paylines?.length || 1;
  let wins = [];
  if (machine.payMode === 'ways') wins = evaluateWays(grid, machine, { betPerLine });
  else if (machine.payMode === 'cluster') wins = evaluateCluster(grid, machine, { betPerLine });
  else wins = evaluateLines(grid, machine, { betPerLine, lines });

  const winAmount = wins.reduce((sum, w) => sum + w.payout, 0);
  const winningPositions = wins.flatMap((w) => w.positions);

  const scatterCount = countSymbol(grid, machine.scatter);
  let scatterPayout = 0, freeSpins = 0;
  if (scatterCount >= 3) {
    const capped = Math.min(scatterCount, 5);
    scatterPayout = (machine.paytable?.[machine.scatter]?.[capped] || 0) * totalBet(betPerLine, lines) * (machine.payoutScale || 1);
    freeSpins = machine.freeSpinsTable?.[capped] || 0;
  }

  const jackpotSymbols = machine.jackpotSymbols || ['clover', 'pharaoh', 'seven'];
  const triggers = [];
  if (machine.mechanics.includes('jackpotWheel') && wins.some((w) => jackpotSymbols.includes(w.symbol))) {
    triggers.push('wheel');
  }
  if (machine.mechanics.includes('bonus') && scatterCount >= 3) triggers.push('bonus');
  if (machine.mechanics.includes('holdAndWin') && countSymbol(grid, machine.coin || 'coin') >= (machine.holdTrigger || 5)) {
    triggers.push('hold');
  }
  if (machine.mechanics.includes('scatterRespin') && scatterCount === 2) triggers.push('respin');

  return {
    wins, winAmount, scatterCount, scatterPayout, freeSpins,
    totalWin: winAmount + scatterPayout,
    jackpotTriggers: triggers, winningPositions,
  };
}

/* Remove winning cells, settle survivors down and refill the top. */
export function dropNewSymbols(grid, winningPositions, rand, randomSymbol) {
  const dead = new Set(winningPositions.map(([r, row]) => `${r}:${row}`));
  return grid.map((reel, r) => {
    const survivors = [];
    for (let row = 0; row < reel.length; row++) {
      if (!dead.has(`${r}:${row}`)) survivors.push(reel[row]);
    }
    const refill = reel.length - survivors.length;
    const next = [];
    for (let row = 0; row < reel.length; row++) {
      next.push(row < refill ? randomSymbol(r, rand) : survivors[row - refill]);
    }
    return next;
  });
}

/* Upgrade the cheapest paying symbols one step after a cascade. */
function upgradeSymbols(grid, machine) {
  const order = machine.symbolList
    .filter((s) => s.key !== machine.wild && s.key !== machine.scatter && machine.paytable?.[s.key])
    .sort((a, b) => (machine.paytable[a.key][3] || 0) - (machine.paytable[b.key][3] || 0));
  if (order.length < 2) return grid;
  return grid.map((reel) => reel.map((s) => {
    const i = order.findIndex((o) => o.key === s);
    return i >= 0 && i < order.length - 1 ? order[i + 1].key : s;
  }));
}

/* Tumbling cascades with multipliers and optional per-machine upgrades. */
export function cascade(grid, machine, rand, randomSymbol, opts = {}) {
  const maxSteps = opts.maxSteps || 12;
  const steps = [];
  let current = grid;
  let totalWin = 0, freeSpins = 0, linesWon = 0, wildLines = 0, bestCascade = 0, bestWin = 0;
  const multiplierLadder = machine.mechanics.includes('multiplierLadder');

  for (let step = 1; step <= maxSteps; step++) {
    const result = evaluateGrid(current, machine, opts);
    const multiplier = multiplierLadder ? (step === 1 ? 1 : step * 2) : step;
    const stepWin = result.totalWin * multiplier;
    totalWin += stepWin;
    bestWin = Math.max(bestWin, stepWin);
    if (step === 1) freeSpins = result.freeSpins;
    linesWon += result.wins.length;
    wildLines += result.wins.filter((w) => w.symbol === machine.wild).length;
    bestCascade = step;
    steps.push({
      grid: current, wins: result.wins, win: stepWin, multiplier,
      scatterCount: step === 1 ? result.scatterCount : 0,
      triggers: step === 1 ? result.jackpotTriggers : [],
    });
    if (result.totalWin <= 0 || step >= maxSteps) break;
    current = dropNewSymbols(current, result.winningPositions, rand, randomSymbol);
    if (machine.mechanics.includes('symbolUpgrade')) current = upgradeSymbols(current, machine);
  }

  const first = steps[0] ? evaluateGrid(grid, machine, opts) : evaluateGrid(grid, machine, opts);
  return {
    steps, totalWin, freeSpins, linesWon, wildLines,
    bestCascade: first.totalWin > 0 ? bestCascade : 0,
    bestWin, firstResult: first, finalGrid: current,
  };
}

/* Hold & Win: spin a set of coin symbols into a grid and keep the hits. */
export function holdSpin(machine, rand, randomSymbol, held = []) {
  const grid = Array.from({ length: machine.rows }, () => Array(machine.reels).fill('·'));
  held.forEach(([r, c, symbol]) => { grid[r][c] = symbol; });
  for (let r = 0; r < machine.rows; r++) {
    for (let c = 0; c < machine.reels; c++) {
      if (grid[r][c] !== '·') continue;
      grid[r][c] = rand() < (machine.holdChance || 0.18) ? randomSymbol(c, rand) : '·';
    }
  }
  return grid;
}

export function holdValue(machine, grid) {
  const values = machine.coinValues || {};
  let total = 0, count = 0, full = true;
  for (const reel of grid) for (const s of reel) {
    if (s === '·') { full = false; continue; }
    if (values[s]) { total += values[s]; count++; }
  }
  return { total, count, full };
}

export function growJackpots(jackpots, bet) {
  const out = {};
  for (const key of Object.keys(GLOBAL_JACKPOTS)) {
    out[key] = (jackpots[key] || GLOBAL_JACKPOTS[key].base) + bet * GLOBAL_JACKPOTS[key].rate;
  }
  return out;
}
