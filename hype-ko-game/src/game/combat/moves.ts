import type {
  FighterStats,
  HitboxDef,
  MoveBehavior,
  MoveDef,
  MoveKind,
  ProjectileSpec,
  ZoneSpec
} from './types';

function hb(
  x: number,
  y: number,
  w: number,
  h: number,
  startup: number,
  active: number
): HitboxDef {
  return { x, y, w, h, from: startup + 1, to: startup + active };
}

export function rangeScale(stats: FighterStats): number {
  return 0.9 + stats.range * 0.04;
}

export function createBaseMoves(stats: FighterStats): Record<string, MoveDef> {
  const r = rangeScale(stats);
  const lightPunch: MoveDef = {
    id: 'lightPunch',
    name: 'Jab',
    kind: 'light',
    startup: 4,
    active: 3,
    recovery: 8,
    damage: 32,
    hitstun: 13,
    blockstun: 8,
    hitstop: 4,
    knockback: 1.8,
    hitboxes: [hb(0.5 * r, 1.15, 0.78 * r, 0.46, 4, 3)],
    meterGainHit: 3,
    meterGainBlock: 1,
    hypeGainHit: 2,
    cancelInto: ['light', 'heavy', 'special', 'super'],
    cancelWindow: [4, 12],
    vfx: 'punch',
    sfx: 'punch'
  };
  const heavyPunch: MoveDef = {
    id: 'heavyPunch',
    name: 'Haymaker',
    kind: 'heavy',
    startup: 9,
    active: 4,
    recovery: 18,
    damage: 74,
    hitstun: 21,
    blockstun: 12,
    hitstop: 7,
    knockback: 3.6,
    hitboxes: [hb(0.52 * r, 1.1, 0.98 * r, 0.56, 9, 4)],
    meterGainHit: 5,
    meterGainBlock: 2,
    hypeGainHit: 4,
    cancelInto: ['special', 'super'],
    cancelWindow: [9, 20],
    vfx: 'punchHeavy',
    sfx: 'punchHeavy'
  };
  const lightKick: MoveDef = {
    id: 'lightKick',
    name: 'Low Kick',
    kind: 'light',
    startup: 6,
    active: 3,
    recovery: 10,
    damage: 38,
    hitstun: 14,
    blockstun: 9,
    hitstop: 4,
    knockback: 2.2,
    hitboxes: [hb(0.55 * r, 0.78, 0.92 * r, 0.48, 6, 3)],
    meterGainHit: 3,
    meterGainBlock: 1,
    hypeGainHit: 2,
    cancelInto: ['light', 'heavy', 'special', 'super'],
    cancelWindow: [6, 14],
    vfx: 'kick',
    sfx: 'kick'
  };
  const heavyKick: MoveDef = {
    id: 'heavyKick',
    name: 'Roundhouse',
    kind: 'heavy',
    startup: 12,
    active: 5,
    recovery: 22,
    damage: 88,
    hitstun: 23,
    blockstun: 14,
    hitstop: 8,
    knockback: 4.6,
    hitboxes: [hb(0.58 * r, 0.82, 1.08 * r, 0.62, 12, 5)],
    meterGainHit: 5,
    meterGainBlock: 2,
    hypeGainHit: 4,
    cancelInto: ['special', 'super'],
    cancelWindow: [12, 24],
    vfx: 'kickHeavy',
    sfx: 'kickHeavy'
  };
  const crouchPunch: MoveDef = {
    id: 'crouchPunch',
    name: 'Low Jab',
    kind: 'light',
    startup: 4,
    active: 3,
    recovery: 9,
    damage: 28,
    hitstun: 12,
    blockstun: 8,
    hitstop: 4,
    knockback: 1.4,
    hitboxes: [hb(0.48 * r, 0.58, 0.76 * r, 0.4, 4, 3)],
    meterGainHit: 3,
    meterGainBlock: 1,
    hypeGainHit: 2,
    cancelInto: ['light', 'special', 'super'],
    cancelWindow: [4, 12],
    vfx: 'punch',
    sfx: 'punch'
  };
  const crouchKick: MoveDef = {
    id: 'crouchKick',
    name: 'Sweep',
    kind: 'heavy',
    startup: 7,
    active: 3,
    recovery: 14,
    damage: 36,
    hitstun: 18,
    blockstun: 10,
    hitstop: 5,
    knockback: 2.8,
    knockdown: true,
    hitboxes: [hb(0.5 * r, 0.28, 0.95 * r, 0.34, 7, 3)],
    meterGainHit: 4,
    meterGainBlock: 1,
    hypeGainHit: 3,
    vfx: 'kick',
    sfx: 'kick'
  };
  const airPunch: MoveDef = {
    id: 'airPunch',
    name: 'Air Jab',
    kind: 'light',
    startup: 4,
    active: 5,
    recovery: 6,
    damage: 34,
    hitstun: 14,
    blockstun: 8,
    hitstop: 4,
    knockback: 2,
    requiresAir: true,
    hitboxes: [hb(0.45 * r, 0.85, 0.8 * r, 0.5, 4, 5)],
    meterGainHit: 3,
    meterGainBlock: 1,
    hypeGainHit: 2,
    vfx: 'punch',
    sfx: 'punch'
  };
  const airKick: MoveDef = {
    id: 'airKick',
    name: 'Dive Kick',
    kind: 'heavy',
    startup: 6,
    active: 6,
    recovery: 8,
    damage: 54,
    hitstun: 18,
    blockstun: 10,
    hitstop: 5,
    knockback: 2.6,
    requiresAir: true,
    hitboxes: [hb(0.5 * r, 0.5, 0.9 * r, 0.55, 6, 6)],
    meterGainHit: 4,
    meterGainBlock: 2,
    hypeGainHit: 3,
    vfx: 'kick',
    sfx: 'kick'
  };
  const throwMove: MoveDef = {
    id: 'throw',
    name: 'Grab',
    kind: 'throw',
    startup: 5,
    active: 3,
    recovery: 22,
    damage: 104,
    hitstun: 32,
    blockstun: 0,
    hitstop: 10,
    knockback: 4.8,
    unblockable: true,
    knockdown: true,
    requiresGround: true,
    hitboxes: [hb(0.42 * r, 0.7, 0.9 * r, 1.15, 5, 3)],
    meterGainHit: 6,
    hypeGainHit: 5,
    vfx: 'grab',
    sfx: 'grab'
  };
  const tagMove: MoveDef = {
    id: 'tag',
    name: 'Tag Strike',
    kind: 'tag',
    startup: 8,
    active: 4,
    recovery: 12,
    damage: 46,
    hitstun: 17,
    blockstun: 10,
    hitstop: 5,
    knockback: 3.2,
    hitboxes: [hb(0.5 * r, 0.95, 0.9 * r, 0.55, 8, 4)],
    meterGainHit: 4,
    hypeGainHit: 3,
    vfx: 'tag',
    sfx: 'punchHeavy'
  };

  return {
    lightPunch,
    heavyPunch,
    lightKick,
    heavyKick,
    crouchPunch,
    crouchKick,
    airPunch,
    airKick,
    throw: throwMove,
    tag: tagMove
  };
}

