import { makeMachine, S } from './build.js';

export default makeMachine({
  id: 'sugar-rush',
  name: 'Sugar Rush',
  tagline: 'Six reels, five rows, no paylines. Connect clusters and watch them upgrade.',
  motif: '🍬', theme: 'candy', reels: 6, rows: 5,
  payMode: 'cluster',
  symbols: [
    S('candy', '🍬', 'Candy', '#ff7ac6', 18), S('lollipop', '🍭', 'Lollipop', '#ffe066', 16),
    S('donut', '🍩', 'Donut', '#ff9f1c', 14), S('icecream', '🍦', 'Ice Cream', '#7dd3fc', 12),
    S('gummy', '🧸', 'Gummy', '#ff5ec4', 10), S('chocolate', '🍫', 'Chocolate', '#b15cff', 8),
    S('wild', '🃏', 'Wild', '#ff4d6d', 3), S('scatter', '🎁', 'Scatter', '#38bdf8', 2),
  ],
  clusterTable: {
    candy: { 5: 2, 6: 4, 7: 8, 8: 14, 9: 66, 10: 140 },
    lollipop: { 5: 3, 6: 6, 7: 11, 8: 19, 9: 90, 10: 190 },
    donut: { 5: 4, 6: 8, 7: 15, 8: 26, 9: 126, 10: 280 },
    icecream: { 5: 5, 6: 10, 7: 21, 8: 36, 9: 180, 10: 400 },
    gummy: { 5: 6, 6: 14, 7: 29, 8: 50, 9: 255, 10: 560 },
    chocolate: { 5: 9, 6: 21, 7: 45, 8: 80, 9: 420, 10: 920 },
    wild: { 5: 15, 6: 35, 7: 75, 8: 135, 9: 690, 10: 1500 },
    scatter: {},
  },
  paytable: {},
  mechanics: ['cluster', 'symbolUpgrade', 'cascade', 'bonus'],
  payoutScale: 0.34,
  bonus: { picks: 3, pool: [80, 120, 200, 'FREE', 'MINI'] },
  volatility: 'High', rtp: '~90%', unlockLevel: 4,
});
