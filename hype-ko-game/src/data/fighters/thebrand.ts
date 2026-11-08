import { projectileSpecial, superProjectile, zoneSpecial } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterTheBrand = defineFighter({
  id: 'thebrand',
  name: 'THE BRAND',
  subtitle: 'The Walking Advertisement',
  archetype: 'Zoner / corporate',
  edition: 'international',
  bio: 'Non ha un nome: ha un posizionamento. Non ha un cuore: ha un reparto marketing. Il suo prodotto è la tua attenzione.',
  stats: { power: 3, speed: 3, range: 5, technique: 4, defense: 3 },
  height: 1.03,
  weight: 1.0,
  appearance: {
    skin: '#e0b9a0',
    hairColor: '#161616',
    hairStyle: 'short',
    outfitStyle: 'suit',
    primary: '#f2f2f2',
    secondary: '#111111',
    accent: '#ffd166',
    shoes: '#111111',
    aura: '#ffd166',
    accessories: ['sunglasses', 'earpiece', 'bag', 'stopwatch'],
    height: 1.03,
    build: 1.0,
    headScale: 0.96,
    face: 'smug',
    eyeColor: '#111111',
    pattern: 'solid'
  },
  ai: { aggression: 0.55, defense: 0.6, combo: 0.5, special: 0.75 },
  rivalries: ['zialive'],
  quotes: {
    intro: 'Questo combattimento è offerto da me. Prego.',
    victory: 'La sconfitta è stata un’opportunità di crescita per te.',
    defeat: 'Ricalibro il messaggio. Il prodotto resta.'
  },
  victoryTitle: 'MARKET FIT',
  musicMotif: 'corporate',
  special1: projectileSpecial(
    'sponsored_attack',
    'Sponsored Attack',
    {
      speed: 0.11,
      damage: 28,
      hitstun: 15,
      blockstun: 8,
      hitstop: 3,
      radius: 0.28,
      life: 160,
      count: 3,
      spread: 0.5,
      vfx: 'product',
      color: '#ffd166'
    },
    { vfx: 'sponsored' }
  ),
  special2: zoneSpecial(
    'product_placement',
    'Product Placement',
    {
      duration: 210,
      tickDamage: 16,
      interval: 28,
      radius: 1.8,
      vfx: 'billboard',
      color: '#ffd166'
    },
    { vfx: 'placement' }
  ),
  superMove: superProjectile('unboxing_super', 'UNBOXING', {
    speed: 0.1,
    damage: 224,
    hitstun: 30,
    blockstun: 16,
    hitstop: 10,
    radius: 0.6,
    life: 160,
    vfx: 'giantBox',
    color: '#ffd166'
  }),
  finisherName: 'Unboxing',
  hypeName: 'ENGAGEMENT BREAKER'
});
