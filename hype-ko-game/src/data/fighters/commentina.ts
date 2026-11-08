import { rainSpecial, superRain, zoneSpecial } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterCommentina = defineFighter({
  id: 'commentina',
  name: 'COMMENTINA',
  subtitle: 'The Ratio Queen',
  archetype: 'Zoner / pressure',
  edition: 'italian',
  bio: 'Ha inventato il commento fissato come arma di distruzione di massa. Il suo ratio personale è 1:999999.',
  stats: { power: 2, speed: 4, range: 5, technique: 4, defense: 2 },
  height: 0.95,
  weight: 0.85,
  appearance: {
    skin: '#e8bda6',
    hairColor: '#3b1f2b',
    hairStyle: 'ponytail',
    outfitStyle: 'tee',
    primary: '#ff5c8a',
    secondary: '#fff3f8',
    accent: '#8a4fff',
    shoes: '#ffffff',
    aura: '#ff5c8a',
    accessories: ['phone', 'ringLight', 'sunglasses', 'boots'],
    height: 0.95,
    build: 0.86,
    headScale: 1.0,
    face: 'smug',
    eyeColor: '#3b1f2b',
    lipColor: '#ff2e63',
    pattern: 'stars'
  },
  ai: { aggression: 0.68, defense: 0.35, combo: 0.6, special: 0.75 },
  rivalries: ['npc404'],
  quotes: {
    intro: 'Ti ho già commentato la sconfitta. Manca solo il like.',
    victory: 'Ratio 1:999999. Il resto è rumore.',
    defeat: 'Ti blocco. Non per rabbia. Per algoritmo.'
  },
  victoryTitle: 'RATIO QUEEN',
  musicMotif: 'tiktok',
  special1: rainSpecial(
    'reaction_stack',
    'Reaction Stack',
    {
      speed: 0,
      damage: 19,
      hitstun: 14,
      blockstun: 7,
      hitstop: 3,
      radius: 0.28,
      life: 220,
      vfx: 'emoji',
      color: '#ff5c8a'
    },
    { count: 8, spread: 0.42, delay: 3 },
    { vfx: 'reactions' }
  ),
  special2: zoneSpecial(
    'commento_fissato',
    'Commento Fissato',
    {
      duration: 180,
      tickDamage: 15,
      interval: 26,
      radius: 1.5,
      vfx: 'pinned',
      color: '#8a4fff'
    },
    { vfx: 'pinnedComment' }
  ),
  superMove: superRain(
    'viral_spike',
    'VIRAL SPIKE',
    {
      speed: 0,
      damage: 28,
      hitstun: 16,
      blockstun: 9,
      hitstop: 4,
      radius: 0.3,
      life: 240,
      vfx: 'heart',
      color: '#ff5c8a'
    },
    12,
    0.48,
    { vfx: 'viral' }
  ),
  finisherName: 'Ratio 1:999999',
  hypeName: 'TRENDING BREAKER'
});
