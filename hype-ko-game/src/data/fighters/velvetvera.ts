import { buffSpecial, flashSpecial, superMelee } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterVelvetVera = defineFighter({
  id: 'velvetvera',
  name: 'VELVET VERA',
  subtitle: 'The Pop Empress',
  archetype: 'Rushdown / flash',
  edition: 'italian',
  bio: 'Cambia outfit più velocemente di quanto tu possa dire “scusa?”. Ogni flash è un primo piano.',
  stats: { power: 3, speed: 4, range: 3, technique: 4, defense: 2 },
  height: 0.98,
  weight: 0.9,
  appearance: {
    skin: '#e6b7a2',
    hairColor: '#f2b6d8',
    hairStyle: 'wavy',
    outfitStyle: 'gown',
    primary: '#ff4fa3',
    secondary: '#f8e9ff',
    accent: '#ffd166',
    shoes: '#ff4fa3',
    aura: '#ff4fa3',
    accessories: ['tiara', 'gloves', 'mic', 'crown'],
    height: 0.98,
    build: 0.9,
    headScale: 0.97,
    face: 'glam',
    eyeColor: '#5a2a55',
    lipColor: '#ff2e88',
    pattern: 'glitter'
  },
  ai: { aggression: 0.78, defense: 0.4, combo: 0.72, special: 0.6 },
  rivalries: ['nocturna'],
  quotes: {
    intro: 'Sorridi. Sei nel mio servizio fotografico.',
    victory: 'Il pubblico ha già scelto. Tu eri solo il prima e dopo.',
    defeat: 'Brutto. Ma almeno sei virale.'
  },
  victoryTitle: 'PRIMA PAGINA',
  musicMotif: 'pop',
  special1: flashSpecial('flash_attack', 'Flash Attack', 3.8, 36, {
    damage: 24,
    startup: 12,
    vfx: 'cameraFlash'
  }),
  special2: buffSpecial(
    'outfit_switch',
    'Outfit Switch',
    { damage: 1.22, speed: 1.12, defense: 0.9, duration: 360, heal: 70 },
    { vfx: 'outfitChange' }
  ),
  superMove: superMelee('velvet_overload', 'VELVET OVERLOAD', 232, {
    vfx: 'velvet',
    active: 16,
    hitbox: { x: 0.25, y: 0.55, w: 1.8, h: 1.5 }
  }),
  finisherName: "Cambio d'Outfit",
  hypeName: 'BACKSTAGE BREAKER'
});
