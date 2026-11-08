import { hit, makeProjectile, standardMoves } from '../moveFactory';
import type { FighterDefinition, MoveData } from '../types';

const neutralSpecial: MoveData = {
  slot: 'neutralSpecial',
  name: 'BASS CANNON',
  kind: 'special',
  totalFrames: 34,
  hits: [],
  effect: 'sound',
  projectiles: [
    makeProjectile({
      atFrame: 13,
      offsetX: 0.9,
      offsetY: 1.1,
      vx: 0.32,
      vy: 0.015,
      gravity: 0,
      radius: 0.45,
      damage: 7,
      angle: 30,
      baseKnockback: 16,
      knockbackGrowth: 42,
      life: 90,
      visual: 'sound',
      hitstop: 4,
    }),
  ],
};

const sideSpecial: MoveData = {
  slot: 'sideSpecial',
  name: 'CHAIN SWING',
  kind: 'special',
  totalFrames: 36,
  hits: [hit(8, 14, 1.0, 1.05, 0.9, 11, 42, 22, 62, 6, 'punch')],
  impulses: [{ frame: 6, vx: 0.22 }],
  effect: 'punch',
};

const upSpecial: MoveData = {
  slot: 'upSpecial',
  name: 'MIC DROP',
  kind: 'special',
  totalFrames: 40,
  hits: [hit(7, 15, 0.15, 1.7, 0.85, 8, 82, 18, 45, 5, 'sound')],
  impulses: [{ frame: 5, vy: 0.4, vx: 0.06 }],
  intangibility: [1, 6],
  effect: 'sound',
};

const downSpecial: MoveData = {
  slot: 'downSpecial',
  name: 'FEEDBACK LOOP',
  kind: 'special',
  totalFrames: 42,
  hits: [
    hit(10, 14, 0, 1.0, 1.0, 6, 70, 12, 32, 4, 'sound'),
    hit(22, 26, 0, 1.0, 1.0, 6, 70, 12, 32, 4, 'sound'),
  ],
  effect: 'sound',
};

export const NERO: FighterDefinition = {
  id: 'nero',
  name: '808 NERO',
  title: 'The Trap King',
  archetype: 'Heavy combo bruiser',
  description:
    'Low-end pressure incarnate. 808 Nero turns every hit into a bassline and every combo into a drop. Slow feet, heavy hands, and a sound cannon that owns the neutral.',
  playable: true,
  modelStyle: 'nero',
  stats: {
    weight: 104,
    walkSpeed: 0.08,
    runSpeed: 0.16,
    airSpeed: 0.13,
    airAcceleration: 0.012,
    gravity: 0.019,
    jumpVelocity: 0.43,
    doubleJumpVelocity: 0.4,
    maxFallSpeed: 0.58,
    fastFallSpeed: 0.82,
    groundAcceleration: 0.02,
    groundFriction: 0.014,
    airFriction: 0.0025,
    airJumps: 1,
    knockbackResistance: 0.02,
    attackPower: 1.02,
    recoveryPower: 1.0,
    width: 0.95,
    height: 1.85,
  },
  palettes: [
    { name: 'Midnight Trap', skin: 0x9a5b3c, primary: 0x16151c, secondary: 0xd7263d, accent: 0xffc300, hair: 0x0a0a0d, dark: 0x060608 },
    { name: 'Crimson Static', skin: 0xb06a45, primary: 0x7a1020, secondary: 0xff4d6d, accent: 0xffd319, hair: 0x1a0a0a, dark: 0x170407 },
    { name: 'Gold Grill', skin: 0x8a4f35, primary: 0x1b1a10, secondary: 0xffc300, accent: 0xff2d95, hair: 0x0a0a0d, dark: 0x101004 },
    { name: 'Frost Freq', skin: 0x9a5b3c, primary: 0x101a2b, secondary: 0x39f6ff, accent: 0xf5f7fa, hair: 0x0a1018, dark: 0x060a12 },
  ],
  moves: standardMoves({
    power: 1.02,
    speed: 0.96,
    names: {
      jab: 'Static Jab',
      sideTilt: 'Sub Kick',
      sideStrong: 'Bassline Cross',
      downAir: 'Sub Drop',
      grab: 'Crowd Grab',
    },
    specials: { neutralSpecial, sideSpecial, upSpecial, downSpecial },
  }),
  moveHighlights: ['BASS CANNON: sound projectile', 'CHAIN SWING: burst dash strike', 'MIC DROP: rising recovery', 'FEEDBACK LOOP: two-hit spin'],
  statsBars: { power: 4, speed: 3, weight: 4, recovery: 3 },
};
