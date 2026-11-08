import { superRain, teleportSpecial, zoneSpecial } from '../../game/combat/moves';
import { defineFighter } from './helpers';

export const fighterGlitchetta = defineFighter({
  id: 'glitchetta',
  name: 'GLITCHETTA',
  subtitle: 'The Digital Idol',
  archetype: 'Trickster / mixup',
  edition: 'international',
  bio: 'Esiste in tre versioni e nessuna è quella stabile. Il suo contratto è scritto in binario e scade ogni volta che la guardi.',
  stats: { power: 2, speed: 5, range: 4, technique: 5, defense: 2 },
  height: 0.96,
  weight: 0.85,
  appearance: {
    skin: '#e7c9d6',
    hairColor: '#9dffdf',
    hairStyle: 'ponytail',
    outfitStyle: 'corset',
    primary: '#0affc2',
    secondary: '#ff2ef5',
    accent: '#7a5cff',
    shoes: '#0affc2',
    aura: '#0affc2',
    accessories: ['visor', 'headphones', 'gloves', 'earpiece'],
    height: 0.96,
    build: 0.84,
    headScale: 1.0,
    face: 'robot',
    eyeColor: '#0affc2',
    pattern: 'glow'
  },
  ai: { aggression: 0.72, defense: 0.4, combo: 0.7, special: 0.8 },
  rivalries: ['tastieranera'],
  quotes: {
    intro: 'Caricamento personalità... 3%... abbastanza.',
    victory: 'Hai perso contro una versione beta. Pensa alla stable.',
    defeat: 'Bug riprodotto. Patch in arrivo.'
  },
  victoryTitle: 'BUILD STABILE',
  musicMotif: 'hyperpop',
  special1: teleportSpecial('teleport_glitch', 'Teleport Glitch', 1.2, true, {
    damage: 74,
    startup: 9,
    vfx: 'glitchBlink'
  }),
  special2: zoneSpecial(
    'buffer_overflow',
    'Buffer Overflow',
    {
      duration: 190,
      tickDamage: 14,
      interval: 24,
      radius: 1.9,
      vfx: 'glitchZone',
      color: '#0affc2'
    },
    { vfx: 'bufferOverflow' }
  ),
  superMove: superRain(
    'system_crash',
    'SYSTEM CRASH',
    {
      speed: 0,
      damage: 30,
      hitstun: 17,
      blockstun: 9,
      hitstop: 4,
      radius: 0.3,
      life: 240,
      vfx: 'pixel',
      color: '#0affc2'
    },
    11,
    0.55,
    { vfx: 'glitchSuper' }
  ),
  finisherName: '404 NOT FOUND',
  hypeName: 'GLITCH BREAKER'
});