export function makeHypeBreaker(name = 'HYPE BREAKER'): MoveDef {
  return {
    id: 'hypeBreaker',
    name,
    kind: 'hype',
    startup: 12,
    active: 6,
    recovery: 20,
    damage: 58,
    hitstun: 24,
    blockstun: 12,
    hitstop: 9,
    knockback: 4.2,
    lift: 1.4,
    hypeCost: 100,
    invuln: [0, 18],
    hitboxes: [hb(0.3, 0.7, 1.5, 1.4, 12, 6)],
    behavior: {
      type: 'buff',
      spawnFrame: 8,
      buff: { damage: 1.25, speed: 1.15, armor: true, duration: 480 }
    },
    meterGainHit: 8,
    hypeGainHit: 0,
    vfx: 'hypeBurst',
    sfx: 'hype'
  };
}

export interface SpecialOptions {
  damage?: number;
  startup?: number;
  active?: number;
  recovery?: number;
  hitstun?: number;
  blockstun?: number;
  hitstop?: number;
  knockback?: number;
  lift?: number;
  chip?: number;
  launcher?: boolean;
  knockdown?: boolean;
  invuln?: [number, number];
  vfx?: string;
  sfx?: string;
  range?: number;
  hitbox?: { x: number; y: number; w: number; h: number };
  pull?: number;
  stun?: number;
  unblockable?: boolean;
}

