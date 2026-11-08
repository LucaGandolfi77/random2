import { pianoSpecial, superRain, zoneSpecial } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterTastieraNera = defineFighter({
  id: 'tastieranera',
  name: 'TASTIERA NERA',
  subtitle: 'The Pianist',
  archetype: 'Zoner / setup',
  edition: 'italian',
  bio: 'Suona 88 tasti e 404 problemi. Il suo pedale del sustain tiene in ostaggio l’intera arena.',
  stats: { power: 2, speed: 2, range: 5, technique: 5, defense: 2 },
  height: 1.0,
  weight: 0.95,
  appearance: {
    skin: '#d9b39a',
    hairColor: '#1a1a1a',
    hairStyle: 'long',
    outfitStyle: 'suit',
    primary: '#0b0b12',
    secondary: '#e8e8f0',
    accent: '#54e6ff',
    shoes: '#121218',
    aura: '#54e6ff',
    accessories: ['gloves', 'visor', 'earpiece'],
    height: 1.0,
    build: 0.92,
    headScale: 1.02,
    face: 'cool',
    eyeColor: '#54e6ff',
    pattern: 'solid'
  },
  ai: { aggression: 0.35, defense: 0.55, combo: 0.45, special: 0.8 },
  rivalries: ['glitchetta'],
  quotes: {
    intro: 'Silenzio. Sto calibrando il destino in 4/4.',
    victory: 'Questa era una composizione in tre atti. Ne avete ascoltato solo l’ultimo.',
    defeat: 'Stonato. Ma tecnicamente interessante.'
  },
  victoryTitle: 'MAESTRO',
  musicMotif: 'piano',
  special1: pianoSpecial(
    'piano_molla',
    'Piano a Molla',
    {
      speed: 0,
      damage: 72,
      hitstun: 22,
      blockstun: 14,
      hitstop: 8,
      radius: 0.5,
      life: 180,
      vfx: 'piano',
      color: '#e8e8f0'
    },
    { damage: 72, vfx: 'piano' }
  ),
  special2: zoneSpecial(
    'pedal_loop',
    'Pedal Loop',
    {
      duration: 200,
      tickDamage: 17,
      interval: 32,
      radius: 1.7,
      vfx: 'soundLoop',
      color: '#54e6ff'
    },
    { vfx: 'soundLoop' }
  ),
  superMove: superRain(
    'concerto_404',
    'CONCERTO IN 404',
    {
      speed: 0,
      damage: 30,
      hitstun: 18,
      blockstun: 10,
      hitstop: 4,
      radius: 0.34,
      life: 220,
      vfx: 'note',
      color: '#54e6ff'
    },
    10,
    0.62,
    { vfx: 'superPiano' }
  ),
  finisherName: 'Concerto in 404',
  hypeName: 'SOSTENUTO BREAKER'
});
