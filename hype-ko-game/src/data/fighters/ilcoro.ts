import { shockwaveSpecial, superMelee, whipSpecial } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterIlCoro = defineFighter({
  id: 'ilcoro',
  name: 'IL CORO',
  subtitle: 'The Stadium Beast',
  archetype: 'Heavy / crowd control',
  edition: 'italian',
  bio: 'Non è una persona: è un intero settore che ha imparato a camminare. Quando canta, il pubblico risponde. Quando colpisce, il pubblico esulta.',
  stats: { power: 4, speed: 3, range: 2, technique: 2, defense: 5 },
  height: 1.08,
  weight: 1.22,
  appearance: {
    skin: '#b97f5c',
    hairColor: '#1e1a1a',
    hairStyle: 'short',
    outfitStyle: 'jersey',
    primary: '#00b894',
    secondary: '#f6f1e7',
    accent: '#ffb703',
    shoes: '#1e1a1a',
    aura: '#00b894',
    accessories: ['scarf', 'cap', 'flag', 'armband'],
    height: 1.08,
    build: 1.22,
    headScale: 0.96,
    face: 'wild',
    eyeColor: '#2d2018',
    pattern: 'stripes'
  },
  ai: { aggression: 0.66, defense: 0.7, combo: 0.3, special: 0.5 },
  rivalries: ['cuorestorto'],
  quotes: {
    intro: 'Tutto lo stadio è con me. Anche chi non lo sa.',
    victory: 'Ola. Onda. Onda d’urto. Chiamala come vuoi.',
    defeat: 'Il coro ha stonato. Ma il prossimo giro è nostro.'
  },
  victoryTitle: 'TUTTI IN PIEDI',
  musicMotif: 'stadium',
  special1: shockwaveSpecial('ola_urto', "Ola d'Urto", 3.5, {
    damage: 80,
    startup: 22,
    vfx: 'crowdWave'
  }),
  special2: whipSpecial('sciarpa_frusta', 'Sciarpa a Frusta', 2.7, {
    damage: 62,
    vfx: 'scarfWhip',
    hitstun: 20
  }),
  superMove: superMelee('tutti_in_piedi', 'TUTTI IN PIEDI', 242, {
    vfx: 'stadiumWave',
    active: 18,
    hitbox: { x: 0.2, y: 0.45, w: 1.9, h: 1.6 }
  }),
  finisherName: 'Tutti in Piedi',
  hypeName: 'CORO BREAKER'
});
