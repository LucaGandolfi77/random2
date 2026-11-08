import { shockwaveSpecial, superProjectile, uppercutSpecial } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighter808Nero = defineFighter({
  id: '808nero',
  name: '808 NERO',
  subtitle: 'The Trap King',
  archetype: 'Trap / pressure',
  edition: 'italian',
  bio: 'Ha trasformato il rumore del traffico in hit. Ora vuole trasformare la classifica in un monolocale con vista.',
  stats: { power: 4, speed: 4, range: 2, technique: 3, defense: 3 },
  height: 1.02,
  weight: 1.05,
  appearance: {
    skin: '#7a4a32',
    hairColor: '#101010',
    hairStyle: 'buzz',
    outfitStyle: 'jacket',
    primary: '#17121f',
    secondary: '#2d1a4d',
    accent: '#b14cff',
    shoes: '#f4f4f4',
    aura: '#b14cff',
    accessories: ['chain', 'headphones', 'sunglasses', 'gloves'],
    height: 1.02,
    build: 1.06,
    headScale: 0.95,
    face: 'cool',
    eyeColor: '#f0e9ff',
    pattern: 'stripes'
  },
  ai: { aggression: 0.72, defense: 0.45, combo: 0.7, special: 0.55 },
  rivalries: ['reinari'],
  quotes: {
    intro: 'Questa arena è mia.',
    victory: 'Il platino non si vende: si impone.',
    defeat: 'Hai remixato la mia sconfitta. Rispetto.'
  },
  victoryTitle: 'PLATINO',
  musicMotif: '808',
  special1: uppercutSpecial('808_uppercut', '808 Uppercut', {
    damage: 90,
    vfx: 'bassUppercut',
    sfx: 'special'
  }),
  special2: shockwaveSpecial('drop_sismico', 'Drop Sismico', 3.2, {
    damage: 78,
    startup: 20,
    vfx: 'quake'
  }),
  superMove: superProjectile('bass_cannon', 'BASS CANNON', {
    speed: 0.16,
    damage: 220,
    hitstun: 30,
    blockstun: 16,
    hitstop: 10,
    radius: 0.5,
    life: 140,
    vfx: 'bassWave',
    color: '#b14cff'
  }),
  finisherName: 'Disco di Platino',
  hypeName: '808 BREAKER'
});
