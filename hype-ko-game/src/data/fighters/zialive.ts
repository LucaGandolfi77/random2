import { explosionSpecial, projectileSpecial, superProjectile } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterZiaLive = defineFighter({
  id: 'zialive',
  name: 'ZIA LIVE',
  subtitle: 'The Kitchen Boss',
  archetype: 'Grappler / zoning',
  edition: 'italian',
  bio: 'Cucina per due milioni di persone e ti fa il bis anche se non hai fame. Il mestolo non torna mai indietro: torna con gli interessi.',
  stats: { power: 4, speed: 2, range: 3, technique: 3, defense: 4 },
  height: 0.94,
  weight: 1.16,
  appearance: {
    skin: '#d8a27e',
    hairColor: '#d9d9e8',
    hairStyle: 'bun',
    outfitStyle: 'apron',
    primary: '#ff8c42',
    secondary: '#ffe3c2',
    accent: '#e63946',
    shoes: '#5c3b2e',
    aura: '#ff8c42',
    accessories: ['ladle', 'gloves', 'earpiece'],
    height: 0.94,
    build: 1.16,
    headScale: 1.02,
    face: 'kind',
    eyeColor: '#5a3524',
    pattern: 'checker'
  },
  ai: { aggression: 0.55, defense: 0.65, combo: 0.35, special: 0.7 },
  rivalries: ['thebrand'],
  quotes: {
    intro: 'Mangia qualcosa prima di piangere.',
    victory: 'La ricetta è segreta. La sconfitta no.',
    defeat: 'Ti mando comunque un vassoio. Non si butta via niente.'
  },
  victoryTitle: 'CUCINA DI FERRO',
  musicMotif: 'kitchen',
  special1: projectileSpecial(
    'mestolo_boomerang',
    'Mestolo Boomerang',
    {
      speed: 0.13,
      damage: 66,
      hitstun: 20,
      blockstun: 12,
      hitstop: 6,
      radius: 0.34,
      life: 150,
      returning: true,
      vfx: 'ladle',
      color: '#ff8c42'
    },
    { vfx: 'ladleToss' }
  ),
  special2: explosionSpecial('friggitrice_turbo', 'Friggitrice Turbo', 88, 2.6, 22, true, {
    vfx: 'oilSplash'
  }),
  superMove: superProjectile('tiramisu_tsunami', 'TIRAMISÙ TSUNAMI', {
    speed: 0.12,
    damage: 226,
    hitstun: 30,
    blockstun: 16,
    hitstop: 10,
    radius: 0.62,
    life: 160,
    vfx: 'tiramisu',
    color: '#ffe3c2'
  }),
  finisherName: "Tiramisù dell'Apocalisse",
  hypeName: 'BOLLITORE BREAKER'
});
