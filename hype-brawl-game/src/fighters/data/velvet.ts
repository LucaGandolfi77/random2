import { hit, standardMoves } from '../moveFactory';
import type { FighterDefinition, MoveData } from '../types';

const neutralSpecial: MoveData = {
  slot: 'neutralSpecial',
  name: 'FLASH BULB',
  kind: 'special',
  totalFrames: 30,
  hits: [hit(10, 14, 0, 1.1, 1.3, 7, 62, 18, 46, 4, 'flash')],
  effect: 'flash',
};

const sideSpecial: MoveData = {
  slot: 'sideSpecial',
  name: 'RUNWAY RUSHDOWN',
  kind: 'special',
  totalFrames: 30,
  hits: [hit(6, 12, 0.9, 1.0, 0.85, 9, 35, 20, 58, 5, 'speed')],
  impulses: [{ frame: 5, vx: 0.3 }],
  effect: 'speed',
};

const upSpecial: MoveData = {
  slot: 'upSpecial',
  name: 'SPOTLIGHT ASCENT',
  kind: 'special',
  totalFrames: 38,
  hits: [hit(8, 14, 0, 1.2, 0.9, 7, 85, 16, 42, 4, 'flash')],
  impulses: [{ frame: 6, vy: 0.46, vx: 0.08 }],
  intangibility: [3, 10],
  effect: 'flash',
};

const downSpecial: MoveData = {
  slot: 'downSpecial',
  name: 'WARDROBE CHANGE',
  kind: 'special',
  totalFrames: 32,
  hits: [],
  impulses: [{ frame: 4, vx: -0.18 }],
  intangibility: [4, 20],
  selfBuff: { atFrame: 20, speedFrames: 300, meter: 8 },
  effect: 'flash',
};

export const VELVET: FighterDefinition = {
  id: 'velvet',
  name: 'VELVET VERA',
  title: 'The Pop Empress',
  archetype: 'Fast aerial duelist',
  description:
    'Three costume changes per song and zero patience. Velvet Vera owns the air with double jumps, flashing bursts and a runway dash that punishes every whiffed commitment.',
  playable: true,
  modelStyle: 'velvet',
  stats: {
    weight: 82,
    walkSpeed: 0.095,
    runSpeed: 0.185,
    airSpeed: 0.155,
    airAcceleration: 0.015,
    gravity: 0.018,
    jumpVelocity: 0.445,
    doubleJumpVelocity: 0.425,
    maxFallSpeed: 0.55,
    fastFallSpeed: 0.8,
    groundAcceleration: 0.024,
    groundFriction: 0.016,
    airFriction: 0.003,
    airJumps: 2,
    knockbackResistance: 0,
    attackPower: 0.92,
    recoveryPower: 1.08,
    width: 0.85,
    height: 1.8,
  },
  palettes: [
    { name: 'Pop Empress', skin: 0xf0b49b, primary: 0xff2d95, secondary: 0x7b2cbf, accent: 0x39f6ff, hair: 0x9c1e6a, dark: 0x2a0b2e },
    { name: 'Bubblegum', skin: 0xffc9b5, primary: 0xff8fc7, secondary: 0xffd166, accent: 0xffffff, hair: 0xff5ca8, dark: 0x3a1224 },
    { name: 'Midnight Velvet', skin: 0xd99a7c, primary: 0x4a0d6b, secondary: 0x9d4edd, accent: 0xffd319, hair: 0x1b0730, dark: 0x140320 },
    { name: 'Ice Diva', skin: 0xf3c2ad, primary: 0x9be7ff, secondary: 0x2b7bbb, accent: 0xffffff, hair: 0xd9f6ff, dark: 0x102a3a },
  ],
  moves: standardMoves({
    power: 0.92,
    speed: 1.15,
    names: {
      jab: 'Glitter Jab',
      sideTilt: 'Heel Turn',
      upAir: 'Star Spin',
      forwardAir: 'Camera Flash',
      grab: 'Fan Grab',
    },
    specials: { neutralSpecial, sideSpecial, upSpecial, downSpecial },
  }),
  moveHighlights: ['FLASH BULB: radial burst', 'RUNWAY RUSHDOWN: dash strike', 'SPOTLIGHT ASCENT: double-jump recovery', 'WARDROBE CHANGE: invulnerable speed buff'],
  statsBars: { power: 3, speed: 5, weight: 2, recovery: 5 },
};