function baseSpecial(
  id: string,
  name: string,
  kind: MoveKind,
  opts: SpecialOptions,
  behavior: MoveBehavior
): MoveDef {
  const startup = opts.startup ?? 12;
  const active = opts.active ?? 4;
  const recovery = opts.recovery ?? 18;
  const box = opts.hitbox ?? { x: 0.5, y: 0.8, w: 1, h: 0.8 };
  const melee = ['melee', 'dash', 'uppercut', 'whip', 'pull', 'commandGrab', 'teleport'].includes(
    behavior.type
  );
  return {
    id,
    name,
    kind,
    startup,
    active,
    recovery,
    damage: opts.damage ?? 70,
    chip: opts.chip ?? (opts.damage ?? 70) * 0.12,
    hitstun: opts.hitstun ?? 22,
    blockstun: opts.blockstun ?? 13,
    hitstop: opts.hitstop ?? 8,
    knockback: opts.knockback ?? 4,
    lift: opts.lift ?? 0,
    launcher: opts.launcher,
    knockdown: opts.knockdown,
    invuln: opts.invuln,
    hitboxes: melee
      ? [hb(box.x, box.y, box.w, box.h, startup, active)]
      : [],
    behavior,
    pull: opts.pull,
    stun: opts.stun,
    unblockable: opts.unblockable,
    meterGainHit: 6,
    meterGainBlock: 2,
    hypeGainHit: 5,
    vfx: opts.vfx ?? 'special',
    sfx: opts.sfx ?? 'special'
  };
}

export function projectileSpecial(
  id: string,
  name: string,
  projectile: ProjectileSpec,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    { startup: 14, active: 1, recovery: 20, damage: projectile.damage, ...opts },
    { type: 'projectile', spawnFrame: opts.startup ?? 14, projectile }
  );
}

export function pianoSpecial(
  id: string,
  name: string,
  projectile: ProjectileSpec,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    { startup: 16, active: 1, recovery: 22, damage: projectile.damage, ...opts },
    { type: 'piano', spawnFrame: opts.startup ?? 16, projectile }
  );
}

export function rainSpecial(
  id: string,
  name: string,
  projectile: ProjectileSpec,
  rain: { count: number; spread: number; delay: number },
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    { startup: 18, active: 1, recovery: 24, damage: projectile.damage, ...opts },
    { type: 'rain', spawnFrame: opts.startup ?? 18, projectile, rain }
  );
}

export function dashSpecial(
  id: string,
  name: string,
  distance: number,
  opts: SpecialOptions = {}
): MoveDef {
  const move = baseSpecial(
    id,
    name,
    'special',
    { startup: 10, active: 5, recovery: 18, damage: 78, knockback: 5, ...opts },
    { type: 'dash', spawnFrame: opts.startup ?? 10, distance }
  );
  move.movement = { x: distance, atFrame: 1, duration: 10 };
  return move;
}

export function uppercutSpecial(
  id: string,
  name: string,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    {
      startup: 7,
      active: 6,
      recovery: 24,
      damage: 86,
      lift: 7.5,
      launcher: true,
      invuln: [0, 12],
      hitbox: { x: 0.35, y: 0.6, w: 0.9, h: 1.5 },
      ...opts
    },
    { type: 'uppercut', spawnFrame: opts.startup ?? 7 }
  );
}

export function shockwaveSpecial(
  id: string,
  name: string,
  radius: number,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    { startup: 18, active: 1, recovery: 24, damage: 72, launcher: true, lift: 4, ...opts },
    { type: 'shockwave', spawnFrame: opts.startup ?? 18, radius }
  );
}

export function teleportSpecial(
  id: string,
  name: string,
  distance: number,
  behind: boolean,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    { startup: 10, active: 4, recovery: 18, damage: 76, ...opts },
    { type: 'teleport', spawnFrame: opts.startup ?? 10, distance, behind }
  );
}

export function buffSpecial(
  id: string,
  name: string,
  buff: NonNullable<MoveBehavior['buff']>,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    { startup: 12, active: 1, recovery: 20, damage: 0, ...opts },
    { type: 'buff', spawnFrame: opts.startup ?? 12, buff }
  );
}

export function counterSpecial(
  id: string,
  name: string,
  window: number,
  damage: number,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    {
      startup: 3,
      active: window,
      recovery: 16,
      damage,
      hitstun: 26,
      ...opts
    },
    {
      type: 'counter',
      spawnFrame: 1,
      counterWindow: window,
      counterDamage: damage,
      counterHitstun: opts.hitstun ?? 26
    }
  );
}

export function whipSpecial(
  id: string,
  name: string,
  length: number,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    {
      startup: 12,
      active: 5,
      recovery: 20,
      damage: 64,
      hitbox: { x: 0.4, y: 0.9, w: length, h: 0.45 },
      pull: 1.2,
      ...opts
    },
    { type: 'whip', spawnFrame: opts.startup ?? 12, pull: 1.2 }
  );
}

export function pullSpecial(
  id: string,
  name: string,
  length: number,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    {
      startup: 14,
      active: 4,
      recovery: 22,
      damage: 58,
      hitbox: { x: 0.4, y: 0.7, w: length, h: 0.7 },
      pull: 2.4,
      ...opts
    },
    { type: 'pull', spawnFrame: opts.startup ?? 14, pull: 2.4 }
  );
}

