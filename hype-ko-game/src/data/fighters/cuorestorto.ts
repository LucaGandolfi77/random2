import { counterSpecial, rainSpecial, superMelee } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterCuoreStorto = defineFighter({
  id: 'cuorestorto',
  name: 'CUORE STORTO',
  subtitle: 'The Sadboy',
  archetype: 'Counter / zoning',
  edition: 'italian',
  bio: 'Scrive canzoni tristi in 12/8 e le trasforma in pioggia. Non ha mai risposto a un messaggio, ma ha risposto a tutti i danni.',
  stats: { power: 3, speed: 2, range: 4, technique: 4, defense: 4 },
  height: 1.02,
  weight: 1.0,
  appearance: {
    skin: '#e9c7b2',
    hairColor: '#2b2330',
    hairStyle: 'hood',
    outfitStyle: 'hoodie',
    primary: '#3b3f57',
    secondary: '#a8b4d8',
    accent: '#8aa2ff',
    shoes: '#22242f',
    aura: '#8aa2ff',
    accessories: ['headphones', 'cap'],
    height: 1.02,
    build: 0.97,
    headScale: 1.0,
    face: 'sad',
    eyeColor: '#6e7ba8',
    pattern: 'solid'
  },
  ai: { aggression: 0.4, defense: 0.8, combo: 0.5, special: 0.65 },
  rivalries: ['ilcoro'],
  quotes: {
    intro: 'Non volevo combattere. Poi ho visto le notifiche.',
    victory: 'Non è una vittoria. È un testo incompiuto.',
    defeat: 'Va bene. Lo metto nella raccolta del 2029.'
  },
  victoryTitle: 'ULTIMO ACCESSO',
  musicMotif: 'indie',
  special1: rainSpecial(
    'pioggia_vocali',
    'Pioggia di Vocali',
    {
      speed: 0,
      damage: 23,
      hitstun: 16,
      blockstun: 8,
      hitstop: 3,
      radius: 0.3,
      life: 240,
      vfx: 'letter',
      color: '#8aa2ff'
    },
    { count: 6, spread: 0.55, delay: 4 },
    { vfx: 'vowelRain' }
  ),
  special2: counterSpecial('visualizzato', 'Visualizzato', 26, 96, {
    vfx: 'seen',
    hitstun: 28
  }),
  superMove: superMelee('ultimo_accesso_super', 'SAD WAVE', 214, {
    vfx: 'sadWave',
    active: 15,
    hitbox: { x: 0.2, y: 0.5, w: 1.7, h: 1.5 }
  }),
  finisherName: 'Ultimo Accesso',
  hypeName: 'CUORE IN FRANTUMI'
});
