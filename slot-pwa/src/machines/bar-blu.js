import { makeMachine, S, LINES_5X3 } from './build.js';

export default makeMachine({
  id: 'bar-blu',
  name: 'Bar Blu di Luca Zheng',
  tagline: 'The bluest bar in town. Neon drinks, sticky ice and a taxi-home jackpot.',
  motif: '🍸', theme: 'barblue', reels: 5, rows: 3,
  paylines: LINES_5X3,
  symbols: [
    S('olive', '🫒', 'Olive', '#a3e635', 20), S('ice', '🧊', 'Ice', '#7ce0ff', 18),
    S('lemon', '🍋', 'Lemon', '#ffe14d', 16), S('drink', '🍸', 'Cocktail', '#3fa9ff', 14),
    S('bottle', '🍾', 'Bottle', '#4ade80', 11), S('neon', '💡', 'Neon', '#ff5ec4', 8),
    S('star', '⭐', 'Star', '#ffe066', 6), S('coin', '💰', 'Tips', '#7cffb2', 4),
    S('wild', '🃏', 'Wild', '#ff4d6d', 3), S('scatter', '🎁', 'Scatter', '#38bdf8', 2),
  ],
  paytable: {
    olive: { 3: 4, 4: 10, 5: 26 }, ice: { 3: 5, 4: 13, 5: 34 },
    lemon: { 3: 6, 4: 16, 5: 44 }, drink: { 3: 9, 4: 26, 5: 75 },
    bottle: { 3: 13, 4: 38, 5: 115 }, neon: { 3: 18, 4: 55, 5: 170 },
    star: { 3: 25, 4: 78, 5: 240 }, coin: { 3: 38, 4: 120, 5: 400 },
    wild: { 3: 90, 4: 280, 5: 950 }, scatter: { 3: 4, 4: 16, 5: 80 },
  },
  mechanics: ['cascade', 'bonus', 'jackpotWheel'],
  payoutScale: 0.5,
  volatility: 'Medium', rtp: '~95%', unlockLevel: 1,
});
