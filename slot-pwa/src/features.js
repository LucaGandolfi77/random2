/* Composable per-machine mechanic helpers. Pure where possible. */
import { holdSpin, holdValue } from './engine.js';

/* Mutate a freshly generated grid according to the machine's mechanics. */
export function prepareGrid(grid, machine, rand, ctx = {}) {
  const g = grid.map((reel) => reel.slice());
  const M = machine.mechanics;

  if (M.includes('stickyWild') && ctx.sticky) {
    ctx.sticky.forEach(([r, c]) => { if (g[r] && g[r][c] !== undefined) g[r][c] = machine.wild; });
  }

  if (machine.mystery) {
    const candidates = g.flat().filter((s) => s !== machine.mystery && s !== machine.wild && s !== machine.scatter && s !== '·');
    if (candidates.length) {
      const reveal = candidates[Math.floor(rand() * candidates.length)];
      for (let r = 0; r < g.length; r++) g[r] = g[r].map((s) => (s === machine.mystery ? reveal : s));
    }
  }

  if (M.includes('expandingWild')) {
    // At most one column per spin, only when a wild lands on the centre row.
    const mid = Math.floor(g[0].length / 2);
    for (let c = 0; c < g[0].length; c++) {
      if (g[mid][c] === machine.wild && rand() < 0.25) {
        g.forEach((reel) => { reel[c] = machine.wild; });
        break;
      }
    }
  }

  if (M.includes('stackedWild')) {
    for (let c = 0; c < g[0].length; c++) {
      if (rand() < 0.16) {
        const start = Math.floor(rand() * Math.max(1, g[0].length - 1));
        for (let r = start; r < Math.min(g[0].length, start + 2); r++) g[r][c] = machine.wild;
      }
    }
  }

  if (M.includes('shiftingWild') && ctx.shiftColumn !== undefined) {
    const from = (ctx.shiftColumn - 1 + g.length) % g.length;
    const wilds = [];
    g[from].forEach((s, row) => { if (s === machine.wild) wilds.push(row); });
    wilds.forEach((row) => { g[from][row] = g[ctx.shiftColumn % g.length][row]; g[ctx.shiftColumn % g.length][row] = machine.wild; });
  }

  return g;
}

export function collectSticky(grid, machine) {
  const out = [];
  grid.forEach((reel, r) => reel.forEach((s, c) => { if (s === machine.wild) out.push([r, c]); }));
  return out;
}

/* Hold & Win: returns a sequence of grids for the respin animation. */
export function runHoldSequence(machine, rand, randomSymbol, startGrid) {
  const coins = machine.coinValues || {};
  let grid = startGrid.map((reel) => reel.map((s) => (coins[s] ? s : '·')));
  let spins = 3;
  const frames = [grid];
  let settled = holdValue(machine, grid);

  while (spins > 0 && !settled.full) {
    const held = [];
    grid.forEach((reel, r) => reel.forEach((s, c) => { if (s !== '·') held.push([r, c, s]); }));
    grid = holdSpin(machine, rand, randomSymbol, held);
    frames.push(grid);
    settled = holdValue(machine, grid);
    if (settled.count > 0) spins = 3; // coin hits refresh the respin counter
    else spins--;
  }
  return { frames, value: settled.total, full: settled.full, coins: settled.count };
}

/* Gamble: a card flip. Ace of a random suit beats the dealer card. */
export function gambleRound(rand) {
  const suits = ['♠', '♥', '♦', '♣'];
  const ranks = ['9', '10', 'J', 'Q', 'K', 'A'];
  const playerRank = Math.floor(rand() * ranks.length);
  const dealerRank = Math.floor(rand() * ranks.length);
  const win = playerRank > dealerRank;
  return {
    win,
    player: `${ranks[playerRank]}${suits[Math.floor(rand() * 4)]}`,
    dealer: `${ranks[dealerRank]}${suits[Math.floor(rand() * 4)]}`,
  };
}

export const bonusBuyCost = (bet) => Math.max(50, bet * 100);
