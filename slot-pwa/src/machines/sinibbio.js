import { makeMachine, S, LINES_3X3 } from './build.js';

export default makeMachine({
  id: 'sinibbio',
  name: 'Sinibbio Reale',
  tagline: 'A very royal rabbit. Collect golden coins and crack the vault.',
  motif: '🐰', theme: 'sinibbio', reels: 3, rows: 3,
  paylines: LINES_3X3,
  lineOptions: [1, 3, 5],
  symbols: [
    S('carrot', '🥕', 'Carrot', '#ff9f1c', 20), S('egg', '🥚', 'Egg', '#fff3d0', 18),
    S('bunny', '🐰', 'Bunny', '#ff9fc4', 15), S('clover', '🍀', 'Clover', '#4ade80', 12),
    S('gem', '💎', 'Gem', '#b78cff', 9), S('crown', '👑', 'Crown', '#ffd34d', 6),
    S('coin', '🪙', 'Coin', '#ffb300', 5), S('wild', '🃏', 'Wild', '#f5f5ff', 3),
    S('scatter', '🎁', 'Scatter', '#38bdf8', 2), S('lock', '🔒', 'Lock', '#777', 26),
  ],
  paytable: {
    carrot: { 3: 8, 4: 20, 5: 50 }, egg: { 3: 10, 4: 26, 5: 68 },
    bunny: { 3: 14, 4: 38, 5: 100 }, clover: { 3: 20, 4: 55, 5: 150 },
    gem: { 3: 28, 4: 80, 5: 230 }, crown: { 3: 45, 4: 135, 5: 420 },
    coin: { 3: 60, 4: 180, 5: 560 }, wild: { 3: 100, 4: 300, 5: 900 },
    scatter: { 3: 8, 4: 24, 5: 100 }, lock: { 3: 0, 4: 0, 5: 0 },
  },
  coinValues: { coin: 3, egg: 5, bunny: 10, gem: 25, crown: 60 },
  holdTrigger: 5,
  holdChance: 0.2,
  mechanics: ['holdAndWin', 'jackpotWheel', 'bonus'],
  payoutScale: 0.42,
  volatility: 'Medium', rtp: '~95%', unlockLevel: 9,
});
