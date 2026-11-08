import { rainSpecial, superRain, teleportSpecial } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterNocturna = defineFighter({
  id: 'nocturna',
  name: 'NOCTURNA',
  subtitle: 'The Dark Star',
  archetype: 'Zoner / darkness',
  edition: 'international',
  bio: 'Canta in una lingua che nessuno conosce e che tutti ricorderanno. Quando spegne le luci, il pubblico applaude per non sparire.',
  stats: { power: 2, speed: 3, range: 5, technique: 4, defense: 3 },
  height: 1.02,
  weight: 0.95,
  appearance: {
    skin: '#d9c7cf',
    hairColor: '#0b0b0f',
    hairStyle: 'long',
    outfitStyle: 'gown',
    primary: '#15101d',
    secondary: '#6e5cff',
    accent: '#c7a8ff',
    shoes: '#15101d',
    aura: '#6e5cff',
    accessories: ['horns', 'cape', 'gloves', 'choker'],
    height: 1.02,
    build: 0.94,
    headScale: 1.0,
    face: 'dark',
    eyeColor: '#c7a8ff',
    lipColor: '#4b1d3b',
    pattern: 'glow'
  },
  ai: { aggression: 0.42, defense: 0.6, combo: 0.5, special: 0.8 },
  rivalries: ['velvetvera'],
  quotes: {
    intro: 'Non temere il buio. Temi chi lo accende.',
    victory: 'Lights out. Applausi in silenzio.',
    defeat: 'La luce ha vinto. Per ora.'
  },
  victoryTitle: 'DARK STAR',
  musicMotif: 'darkpop',
  special1: rainSpecial(
    'shadow_chorus',
    'Shadow Chorus',
    {
      speed: 0,
      damage: 24,
      hitstun: 16,
      blockstun: 8,
      hitstop: 3,
      radius: 0.3,
      life: 240,
      vfx: 'shadowNote',
      color: '#6e5cff'
    },
    { count: 6, spread: 0.6, delay: 4 },
    { vfx: 'shadowChorus' }
  ),
  special2: teleportSpecial('blackout', 'Blackout', 1.4, true, {
    damage: 78,
    startup: 11,
    vfx: 'blackout'
  }),
  superMove: superRain(
    'lights_out_super',
    'LIGHTS OUT',
    {
      speed: 0,
      damage: 31,
      hitstun: 18,
      blockstun: 10,
      hitstop: 4,
      radius: 0.32,
      life: 240,
      vfx: 'darkStar',
      color: '#6e5cff'
    },
    10,
    0.58,
    { vfx: 'lightsOut' }
  ),
  finisherName: 'Lights Out',
  hypeName: 'ECLIPSE BREAKER'
});
