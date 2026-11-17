import { makeMachine, S, LINES_5X3 } from './build.js';

export default makeMachine({
  id: 'cristallo',
  name: 'Cristallo 3D',
  tagline: 'A crystal cabinet rendered in real 3D. Gems, light and tumbling wealth.',
  motif: '💎', theme: 'cosmic', reels: 5, rows: 3,
  render3d: true,
  paylines: LINES_5X3,
  symbols: [
    S('gem', '💎', 'Gem', '#b78cff', 18), S('pearl', '🫧', 'Pearl', '#e2e8f0', 16),
    S('crown', '👑', 'Crown', '#ffd34d', 14), S('star', '⭐', 'Star', '#ffe066', 12),
    S('moon', '🌙', 'Moon', '#e2e8f0', 10), S('planet', '🪐', 'Planet', '#ff6ec7', 8),
    S('rocket', '🚀', 'Rocket', '#ff9f1c', 6), S('coin', '💰', 'Treasure', '#7cffb2', 4),
    S('wild', '🃏', 'Wild', '#ff5ec4', 3), S('scatter', '🎁', 'Scatter', '#38bdf8', 2),
  ],
  paytable: {
    gem: { 3: 4, 4: 12, 5: 34 }, pearl: { 3: 5, 4: 15, 5: 45 },
    crown: { 3: 7, 4: 21, 5: 65 }, star: { 3: 9, 4: 28, 5: 90 },
    moon: { 3: 12, 4: 38, 5: 125 }, planet: { 3: 16, 4: 52, 5: 180 },
    rocket: { 3: 23, 4: 76, 5: 265 }, coin: { 3: 36, 4: 120, 5: 440 },
    wild: { 3: 88, 4: 270, 5: 950 }, scatter: { 3: 4, 4: 16, 5: 80 },
  },
  jackpotSymbols: ['rocket'],
  mechanics: ['cascade', 'jackpotWheel', 'bonus'],
  bonus: { picks: 3, pool: [200, 400, 800, 'FREE'] },
  payoutScale: 0.25,
  volatility: 'High', rtp: '~95%', unlockLevel: 6,
});
