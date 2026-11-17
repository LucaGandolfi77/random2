import { makeMachine, S, LINES_5X3 } from './build.js';

export default makeMachine({
  id: 'principina',
  name: 'Principina a Mare',
  tagline: 'A little princess by the sea. Pearls, tides and a royal jackpot.',
  motif: '👑', theme: 'principina', reels: 5, rows: 3,
  paylines: LINES_5X3,
  symbols: [
    S('shell', '🐚', 'Shell', '#ffe0a3', 20), S('wave', '🌊', 'Wave', '#7fe0ff', 18),
    S('sun', '☀️', 'Sun', '#ffd166', 15), S('pearl', '🫧', 'Pearl', '#e2e8f0', 13),
    S('umbrella', '🏖️', 'Parasol', '#ff7ac6', 10), S('star', '⭐', 'Star', '#ffe066', 8),
    S('crown', '👑', 'Crown', '#ffcc00', 5), S('coin', '💰', 'Treasure', '#7cffb2', 4),
    S('wild', '🃏', 'Wild', '#ff5ec4', 3), S('scatter', '🎁', 'Scatter', '#38bdf8', 2),
  ],
  paytable: {
    shell: { 3: 4, 4: 11, 5: 30 }, wave: { 3: 5, 4: 14, 5: 40 },
    sun: { 3: 7, 4: 19, 5: 56 }, pearl: { 3: 9, 4: 25, 5: 76 },
    umbrella: { 3: 12, 4: 35, 5: 110 }, star: { 3: 16, 4: 48, 5: 160 },
    crown: { 3: 26, 4: 85, 5: 300 }, coin: { 3: 38, 4: 120, 5: 440 },
    wild: { 3: 85, 4: 260, 5: 900 }, scatter: { 3: 4, 4: 16, 5: 80 },
  },
  mechanics: ['cascade', 'jackpotWheel', 'scatterRespin', 'bonus'],
  payoutScale: 0.56,
  volatility: 'Medium', rtp: '~95%', unlockLevel: 11,
});
