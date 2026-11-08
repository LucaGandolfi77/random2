import type {
  HitboxData,
  MoveData,
  MoveSlot,
  MoveSlotMap,
  ProjectileSpawnData,
  VisualEffect,
} from './types';

interface SpecialSet {
  neutralSpecial: MoveData;
  sideSpecial: MoveData;
  upSpecial: MoveData;
  downSpecial: MoveData;
}

export interface StandardMoveOptions {
  power: number;
  speed: number;
  specials: SpecialSet;
  names?: Partial<Record<MoveSlot, string>>;
  effects?: Partial<Record<MoveSlot, VisualEffect>>;
}

const DEFAULT_NAMES: Record<MoveSlot, string> = {
  jab: 'Quick Jab',
  sideTilt: 'Side Kick',
  upTilt: 'Rising Arc',
  downTilt: 'Low Sweep',
  sideStrong: 'Charged Cross',
  upStrong: 'Sky Breaker',
  downStrong: 'Double Break',
  neutralAir: 'Neutral Spin',
  forwardAir: 'Forward Strike',
  backAir: 'Back Kick',
  upAir: 'Rising Spin',
  downAir: 'Meteor Stomp',
  neutralSpecial: 'Neutral Special',
  sideSpecial: 'Side Special',
  upSpecial: 'Up Special',
  downSpecial: 'Down Special',
  grab: 'Spotlight Grab',
  throwForward: 'Forward Throw',
  throwBack: 'Back Throw',
  throwUp: 'Up Throw',
  throwDown: 'Down Throw',
  taunt: 'Taunt',
};

export function hit(
  start: number,
  end: number,
  offsetX: number,
  offsetY: number,
  radius: number,
  damage: number,
  angle: number,
  baseKnockback: number,
  knockbackGrowth: number,
  hitstop: number,
  effect: VisualEffect,
  extra: Partial<HitboxData> = {},
): HitboxData {
  return {
    start,
    end,
    offsetX,
    offsetY,
    radius,
    damage,
    angle,
    baseKnockback,
    knockbackGrowth,
    hitstop,
    effect,
    ...extra,
  };
}

export function makeProjectile(
  data: Omit<ProjectileSpawnData, 'hitstop'> & { hitstop?: number },
): ProjectileSpawnData {
  return { hitstop: 4, ...data };
}

