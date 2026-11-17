import { makeMachine, S, LINES_5X3 } from './build.js';

export default makeMachine({
  id: 'atlantis',
  name: 'Atlantis Deep',
  tagline: 'Wilds stick through the free spins. Two scatters? The tide gives you another chance.',
  motif: '🐚', theme: 'ocean', reels: 5, rows: 3,
  paylines: LINES_5X3,
  symbols: [
    S('shell', '🐚', 'Shell', '#ffe066', 18), S('pearl', '🫧', 'Pearl', '#e2e8f0', 16),
    S('fish', '🐠', 'Fish', '#ff9f1c', 14), S('coral', '🪸', 'Coral', '#ff5ec4', 12),
    S('crab', '🦀', 'Crab', '#ff5252', 9), S('trident', '🔱', 'Trident', '#5ec8ff', 7),
    S('treasure', '🗝️', 'Treasure', '#ffd34d', 4), S('wild', '🃏', 'Wild', '#38bdf8', 3),
    S('scatter', '🎁', 'Scatter', '#4ade80', 2),
  ],
  paytable: {
    shell: { 3: 3, 4: 8, 5: 20 }, pearl: { 3: 4, 4: 11, 5: 27 },
    fish: { 3: 6, 4: 15, 5: 40 }, coral: { 3: 8, 4: 21, 5: 55 },
    crab: { 3: 11, 4: 30, 5: 80 }, trident: { 3: 16, 4: 45, 5: 125 },
    treasure: { 3: 28, 4: 85, 5: 280 }, wild: { 3: 70, 4: 220, 5: 800 },
    scatter: { 3: 3, 4: 12, 5: 60 },
  },
  mechanics: ['stickyWild', 'scatterRespin', 'cascade', 'bonus'],
  payoutScale: 0.18,
  volatility: 'Medium', rtp: '~89%', unlockLevel: 6,
});
