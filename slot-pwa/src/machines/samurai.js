import { makeMachine, S, LINES_5X3 } from './build.js';

export default makeMachine({
  id: 'samurai',
  name: 'Samurai Spirit',
  tagline: 'A wild that marches across the reels. Buy the bonus or gamble your winnings.',
  motif: '⚔️', theme: 'samurai', reels: 5, rows: 3,
  paylines: LINES_5X3,
  lineOptions: [5, 10, 15, 20],
  symbols: [
    S('koi', '🐟', 'Koi', '#ff7ac6', 18), S('lantern', '🏮', 'Lantern', '#ff5252', 16),
    S('fan', '🪭', 'Fan', '#ffe066', 14), S('sword', '⚔️', 'Sword', '#e2e8f0', 11),
    S('armor', '🛡️', 'Armor', '#b78cff', 9), S('shrine', '⛩️', 'Shrine', '#ff9f1c', 6),
    S('oni', '👹', 'Oni', '#ff4d6d', 4), S('wild', '🃏', 'Wild', '#ffd34d', 3),
    S('scatter', '🎁', 'Scatter', '#38bdf8', 2),
  ],
  paytable: {
    koi: { 3: 3, 4: 9, 5: 24 }, lantern: { 3: 4, 4: 12, 5: 32 },
    fan: { 3: 6, 4: 16, 5: 44 }, sword: { 3: 9, 4: 25, 5: 70 },
    armor: { 3: 13, 4: 38, 5: 110 }, shrine: { 3: 20, 4: 60, 5: 190 },
    oni: { 3: 32, 4: 100, 5: 340 }, wild: { 3: 80, 4: 250, 5: 900 },
    scatter: { 3: 4, 4: 16, 5: 80 },
  },
  mechanics: ['shiftingWild', 'gamble', 'bonusBuy', 'cascade', 'bonus'],
  payoutScale: 0.17,
  volatility: 'High', rtp: '~89%', unlockLevel: 7,
});
