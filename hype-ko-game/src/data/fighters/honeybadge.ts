import { pullSpecial, shockwaveSpecial, superMelee } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterHoneyBadge = defineFighter({
  id: 'honeybadge',
  name: 'HONEY BADGE',
  subtitle: 'The Rodeo Star',
  archetype: 'Balanced / pull',
  edition: 'international',
  bio: 'Ha domato un algoritmo con un lazo e una nota sola. Il suo cavallo è immaginario, il rodeo è reale, il pubblico è in lacrime.',
  stats: { power: 3, speed: 4, range: 4, technique: 3, defense: 3 },
  height: 1.02,
  weight: 1.05,
  appearance: {
    skin: '#d9a06f',
    hairColor: '#e8c26a',
    hairStyle: 'cowboy',
    outfitStyle: 'jacket',
    primary: '#b5651d',
    secondary: '#f4e3c1',
    accent: '#ffd166',
    shoes: '#5a3a22',
    aura: '#ffd166',
    accessories: ['cowboyHat', 'boots', 'mic', 'sash'],
    height: 1.02,
    build: 1.03,
    headScale: 0.98,
    face: 'wild',
    eyeColor: '#4a2f1b',
    pattern: 'stars'
  },
  ai: { aggression: 0.68, defense: 0.5, combo: 0.55, special: 0.6 },
  rivalries: [],
  quotes: {
    intro: 'Questo rodeo ha una sola regola: non mi prendere il microfono.',
    victory: 'Yeehaw. E anche un po’ yikes.',
    defeat: 'Il cavallo era immaginario. La sconfitta no.'
  },
  victoryTitle: 'RODEO STAR',
  musicMotif: 'country',
  special1: pullSpecial('lasso_mic', 'Lasso Mic', 3.1, {
    damage: 56,
    startup: 13,
    vfx: 'lasso',
    hitstun: 24
  }),
  special2: shockwaveSpecial('boot_stomp', 'Boot Stomp', 2.9, {
    damage: 78,
    startup: 20,
    vfx: 'stomp'
  }),
  superMove: superMelee('rodeo_secolo', 'RODEO DEL SECOLO', 228, {
    vfx: 'rodeo',
    active: 16,
    hitbox: { x: 0.2, y: 0.5, w: 1.8, h: 1.55 }
  }),
  finisherName: 'Rodeo del Secolo',
  hypeName: 'YEEHAW BREAKER'
});
