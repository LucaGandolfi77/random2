import { counterSpecial, rainSpecial, superRain } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterNpc404 = defineFighter({
  id: 'npc404',
  name: 'NPC 404',
  subtitle: 'The Background Legend',
  archetype: 'Trickster / counter',
  edition: 'international',
  bio: 'Era il tizio sullo sfondo di ogni stream. Poi lo sfondo è diventato il main event. Non ha una personalità: ha un loop.',
  stats: { power: 2, speed: 3, range: 4, technique: 5, defense: 3 },
  height: 1.0,
  weight: 0.95,
  appearance: {
    skin: '#d4c7b8',
    hairColor: '#5a5a66',
    hairStyle: 'hood',
    outfitStyle: 'hoodie',
    primary: '#6b7280',
    secondary: '#d1d5db',
    accent: '#22d3ee',
    shoes: '#374151',
    aura: '#22d3ee',
    accessories: ['visor', 'headphones', 'phone'],
    height: 1.0,
    build: 0.95,
    headScale: 1.0,
    face: 'goofy',
    eyeColor: '#22d3ee',
    pattern: 'glow'
  },
  ai: { aggression: 0.5, defense: 0.7, combo: 0.45, special: 0.85 },
  rivalries: ['commentina'],
  quotes: {
    intro: 'Ciao. Sì, sono quello sullo sfondo. No, non è uno scherzo.',
    victory: 'Il loop è finito. Tu invece sei ancora in caricamento.',
    defeat: 'Riprovo. Questa volta con più dialoghi.'
  },
  victoryTitle: 'MAIN EVENT',
  musicMotif: 'stream',
  special1: rainSpecial(
    'emote_loop',
    'Emote Loop',
    {
      speed: 0,
      damage: 18,
      hitstun: 14,
      blockstun: 7,
      hitstop: 3,
      radius: 0.28,
      life: 220,
      vfx: 'emote',
      color: '#22d3ee'
    },
    { count: 6, spread: 0.55, delay: 5 },
    { vfx: 'emoteRain' }
  ),
  special2: counterSpecial('dialogue_tree', 'Dialogue Tree', 24, 88, {
    vfx: 'dialogue',
    hitstun: 26
  }),
  superMove: superRain(
    'riavvio_server',
    'RIAVVIO SERVER',
    {
      speed: 0,
      damage: 29,
      hitstun: 17,
      blockstun: 9,
      hitstop: 4,
      radius: 0.3,
      life: 240,
      vfx: 'server',
      color: '#22d3ee'
    },
    12,
    0.5,
    { vfx: 'serverRestart' }
  ),
  finisherName: 'Riavvio Server',
  hypeName: 'LAG BREAKER'
});
