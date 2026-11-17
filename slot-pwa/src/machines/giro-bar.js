import { makeMachine, S, LINES_5X3_25 } from './build.js';

export default makeMachine({
  id: 'giro-bar',
  name: 'Giro dei Bar',
  tagline: 'A night pub crawl on the reels. Pick your stop, double your tab.',
  motif: '🚲', theme: 'girobar', reels: 5, rows: 3,
  paylines: LINES_5X3_25,
  lineOptions: [5, 10, 20, 25],
  symbols: [
    S('beer', '🍺', 'Beer', '#ffd166', 20), S('ticket', '🎟️', 'Ticket', '#ff7043', 17),
    S('sign', '🪧', 'Sign', '#ff9f1c', 15), S('map', '🗺️', 'Map', '#84cc16', 12),
    S('bike', '🚲', 'Bike', '#00e5ff', 10), S('bell', '🔔', 'Bell', '#ffe066', 8),
    S('star', '⭐', 'Star', '#fff3a0', 6), S('coin', '💰', 'Cash', '#7cffb2', 4),
    S('wild', '🃏', 'Wild', '#ff5ec4', 3), S('scatter', '🎁', 'Scatter', '#38bdf8', 2),
  ],
  paytable: {
    beer: { 3: 4, 4: 11, 5: 28 }, ticket: { 3: 5, 4: 14, 5: 38 },
    sign: { 3: 7, 4: 19, 5: 52 }, map: { 3: 9, 4: 25, 5: 70 },
    bike: { 3: 12, 4: 34, 5: 100 }, bell: { 3: 16, 4: 46, 5: 145 },
    star: { 3: 22, 4: 66, 5: 210 }, coin: { 3: 34, 4: 105, 5: 360 },
    wild: { 3: 80, 4: 250, 5: 900 }, scatter: { 3: 4, 4: 16, 5: 80 },
  },
  bonus: { picks: 3, pool: [300, 600, 1200, 'FREE', 'MINI', 'MINOR'] },
  mechanics: ['bonus', 'gamble', 'bonusBuy', 'jackpotWheel'],
  payoutScale: 0.52,
  volatility: 'High', rtp: '~95%', unlockLevel: 1,
});