export function zoneSpecial(
  id: string,
  name: string,
  zone: ZoneSpec,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    { startup: 16, active: 1, recovery: 20, damage: 0, ...opts },
    { type: 'zone', spawnFrame: opts.startup ?? 16, zone }
  );
}

export function explosionSpecial(
  id: string,
  name: string,
  damage: number,
  radius: number,
  delay: number,
  atOpponent: boolean,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    { startup: 12, active: 1, recovery: 24, damage, ...opts },
    {
      type: 'explosion',
      spawnFrame: opts.startup ?? 12,
      explosion: { delay, damage, radius, atOpponent, behind: true, hitstun: 24 }
    }
  );
}

export function grabSpecial(
  id: string,
  name: string,
  damage: number,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    {
      startup: 6,
      active: 3,
      recovery: 24,
      damage,
      hitstun: 30,
      knockback: 4,
      unblockable: true,
      knockdown: true,
      ...opts
    },
    { type: 'commandGrab', spawnFrame: opts.startup ?? 6 }
  );
}

export function flashSpecial(
  id: string,
  name: string,
  radius: number,
  stunFrames: number,
  opts: SpecialOptions = {}
): MoveDef {
  return baseSpecial(
    id,
    name,
    'special',
    { startup: 14, active: 1, recovery: 18, damage: 20, ...opts },
    { type: 'flash', spawnFrame: opts.startup ?? 14, radius, stun: stunFrames }
  );
}

export function superMelee(
  id: string,
  name: string,
  damage: number,
  opts: SpecialOptions = {}
): MoveDef {
  const startup = opts.startup ?? 8;
  const active = opts.active ?? 14;
  const recovery = opts.recovery ?? 28;
  const box = opts.hitbox ?? { x: 0.3, y: 0.6, w: 1.6, h: 1.4 };
  return {
    ...baseSpecial(
      id,
      name,
      'super',
      {
        startup,
        active,
        recovery,
        damage,
        hitstun: 30,
        blockstun: 16,
        hitstop: 10,
        knockback: 6,
        lift: 2,
        invuln: [0, startup + active],
        chip: damage * 0.2,
        ...opts
      },
      { type: 'melee', spawnFrame: startup }
    ),
    hitboxes: [
      hb(box.x, box.y, box.w, box.h, startup, active),
      hb(box.x, box.y + 0.1, box.w, box.h, startup + Math.floor(active / 2), active)
    ],
    hits: 2,
    hitInterval: Math.max(4, Math.floor(active / 2)),
    hitstop: 10,
    superCost: 100,
    isSuper: true,
    meterGainHit: 0,
    hypeGainHit: 4,
    vfx: opts.vfx ?? 'super',
    sfx: 'super'
  };
}

export function superProjectile(
  id: string,
  name: string,
  projectile: ProjectileSpec,
  opts: SpecialOptions = {}
): MoveDef {
  return {
    ...baseSpecial(
      id,
      name,
      'super',
      {
        startup: 16,
        active: 1,
        recovery: 30,
        damage: projectile.damage,
        invuln: [0, 20],
        ...opts
      },
      { type: 'projectile', spawnFrame: opts.startup ?? 16, projectile }
    ),
    superCost: 100,
    isSuper: true,
    meterGainHit: 0,
    hypeGainHit: 4,
    vfx: opts.vfx ?? 'super',
    sfx: 'super'
  };
}

export function superRain(
  id: string,
  name: string,
  projectile: ProjectileSpec,
  count: number,
  spread: number,
  opts: SpecialOptions = {}
): MoveDef {
  return {
    ...baseSpecial(
      id,
      name,
      'super',
      { startup: 20, active: 1, recovery: 32, damage: projectile.damage, invuln: [0, 24], ...opts },
      {
        type: 'rain',
        spawnFrame: opts.startup ?? 20,
        projectile,
        rain: { count, spread, delay: 3 }
      }
    ),
    superCost: 100,
    isSuper: true,
    meterGainHit: 0,
    hypeGainHit: 4,
    vfx: opts.vfx ?? 'super',
    sfx: 'super'
  };
}

export function finisherMove(id: string, name: string): MoveDef {
  return {
    id,
    name,
    kind: 'finisher',
    startup: 10,
    active: 1,
    recovery: 10,
    damage: 9999,
    hitstun: 1,
    blockstun: 1,
    hitstop: 1,
    knockback: 0,
    hitboxes: [],
    isFinisher: true,
    superCost: 0,
    hypeCost: 100,
    vfx: 'finisher',
    sfx: 'finisher'
  };
}
