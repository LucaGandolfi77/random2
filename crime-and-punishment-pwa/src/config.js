const CONFIG = {
  canvas: { width: 800, height: 600 },
  language: 'en',
  themes: {
    en: { conscienceLabel: 'Conscience', guiltLabel: 'Guilt', hopeLabel: 'Hope' },
    it: { conscienceLabel: 'Coscienza', guiltLabel: 'Colpa', hopeLabel: 'Speranza' }
  },
  sceneDurations: {
    intro: 6000,
    murder: 8000,
    confrontation: 7000,
    prison: 9000,
    redemption: 10000
  },
  audio: { masterVolume: 0.6, musicVolume: 0.3 }
};
export default CONFIG;