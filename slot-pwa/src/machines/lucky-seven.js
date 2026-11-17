import { makeMachine, S, LINES_5X3 } from './build.js';

export default makeMachine({
  id: 'lucky-seven',
  name: 'Lucky Seven',
  tagline: 'The original. Twenty lines, four jackpots, endless cascades.',
  motif: '🎰', theme: 'neon', reels: 5, rows: 3,
  paylines: LINES_5X3,
  symbols: [
    S('cherry', '🍒', 'Cherry', '#ff4d6d', 22), S('lemon', '🍋', 'Lemon', '#ffe14d', 18),
    S('orange', '🍊', 'Orange', '#ff9f1c', 16), S('grape', '🍇', 'Grape', '#b15cff', 13),
    S('bell', '🔔', 'Bell', '#ffd166', 10), S('star', '⭐', 'Star', '#ffe066', 8),
    S('coin', '💰', 'Money Bag', '#7cffb2', 5), S('clover', '🍀', 'Clover', '#4ade80', 3),
    S('wild', '🃏', 'Wild', '#ff5ec4', 3), S('scatter', '🎁', 'Scatter', '#5ec8ff', 2),
  ],
  paytable: {
    cherry: { 3: 3, 4: 8, 5: 20 }, lemon: { 3: 4, 4: 10, 5: 25 },
    orange: { 3: 5, 4: 13, 5: 34 }, grape: { 3: 7, 4: 17, 5: 45 },
    bell: { 3: 10, 4: 28, 5: 75 }, star: { 3: 13, 4: 39, 5: 100 },
    coin: { 3: 22, 4: 68, 5: 190 }, clover: { 3: 38, 4: 120, 5: 420 },
    wild: { 3: 75, 4: 240, 5: 850 }, scatter: { 3: 3, 4: 12, 5: 60 },
  },
  mechanics: ['cascade', 'jackpotWheel', 'bonus'],
  payoutScale: 0.70,
  volatility: 'Medium', rtp: '~89%', unlockLevel: 1,
});
