import { makeMachine, S } from './build.js';

export default makeMachine({
  id: 'agente',
  name: 'Giardino Agente Zero',
  tagline: 'Agent Zero in the secret garden. Mystery blooms and climbing clusters.',
  motif: '🕵️', theme: 'agente', reels: 6, rows: 5,
  payMode: 'cluster',
  symbols: [
    S('leaf', '🍃', 'Leaf', '#84cc16', 18), S('flower', '🌸', 'Flower', '#ff7ac6', 16),
    S('lens', '🔍', 'Lens', '#39ff9e', 13), S('camera', '📷', 'Camera', '#5ec8ff', 11),
    S('key', '🗝️', 'Key', '#ffd166', 9), S('mask', '🎭', 'Mask', '#b78cff', 7),
    S('mystery', '❓', 'Mystery', '#fff6c0', 4), S('wild', '🃏', 'Wild', '#ff4d6d', 3),
    S('scatter', '🎁', 'Scatter', '#38bdf8', 2),
  ],
  clusterTable: {
    leaf: { 5: 2, 6: 4, 7: 8, 8: 15, 9: 26, 10: 45 },
    flower: { 5: 3, 6: 6, 7: 12, 8: 22, 9: 38, 10: 65 },
    lens: { 5: 4, 6: 9, 7: 18, 8: 33, 9: 58, 10: 100 },
    camera: { 5: 6, 6: 13, 7: 27, 8: 50, 9: 90, 10: 155 },
    key: { 5: 8, 6: 18, 7: 38, 8: 70, 9: 125, 10: 215 },
    mask: { 5: 12, 6: 28, 7: 58, 8: 110, 9: 195, 10: 340 },
    wild: { 5: 20, 6: 46, 7: 95, 8: 180, 9: 320, 10: 560 },
    scatter: {},
  },
  paytable: {},
  mystery: 'mystery',
  mechanics: ['mystery', 'symbolUpgrade', 'cascade', 'bonus'],
  payoutScale: 0.055,
  bonus: { picks: 3, pool: [120, 200, 350, 'FREE'] },
  volatility: 'High', rtp: '~95%', unlockLevel: 10,
});
