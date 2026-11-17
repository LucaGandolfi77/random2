import { makeMachine, S } from './build.js';

export default makeMachine({
  id: 'nebula',
  name: 'Nebula Nine',
  tagline: '243 ways across a four-row galaxy. Stacked wilds and rising multipliers.',
  motif: '🪐', theme: 'cosmic', reels: 5, rows: 4,
  payMode: 'ways',
  symbols: [
    S('moon', '🌙', 'Moon', '#e2e8f0', 16), S('star', '⭐', 'Star', '#ffe066', 15),
    S('comet', '☄️', 'Comet', '#ff9f1c', 13), S('planet', '🪐', 'Planet', '#b78cff', 11),
    S('rocket', '🚀', 'Rocket', '#ff5ec4', 9), S('ufo', '🛸', 'UFO', '#5ec8ff', 7),
    S('alien', '👽', 'Alien', '#4ade80', 5), S('wild', '🃏', 'Wild', '#ff4d6d', 3),
    S('scatter', '🎁', 'Scatter', '#38bdf8', 2),
  ],
  paytable: {
    moon: { 3: 2, 4: 6, 5: 16 }, star: { 3: 3, 4: 8, 5: 22 },
    comet: { 3: 4, 4: 11, 5: 30 }, planet: { 3: 6, 4: 16, 5: 45 },
    rocket: { 3: 9, 4: 26, 5: 75 }, ufo: { 3: 13, 4: 40, 5: 120 },
    alien: { 3: 22, 4: 70, 5: 220 }, wild: { 3: 40, 4: 130, 5: 420 },
    scatter: { 3: 3, 4: 12, 5: 60 },
  },
  mechanics: ['stackedWild', 'multiplierLadder', 'cascade', 'bonus'],
  payoutScale: 0.008,
  volatility: 'High', rtp: '~90%', unlockLevel: 3,
});
