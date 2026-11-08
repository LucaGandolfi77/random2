import { projectileSpecial, superMelee, uppercutSpecial } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterReinaRitmo = defineFighter({
  id: 'reinari',
  name: 'REINA RITMO',
  subtitle: 'The Latin Queen',
  archetype: 'Rushdown / rhythm',
  edition: 'international',
  bio: 'Ha venduto i biglietti del tuo funerale artistico prima ancora che annunciassi il tour. Il ritmo non lo segue: lo detta.',
  stats: { power: 4, speed: 4, range: 3, technique: 4, defense: 3 },
  height: 0.97,
  weight: 0.92,
  appearance: {
    skin: '#c98a63',
    hairColor: '#2a1414',
    hairStyle: 'curly',
    outfitStyle: 'dress',
    primary: '#e63946',
    secondary: '#ffd166',
    accent: '#ff8c42',
    shoes: '#e63946',
    aura: '#ffd166',
    accessories: ['mic', 'crown', 'gloves'],
    height: 0.97,
    build: 0.94,
    headScale: 0.98,
    face: 'glam',
    eyeColor: '#2a1414',
    lipColor: '#e63946',
    pattern: 'glitter'
  },
  ai: { aggression: 0.8, defense: 0.45, combo: 0.8, special: 0.65 },
  rivalries: ['808nero'],
  quotes: {
    intro: 'Tesoro, io ho già venduto i biglietti.',
    victory: 'Encore! Il pubblico vuole un’altra sconfitta.',
    defeat: 'Va bene. La prossima volta canto in playback.'
  },
  victoryTitle: 'ENCORE',
  musicMotif: 'latin',
  special1: projectileSpecial(
    'clave_cyclone',
    'Clave Cyclone',
    {
      speed: 0.13,
      damage: 64,
      hitstun: 20,
      blockstun: 12,
      hitstop: 6,
      radius: 0.34,
      life: 150,
      returning: true,
      vfx: 'clave',
      color: '#ffd166'
    },
    { vfx: 'claveSpin' }
  ),
  special2: uppercutSpecial('tacon_strike', 'Tacón Strike', {
    damage: 84,
    startup: 6,
    vfx: 'heelKick'
  }),
  superMove: superMelee('encore_infinito', 'ENCORE INFINITO', 234, {
    vfx: 'encore',
    active: 17,
    hitbox: { x: 0.25, y: 0.5, w: 1.85, h: 1.55 }
  }),
  finisherName: 'Encore Infinito',
  hypeName: 'RITMO BREAKER'
});
