import { makeMachine, S, LINES_5X3_25 } from './build.js';

export default makeMachine({
  id: 'pharaoh',
  name: "Pharaoh's Fortune",
  tagline: 'The desert guards its gold. Mystery symbols and expanding wilds.',
  motif: '🔺', theme: 'egypt', reels: 5, rows: 3,
  paylines: LINES_5X3_25,
  lineOptions: [5, 10, 20, 25],
  symbols: [
    S('ankh', '☥', 'Ankh', '#ffd34d', 18), S('scarab', '🪲', 'Scarab', '#4ade80', 16),
    S('eye', '👁', 'Eye of Horus', '#5ec8ff', 14), S('pyramid', '🔺', 'Pyramid', '#ffb300', 12),
    S('crown', '👑', 'Crown', '#ff7b29', 10), S('gem', '💎', 'Gem', '#b78cff', 8),
    S('pharaoh', '🧟', 'Pharaoh', '#ffe066', 5), S('mystery', '❓', 'Mystery', '#ff5ec4', 4),
    S('wild', '🃏', 'Wild', '#ff4d6d', 3), S('scatter', '🎁', 'Scatter', '#38bdf8', 2),
  ],
  paytable: {
    ankh: { 3: 3, 4: 9, 5: 22 }, scarab: { 3: 4, 4: 11, 5: 28 },
    eye: { 3: 5, 4: 14, 5: 36 }, pyramid: { 3: 7, 4: 19, 5: 50 },
    crown: { 3: 10, 4: 30, 5: 80 }, gem: { 3: 14, 4: 42, 5: 110 },
    pharaoh: { 3: 25, 4: 80, 5: 260 }, mystery: { 3: 0, 4: 0, 5: 0 },
    wild: { 3: 80, 4: 250, 5: 900 }, scatter: { 3: 4, 4: 16, 5: 80 },
  },
  mystery: 'mystery',
  mechanics: ['mystery', 'expandingWild', 'cascade', 'bonus', 'jackpotWheel'],
  payoutScale: 0.17,
  volatility: 'High', rtp: '~89%', unlockLevel: 2,
});
