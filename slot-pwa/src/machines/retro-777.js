import { makeMachine, S, LINES_3X3 } from './build.js';

export default makeMachine({
  id: 'retro-777',
  name: 'Neon Retro 777',
  tagline: 'One line. Three reels. Old-school thrills and the biggest swings.',
  motif: '7️⃣', theme: 'retro', reels: 3, rows: 3,
  paylines: LINES_3X3,
  lineOptions: [1, 3, 5],
  betSteps: [1, 5, 10, 25, 50],
  symbols: [
    S('cherry', '🍒', 'Cherry', '#ff4d6d', 24), S('lemon', '🍋', 'Lemon', '#ffe14d', 20),
    S('bell', '🔔', 'Bell', '#ffd166', 15), S('bar', '🍫', 'BAR', '#b78cff', 10),
    S('seven', '7️⃣', 'Seven', '#ffcc00', 5), S('diamond', '💎', 'Diamond', '#5ec8ff', 3),
    S('wild', '🃏', 'Wild', '#ff5ec4', 3), S('scatter', '🎁', 'Scatter', '#4ade80', 2),
  ],
  paytable: {
    cherry: { 3: 8, 4: 20, 5: 50 }, lemon: { 3: 12, 4: 30, 5: 75 },
    bell: { 3: 18, 4: 50, 5: 130 }, bar: { 3: 30, 4: 85, 5: 220 },
    seven: { 3: 80, 4: 240, 5: 700 }, diamond: { 3: 150, 4: 450, 5: 1200 },
    wild: { 3: 200, 4: 600, 5: 1500 }, scatter: { 3: 8, 4: 24, 5: 100 },
  },
  freeSpinsTable: { 3: 5, 4: 10, 5: 15 },
  payoutScale: 0.35,
  mechanics: ['gamble', 'bonusBuy', 'jackpotWheel'],
  volatility: 'Very High', rtp: '~88%', unlockLevel: 1,
});