export function standardMoves(options: StandardMoveOptions): MoveSlotMap {
  const { power, speed } = options;
  const f = (frames: number): number => Math.max(1, Math.round(frames / speed));
  const dmg = (base: number): number => Math.round(base * power * 10) / 10;
  const name = (slot: MoveSlot): string => options.names?.[slot] ?? DEFAULT_NAMES[slot];
  const effect = (slot: MoveSlot, fallback: VisualEffect): VisualEffect =>
    options.effects?.[slot] ?? fallback;

  const scaling = 0.9 + power * 0.1;

  const moves: MoveSlotMap = {
    jab: {
      slot: 'jab',
      name: name('jab'),
      kind: 'ground',
      totalFrames: f(18),
      hits: [hit(f(3), f(6), 0.85, 1.0, 0.55, dmg(3), 72, 12, 28 * scaling, 3, effect('jab', 'punch'))],
    },
    sideTilt: {
      slot: 'sideTilt',
      name: name('sideTilt'),
      kind: 'ground',
      totalFrames: f(28),
      hits: [hit(f(7), f(11), 1.25, 1.0, 0.7, dmg(8), 35, 18, 54 * scaling, 5, effect('sideTilt', 'kick'))],
    },
    upTilt: {
      slot: 'upTilt',
      name: name('upTilt'),
      kind: 'ground',
      totalFrames: f(26),
      hits: [hit(f(5), f(10), 0.25, 1.9, 0.8, dmg(7), 92, 20, 50 * scaling, 4, effect('upTilt', 'kick'))],
    },
    downTilt: {
      slot: 'downTilt',
      name: name('downTilt'),
      kind: 'ground',
      totalFrames: f(22),
      hits: [hit(f(5), f(8), 0.95, 0.35, 0.65, dmg(5), 22, 14, 38 * scaling, 3, effect('downTilt', 'kick'), { shieldDamage: 1 })],
    },
    sideStrong: {
      slot: 'sideStrong',
      name: name('sideStrong'),
      kind: 'ground',
      totalFrames: f(46),
      chargeable: true,
      hits: [hit(f(15), f(21), 1.4, 0.95, 0.9, dmg(14), 38, 30, 92 * scaling, 7, effect('sideStrong', 'punch'))],
    },
    upStrong: {
      slot: 'upStrong',
      name: name('upStrong'),
      kind: 'ground',
      totalFrames: f(44),
      chargeable: true,
      hits: [hit(f(13), f(19), 0.2, 1.95, 0.95, dmg(13), 88, 30, 88 * scaling, 7, effect('upStrong', 'kick'))],
    },
    downStrong: {
      slot: 'downStrong',
      name: name('downStrong'),
      kind: 'ground',
      totalFrames: f(46),
      chargeable: true,
      hits: [
        hit(f(12), f(18), 0.95, 0.4, 0.8, dmg(12), 40, 28, 82 * scaling, 6, effect('downStrong', 'punch')),
        hit(f(12), f(18), -0.95, 0.4, 0.8, dmg(12), 40, 28, 82 * scaling, 6, effect('downStrong', 'punch')),
      ],
      landingLag: 8,
    },
    neutralAir: {
      slot: 'neutralAir',
      name: name('neutralAir'),
      kind: 'aerial',
      totalFrames: f(32),
      hits: [hit(f(5), f(12), 0.0, 1.0, 1.0, dmg(8), 45, 15, 55 * scaling, 4, effect('neutralAir', 'kick'))],
      landingLag: 6,
    },
    forwardAir: {
      slot: 'forwardAir',
      name: name('forwardAir'),
      kind: 'aerial',
      totalFrames: f(34),
      hits: [hit(f(8), f(13), 1.15, 1.0, 0.75, dmg(10), 40, 18, 64 * scaling, 5, effect('forwardAir', 'punch'))],
      landingLag: 6,
    },
    backAir: {
      slot: 'backAir',
      name: name('backAir'),
      kind: 'aerial',
      totalFrames: f(32),
      hits: [hit(f(7), f(12), -1.15, 1.0, 0.8, dmg(11), 35, 20, 70 * scaling, 5, effect('backAir', 'kick'))],
      landingLag: 6,
    },
    upAir: {
      slot: 'upAir',
      name: name('upAir'),
      kind: 'aerial',
      totalFrames: f(30),
      hits: [hit(f(5), f(11), 0.2, 1.9, 0.8, dmg(9), 86, 18, 60 * scaling, 4, effect('upAir', 'kick'))],
      landingLag: 6,
    },
    downAir: {
      slot: 'downAir',
      name: name('downAir'),
      kind: 'aerial',
      totalFrames: f(36),
      hits: [hit(f(10), f(16), 0.15, 0.45, 0.7, dmg(11), 270, 22, 56 * scaling, 6, effect('downAir', 'kick'), { meteor: true })],
      landingLag: 9,
    },
    neutralSpecial: options.specials.neutralSpecial,
    sideSpecial: options.specials.sideSpecial,
    upSpecial: options.specials.upSpecial,
    downSpecial: options.specials.downSpecial,
    grab: {
      slot: 'grab',
      name: name('grab'),
      kind: 'grab',
      totalFrames: f(30),
      hits: [],
      grabbox: { start: f(6), end: f(9), offsetX: 0.95, offsetY: 1.0, radius: 0.95 },
    },
    throwForward: {
      slot: 'throwForward',
      name: name('throwForward'),
      kind: 'throw',
      totalFrames: f(22),
      hits: [],
      throwHit: { damage: dmg(8), angle: 40, baseKnockback: 45, knockbackGrowth: 42, hitstop: 6, effect: 'punch' },
    },
    throwBack: {
      slot: 'throwBack',
      name: name('throwBack'),
      kind: 'throw',
      totalFrames: f(24),
      hits: [],
      throwHit: { damage: dmg(9), angle: 40, baseKnockback: 50, knockbackGrowth: 48, hitstop: 6, effect: 'punch' },
    },
    throwUp: {
      slot: 'throwUp',
      name: name('throwUp'),
      kind: 'throw',
      totalFrames: f(22),
      hits: [],
      throwHit: { damage: dmg(7), angle: 90, baseKnockback: 50, knockbackGrowth: 40, hitstop: 6, effect: 'punch' },
    },
    throwDown: {
      slot: 'throwDown',
      name: name('throwDown'),
      kind: 'throw',
      totalFrames: f(24),
      hits: [],
      throwHit: { damage: dmg(8), angle: 70, baseKnockback: 35, knockbackGrowth: 38, hitstop: 6, effect: 'kick' },
    },
    taunt: {
      slot: 'taunt',
      name: name('taunt'),
      kind: 'taunt',
      totalFrames: f(48),
      hits: [],
    },
  };

  return moves;
}
