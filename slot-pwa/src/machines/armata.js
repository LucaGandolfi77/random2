import { makeMachine, S } from './build.js';

export default makeMachine({
  id: 'armata',
  name: 'Armata Gialloblù',
  tagline: 'Fulgor Fidenza fans in the stands. Four rows, 243 ways, one roar.',
  motif: '🏀', theme: 'armata', reels: 5, rows: 4,
  payMode: 'ways',
  symbols: [
    S('ball', '🏀', 'Ball', '#ff9f1c', 18), S('jersey', '👕', 'Jersey', '#ffd400', 16),
    S('hoop', '🎯', 'Hoop', '#ff7043', 14), S('sneaker', '👟', 'Sneaker', '#5ec8ff', 12),
    S('flag', '🚩', 'Flag', '#ffd400', 10), S('star', '⭐', 'Star', '#ffe066', 8),
    S('coin', '💰', 'Trophy', '#7cffb2', 5), S('wild', '🃏', 'Wild', '#0055ff', 3),
    S('scatter', '🎁', 'Scatter', '#38bdf8', 2),
  ],
  paytable: {
    ball: { 3: 3, 4: 8, 5: 22 }, jersey: { 3: 4, 4: 11, 5: 30 },
    hoop: { 3: 5, 4: 14, 5: 40 }, sneaker: { 3: 7, 4: 19, 5: 55 },
    flag: { 3: 9, 4: 26, 5: 80 }, star: { 3: 13, 4: 38, 5: 125 },
    coin: { 3: 22, 4: 68, 5: 230 }, wild: { 3: 45, 4: 140, 5: 480 },
    scatter: { 3: 4, 4: 16, 5: 80 },
  },
  mechanics: ['stackedWild', 'stickyWild', 'multiplierLadder', 'cascade', 'bonus'],
  payoutScale: 0.0035,
  volatility: 'High', rtp: '~95%', unlockLevel: 8,
});
