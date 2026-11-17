import { makeMachine, S, LINES_3X3 } from './build.js';

export default makeMachine({
  id: 'vault',
  name: 'Vault Breaker',
  tagline: 'Collect coins, lock them in, and take three respins at the jackpot vault.',
  motif: '💎', theme: 'safari', reels: 3, rows: 3,
  paylines: LINES_3X3,
  lineOptions: [1, 3, 5],
  symbols: [
    S('coin', '🪙', 'Coin', '#ffd34d', 9), S('silver', '🥈', 'Silver', '#e2e8f0', 8),
    S('gold', '🥇', 'Gold', '#ffb300', 6), S('gem', '💎', 'Gem', '#b78cff', 4),
    S('vault', '🏦', 'Vault', '#4ade80', 2), S('wild', '🃏', 'Wild', '#ff5ec4', 3),
    S('scatter', '🎁', 'Scatter', '#38bdf8', 2), S('lock', '🔒', 'Lock', '#555', 30),
  ],
  paytable: {
    coin: { 3: 8, 4: 20, 5: 50 }, silver: { 3: 12, 4: 30, 5: 70 },
    gold: { 3: 18, 4: 45, 5: 110 }, gem: { 3: 28, 4: 75, 5: 190 },
    vault: { 3: 60, 4: 160, 5: 400 }, wild: { 3: 90, 4: 240, 5: 600 },
    scatter: { 3: 5, 4: 15, 5: 60 },
  },
  payoutScale: 0.8,
  coinValues: { coin: 2, silver: 5, gold: 15, gem: 40, vault: 100 },
  holdTrigger: 5,
  holdChance: 0.13,
  mechanics: ['holdAndWin', 'jackpotWheel', 'bonus'],
  volatility: 'Medium', rtp: '~90%', unlockLevel: 5,
});
