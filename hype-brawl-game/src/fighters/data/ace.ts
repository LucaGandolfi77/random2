import { hit, makeProjectile, standardMoves } from '../moveFactory';
import type { FighterDefinition, MoveData } from '../types';

const neutralSpecial: MoveData = {
  slot: 'neutralSpecial',
  name: 'EXHAUST FLARE',
  kind: 'special',
  totalFrames: 30,
  hits: [hit(9, 14, 1.0, 0.8, 0.7, 6, 28, 14, 38, 3, 'speed')],
  effect: 'speed',
};

const sideSpecial: MoveData = {
  slot: 'sideSpecial',
  name: 'NITRO DASH',
  kind: 'special',
  totalFrames: 32,
  hits: [hit(5, 12, 0.8, 0.95, 0.9, 11, 30, 25, 68, 6, 'speed')],
  impulses: [{ frame: 4, vx: 0.38 }],
  effect: 'speed',
};

const upSpecial: MoveData = {
  slot: 'upSpecial',
  name: 'BOOST JUMP',
  kind: 'special',
  totalFrames: 38,
  hits: [hit(6, 12, 0, 1.4, 0.8, 8, 80, 16, 42, 4, 'speed')],
  impulses: [{ frame: 5, vy: 0.48, vx: 0.1 }],
  intangibility: [1, 6],
  effect: 'speed',
};

const downSpecial: MoveData = {
  slot: 'downSpecial',
  name: 'OIL SLICK',
  kind: 'special',
  totalFrames: 32,
  hits: [],
  effect: 'spark',
  projectiles: [
    makeProjectile({
      atFrame: 14,
      offsetX: 0.6,
      offsetY: 0.1,
      vx: 0.03,
      vy: 0,
      gravity: 0,
      radius: 0.7,
      damage: 6,
      angle: 60,
      baseKnockback: 8,
      knockbackGrowth: 22,
      life: 200,
      visual: 'spark',
      hitstop: 3,
    }),
  ],
};

export const ACE: FighterDefinition = {
  id: 'ace',
  name: 'ACE TURBO',
  title: 'The Speed Demon',
  archetype: 'Rushdown glass cannon',
  description:
    'Ace Turbo never brakes. Nitro dashes cover half the stage, boost jumps steal the sky and the whole kit asks one question: can you keep up before your damage catches you?',
  playable: true,
  modelStyle: 'ace',
  stats: {
    weight: 74,
    walkSpeed: 0.11,
    runSpeed: 0.215,
    airSpeed: 0.15,
    airAcceleration: 0.016,
    gravity: 0.02,
    jumpVelocity: 0.435,
    doubleJumpVelocity: 0.41,
    maxFallSpeed: 0.62,
    fastFallSpeed: 0.95,
    groundAcceleration: 0.027,
    groundFriction: 0.015,
    airFriction: 0.0035,
    airJumps: 1,
    knockbackResistance: 0,
    attackPower: 0.86,
    recoveryPower: 1.05,
    width: 0.82,
    height: 1.78,
  },
  palettes: [
    { name: 'Nitro Blue', skin: 0xd9a066, primary: 0x1668ff, secondary: 0xf5f7fa, accent: 0xffd319, hair: 0x2b1a10, dark: 0x0b0f1a },
    { name: 'Redline', skin: 0xd9a066, primary: 0xd7263d, secondary: 0x101014, accent: 0xffffff, hair: 0x1a0a06, dark: 0x120406 },
    { name: 'Volt', skin: 0xb97a4e, primary: 0xffd319, secondary: 0x101014, accent: 0x39f6ff, hair: 0x221407, dark: 0x141002 },
    { name: 'Ghost Lap', skin: 0xc98e60, primary: 0xe8f6ff, secondary: 0x8a9bb5, accent: 0xff2d95, hair: 0x3a3f4d, dark: 0x1a2230 },
  ],
  moves: standardMoves({
    power: 0.86,
    speed: 1.22,
    names: {
      jab: 'Quick Tap',
      sideTilt: 'Drift Kick',
      sideStrong: 'Redline Cross',
      neutralAir: 'Axle Spin',
      grab: 'Pit Grab',
    },
    specials: { neutralSpecial, sideSpecial, upSpecial, downSpecial },
  }),
  moveHighlights: ['EXHAUST FLARE: fast poke', 'NITRO DASH: explosive burst', 'BOOST JUMP: vertical recovery', 'OIL SLICK: grounded trap'],
  statsBars: { power: 2, speed: 5, weight: 1, recovery: 4 },
};
